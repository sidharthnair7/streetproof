package streetproof.streetproof.study;

import org.springframework.stereotype.Component;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.detection.Detection;
import streetproof.streetproof.detection.FrameDetections;
import streetproof.streetproof.gate.RefusalReason;
import streetproof.streetproof.gate.SpeedGate;
import streetproof.streetproof.gate.Verdict;
import streetproof.streetproof.livepeer.LivepeerClient;
import streetproof.streetproof.livepeer.LivepeerException;
import streetproof.streetproof.speed.SpeedEstimate;
import streetproof.streetproof.speed.SpeedEstimator;
import streetproof.streetproof.tracking.IouTracker;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.tracking.TrackPoint;
import streetproof.streetproof.video.FfmpegService;
import streetproof.streetproof.video.FrameAnnotator;
import tools.jackson.databind.json.JsonMapper;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Component
public class StudyPipeline {

    private final StreetProofProperties properties;
    private final FfmpegService ffmpeg;
    private final LivepeerClient livepeer;
    private final StudyRepository repository;
    private final JsonMapper json = JsonMapper.builder().build();
    private final FrameAnnotator annotator = new FrameAnnotator();

    public StudyPipeline(StreetProofProperties properties, FfmpegService ffmpeg, LivepeerClient livepeer, StudyRepository repository) {
        this.properties = properties;
        this.ffmpeg = ffmpeg;
        this.livepeer = livepeer;
        this.repository = repository;
    }

    public void run(Study study, boolean checkConditions) {
        try {
            study.status(StudyStatus.EXTRACTING);
            List<Path> frames = ffmpeg.extractFrames(study.video(), study.sampleFps(), study.framesDir());
            if (frames.isEmpty()) {
                throw new IllegalStateException("No frames could be extracted from the video");
            }
            BufferedImage first = ImageIO.read(frames.getFirst().toFile());
            study.frameSize(first.getWidth(), first.getHeight());
            study.framesTotal(frames.size());

            study.status(StudyStatus.DETECTING);
            String conditions = checkConditions ? checkConditions(study, frames.get(frames.size() / 2)) : null;
            List<FrameDetections> detections = detectAll(study, frames);

            study.status(StudyStatus.MEASURING);
            IouTracker tracker = new IouTracker(properties.tracking().minIou(),
                    properties.tracking().maxMissedFrames(), properties.tracking().minTrackFrames());
            List<Track> tracks = tracker.track(detections, new HashSet<>(properties.tracking().vehicleLabels()));
            SpeedEstimator estimator = new SpeedEstimator(properties.gate().edgeMarginPx());
            SpeedGate gate = new SpeedGate(properties.gate());
            Map<Integer, Verdict> verdicts = new LinkedHashMap<>();
            for (Track track : tracks) {
                SpeedEstimate estimate = estimator.estimate(track, study.calibration(), first.getWidth(), first.getHeight());
                Verdict verdict = conditions != null
                        ? Verdict.refused(estimate, RefusalReason.POOR_CONDITIONS, conditions)
                        : gate.evaluate(estimate, study.calibration(), study.sampleFps());
                verdicts.put(track.id(), verdict);
            }
            List<Verdict> ordered = new ArrayList<>(verdicts.values());
            study.results(tracks, ordered, StudyStats.analyse(ordered, study.postedLimitKmh()));

            study.status(StudyStatus.RENDERING);
            annotator.render(frames, tracks, verdicts, study.postedLimitKmh(), study.annotatedDir());
            ffmpeg.encode(study.annotatedDir(), study.sampleFps(), study.annotatedVideo());
            writeThumbnails(study, frames, tracks);

            study.status(StudyStatus.DONE);
        } catch (Exception e) {
            study.fail(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        } finally {
            repository.save(study);
        }
    }

    private List<FrameDetections> detectAll(Study study, List<Path> frames) throws IOException {
        Path cacheDir = properties.workDir().resolve("cache")
                .resolve(study.videoSha256() + "-" + String.format(Locale.ROOT, "%.2f", study.sampleFps()));
        Files.createDirectories(cacheDir);
        ExecutorService pool = Executors.newFixedThreadPool(Math.max(1, properties.livepeer().concurrency()));
        int cachedFrames = 0;
        try {
            List<Future<FrameDetections>> futures = new ArrayList<>();
            for (int i = 0; i < frames.size(); i++) {
                int index = i + 1;
                Path frame = frames.get(i);
                Path cached = cacheDir.resolve(index + ".json");
                if (Files.isRegularFile(cached)) {
                    cachedFrames++;
                    FrameDetections saved = json.readValue(Files.readString(cached), FrameDetections.class);
                    study.frameDone();
                    futures.add(java.util.concurrent.CompletableFuture.completedFuture(saved));
                } else {
                    futures.add(pool.submit(() -> {
                        FrameDetections result = detectFrame(study, frame, index);
                        Files.writeString(cached, json.writeValueAsString(result));
                        return result;
                    }));
                }
            }
            study.usedCachedDetections(cachedFrames == frames.size());
            List<FrameDetections> results = new ArrayList<>();
            for (Future<FrameDetections> future : futures) {
                try {
                    results.add(future.get());
                } catch (ExecutionException e) {
                    throw new IllegalStateException("Livepeer detection failed: " + e.getCause().getMessage()
                            + ". Frames already detected are saved; run it again to continue.", e.getCause());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Detection was interrupted", e);
                }
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    private FrameDetections detectFrame(Study study, Path frame, int index) throws IOException, InterruptedException {
        byte[] bytes = Files.readAllBytes(frame);
        int attempts = Math.max(1, properties.livepeer().maxRetries() + 1);
        for (int attempt = 1; ; attempt++) {
            try {
                String url = livepeer.upload(bytes, "image/jpeg", frame.getFileName().toString());
                study.livepeerCall(0);
                List<Detection> detections = livepeer.detect(url);
                study.livepeerCall(properties.livepeer().costPerDetectionUsd());
                study.frameDone();
                return new FrameDetections(index, (index - 1) / study.sampleFps(), detections);
            } catch (LivepeerException e) {
                if (isFinal(e) || attempt >= attempts) {
                    throw e;
                }
                Thread.sleep(waitMillis(e, attempt));
            }
        }
    }

    private static long waitMillis(LivepeerException e, int attempt) {
        String message = e.getMessage() == null ? "" : e.getMessage();
        if (message.contains("rate_limited") || message.contains("429")) {
            java.util.regex.Matcher seconds = java.util.regex.Pattern.compile("retry_after_seconds\\D+(\\d+)").matcher(message);
            return (seconds.find() ? Long.parseLong(seconds.group(1)) : 60L) * 1000L + 500L;
        }
        return 1000L * attempt;
    }

    private static boolean isFinal(LivepeerException e) {
        String code = e.code() == null ? "" : e.code();
        return code.contains("budget") || code.contains("spend_cap") || code.contains("unauthor") || code.contains("invalid");
    }

    private String checkConditions(Study study, Path frame) {
        try {
            String url = livepeer.upload(Files.readAllBytes(frame), "image/jpeg", "conditions.jpg");
            study.livepeerCall(0);
            String answer = livepeer.askAboutImage(url,
                    "Is this street scene too dark, too rainy or snowy, blocked, or full of glare to measure car speeds reliably? "
                            + "Answer YES or NO first, then one short reason.");
            study.livepeerCall(0);
            String trimmed = answer.strip();
            study.conditionsNote("vision check: " + (trimmed.length() > 160 ? trimmed.substring(0, 160) : trimmed));
            return trimmed.toUpperCase(Locale.ROOT).startsWith("YES") ? "vision check flagged the footage: " + trimmed : null;
        } catch (Exception e) {
            study.conditionsNote("vision check unavailable: " + e.getMessage());
            return null;
        }
    }

    private void writeThumbnails(Study study, List<Path> frames, List<Track> tracks) {
        for (Track track : tracks) {
            List<TrackPoint> inside = track.points().stream()
                    .filter(p -> p.box().fullyInside(study.frameWidth(), properties.gate().edgeMarginPx()))
                    .toList();
            TrackPoint best = inside.isEmpty() ? track.points().get(track.points().size() / 2) : inside.get(inside.size() / 2);
            int frameIndex = best.frameIndex() - 1;
            if (frameIndex >= 0 && frameIndex < frames.size()) {
                annotator.thumbnail(frames.get(frameIndex), best.box(), study.thumbnailsDir().resolve(track.id() + ".jpg"));
            }
        }
    }
}
