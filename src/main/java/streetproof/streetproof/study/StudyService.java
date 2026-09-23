package streetproof.streetproof.study;

import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import streetproof.streetproof.calibration.CalibrationRecord;
import streetproof.streetproof.calibration.CalibrationService;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.ledger.KnowledgePublisher;
import streetproof.streetproof.ledger.PublishedRecord;
import streetproof.streetproof.ledger.StudyAsset;
import streetproof.streetproof.ledger.StudyAssetBuilder;
import streetproof.streetproof.speed.SpeedEstimator;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.util.Hashing;
import streetproof.streetproof.video.FfmpegService;
import streetproof.streetproof.video.VideoInfo;
import streetproof.streetproof.web.NotFoundException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Stream;

@Service
public class StudyService {

    private static final DateTimeFormatter ID_TIME = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    private final StreetProofProperties properties;
    private final FfmpegService ffmpeg;
    private final StudyRepository repository;
    private final StudyPipeline pipeline;
    private final KnowledgePublisher publisher;
    private final StudyAssetBuilder assets;
    private final CalibrationService calibrations;
    private final ExecutorService runner = Executors.newSingleThreadExecutor();
    private final JsonMapper json = JsonMapper.builder().build();

    public StudyService(StreetProofProperties properties, FfmpegService ffmpeg, StudyRepository repository,
                        StudyPipeline pipeline, KnowledgePublisher publisher, StudyAssetBuilder assets,
                        CalibrationService calibrations) {
        this.properties = properties;
        this.ffmpeg = ffmpeg;
        this.repository = repository;
        this.pipeline = pipeline;
        this.publisher = publisher;
        this.assets = assets;
        this.calibrations = calibrations;
    }

    public StudyView upload(MultipartFile file) throws IOException {
        String name = file.getOriginalFilename() == null ? "upload.mp4" : Path.of(file.getOriginalFilename()).getFileName().toString();
        try (InputStream in = file.getInputStream()) {
            return create(name, in);
        }
    }

    public StudyView fromSample(String sampleName) throws IOException {
        Path source = sampleFile(sampleName);
        StudyView created;
        try (InputStream in = Files.newInputStream(source)) {
            created = create(source.getFileName().toString(), in);
        }
        RunRequest preset = readPreset(sampleName);
        return preset != null && (preset.calibration() != null || preset.calibrationRef() != null) ? run(created.id(), preset) : created;
    }

    public StudyView run(String id, RunRequest request) {
        Study study = require(id);
        if (study.status() != StudyStatus.UPLOADED && study.status() != StudyStatus.DONE && study.status() != StudyStatus.FAILED) {
            throw new IllegalArgumentException("This study is already running");
        }
        if (request == null) {
            throw new IllegalArgumentException("Send the run settings: a calibration, a calibrationRef from the DKG, or neither to see what gets refused");
        }
        Calibration calibration = request.calibration();
        String calibrationUal = null;
        if (request.calibrationRef() != null && !request.calibrationRef().isBlank()) {
            CalibrationRecord memory = calibrations.resolve(request.calibrationRef().trim());
            int width = Math.min(1280, study.videoInfo().width());
            calibration = calibrations.toCalibration(memory, request.vehicleHeightMetres(), width);
            calibrationUal = memory.ual();
        }
        if (calibration != null) {
            calibration.validate();
        }
        double limit = request.postedLimitKmh() == null ? properties.defaultPostedLimitKmh() : request.postedLimitKmh();
        double fps = request.sampleFps() == null || request.sampleFps() <= 0 ? properties.sampleFps() : request.sampleFps();
        long frames = Math.round(study.videoInfo().durationSeconds() * fps);
        if (frames > properties.maxFrames()) {
            throw new IllegalArgumentException(String.format(Locale.ROOT,
                    "That clip is %.0f s long, which is %d frames at %.0f fps. Keep it under %d frames: trim it to about %.0f s or lower the frame rate.",
                    study.videoInfo().durationSeconds(), frames, fps, properties.maxFrames(), properties.maxFrames() / fps));
        }
        study.configure(calibration, limit, fps, request.knownKmh(), request.streetLabel(), request.group());
        study.calibratedWith(calibrationUal);
        boolean check = request.checkConditions() != null && request.checkConditions();
        runner.submit(() -> pipeline.run(study, check));
        return study.view();
    }

    public StudyView get(String id) {
        return require(id).view();
    }

    public List<StudyView> list() {
        return repository.all().stream().map(Study::view).toList();
    }

    public Study require(String id) {
        return repository.find(id).orElseThrow(() -> new NotFoundException("No study with id " + id));
    }

    public List<VehicleView> vehicles(String id) {
        Study study = requireDone(id);
        return study.verdicts().stream()
                .map(v -> VehicleView.of(study.id(), v, study.postedLimitKmh(), study.knownKmh()))
                .toList();
    }

    public SpeedAnalysis analysis(String id) {
        return requireDone(id).analysis();
    }

    public Map<String, Object> asset(String id) {
        return assets.build(requireDone(id)).jsonLd();
    }

    public PublishedRecord publish(String id) {
        Study study = requireDone(id);
        StudyAsset asset = assets.build(study);
        PublishedRecord record = publisher.publish(study.id(), study.videoSha256(), study.streetLabel(), asset);
        study.published(record);
        repository.save(study);
        return record;
    }

    public Map<String, Object> calibrateFocal(String id, FocalRequest request) {
        Study study = requireDone(id);
        if (request == null || request.knownKmh() == null || request.vehicleHeightMetres() == null) {
            throw new IllegalArgumentException("Send knownKmh and vehicleHeightMetres");
        }
        Track track = study.tracks().stream()
                .filter(t -> request.trackId() == null || t.id() == request.trackId())
                .max(java.util.Comparator.comparingInt(t -> t.points().size()))
                .orElseThrow(() -> new IllegalArgumentException("No vehicle track to calibrate on"));
        double focal = SpeedEstimator.focalFromKnownSpeed(track, request.knownKmh(), request.vehicleHeightMetres(),
                study.frameWidth(), study.frameHeight(), properties.gate().edgeMarginPx());
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("studyId", id);
        out.put("trackId", track.id());
        out.put("knownKmh", request.knownKmh());
        out.put("vehicleHeightMetres", request.vehicleHeightMetres());
        out.put("focalPx", Math.round(focal * 10) / 10.0);
        return out;
    }

    public ValidationReport validation() {
        List<ValidationReport.Row> rows = new ArrayList<>();
        List<String> calibrationClips = new ArrayList<>();
        java.util.Set<String> calibrationUals = new java.util.HashSet<>();
        for (Study study : repository.all()) {
            boolean calibration = "calibration".equals(study.group());
            if (study.status() != StudyStatus.DONE || study.knownKmh() == null
                    || !(calibration || "validation".equals(study.group()))) {
                continue;
            }
            String clip = study.view().sourceName();
            if (calibration) {
                calibrationClips.add(clip);
            }
            calibrationUals.add(String.valueOf(study.calibrationUal()));
            java.util.Optional<streetproof.streetproof.gate.Verdict> best = study.verdicts().stream()
                    .max(java.util.Comparator.comparingInt(v -> v.estimate().cleanFrames()));
            if (best.isEmpty()) {
                rows.add(new ValidationReport.Row(study.id(), clip, calibration ? "calibration" : "test",
                        study.knownKmh(), null, null, false, "no vehicle tracked"));
                continue;
            }
            var verdict = best.get();
            Double error = verdict.proven()
                    ? Math.round((verdict.kmh() - study.knownKmh()) / study.knownKmh() * 1000) / 10.0
                    : null;
            rows.add(new ValidationReport.Row(study.id(), clip, calibration ? "calibration" : "test",
                    study.knownKmh(), verdict.kmh(), error, verdict.proven(),
                    verdict.proven() ? null : verdict.detail()));
        }
        rows.sort(java.util.Comparator.comparing(ValidationReport.Row::role).thenComparing(ValidationReport.Row::clip));
        List<ValidationReport.Row> tests = rows.stream().filter(r -> r.role().equals("test")).toList();
        List<Double> errors = tests.stream().filter(ValidationReport.Row::proven).map(r -> Math.abs(r.errorPercent())).toList();
        Double mean = errors.isEmpty() ? null : Math.round(errors.stream().mapToDouble(Double::doubleValue).average().orElse(0) * 10) / 10.0;
        Double max = errors.isEmpty() ? null : errors.stream().max(Double::compare).orElse(null);
        int refused = (int) tests.stream().filter(r -> !r.proven()).count();
        java.util.Collections.sort(calibrationClips);
        String calibrationClip = calibrationClips.isEmpty() ? null : String.join(", ", calibrationClips);
        String summary = errors.isEmpty()
                ? "No test clip produced a proven speed yet."
                : String.format(Locale.ROOT, "Calibrated on %s, tested on %d unseen clips: %d proven with a mean error of %.1f%% (worst %.1f%%), %d refused.",
                calibrationClip == null ? "one clip" : calibrationClip, tests.size(), errors.size(), mean, max, refused);
        String calibrationUal = calibrationUals.size() == 1 ? calibrationUals.iterator().next() : null;
        CrossValidation cross = null;
        List<ValidationReport.Row> measured = rows.stream().filter(ValidationReport.Row::proven).toList();
        if (calibrationUal != null && !"null".equals(calibrationUal) && measured.size() >= 3) {
            cross = CrossValidator.compute(measured.stream().map(ValidationReport.Row::clip).toList(),
                    measured.stream().map(r -> r.measuredKmh() / r.knownKmh()).toList(), 3);
        }
        return new ValidationReport(tests.size(), errors.size(), refused, mean, max, calibrationClip, rows, summary,
                "null".equals(calibrationUal) ? null : calibrationUal, calibrationClips, cross);
    }

    public List<Map<String, Object>> history(String id) {
        return publisher.historyFor(require(id).streetLabel());
    }

    public Path thumbnail(String id, int trackId) {
        Path file = require(id).thumbnailsDir().resolve(trackId + ".jpg");
        if (!Files.isRegularFile(file)) {
            throw new NotFoundException("No thumbnail for vehicle " + trackId);
        }
        return file;
    }

    public List<SampleClip> samples() throws IOException {
        Path dir = properties.samplesDir();
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        List<SampleClip> out = new ArrayList<>();
        try (Stream<Path> files = Files.list(dir)) {
            for (Path file : files.filter(f -> f.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".mp4")).sorted().toList()) {
                String name = file.getFileName().toString().replaceFirst("(?i)\\.mp4$", "");
                RunRequest preset = readPreset(name);
                Map<String, Object> meta = readMeta(name);
                out.add(new SampleClip(name,
                        meta == null ? name : String.valueOf(meta.getOrDefault("title", name)),
                        meta == null ? null : (String) meta.get("credit"),
                        preset != null && (preset.calibration() != null || preset.calibrationRef() != null),
                        preset));
            }
        }
        return out;
    }

    private Study requireDone(String id) {
        Study study = require(id);
        if (study.status() != StudyStatus.DONE) {
            throw new IllegalArgumentException("This study is not finished yet (status " + study.status() + ")");
        }
        return study;
    }

    private StudyView create(String sourceName, InputStream content) throws IOException {
        String id = LocalDateTime.now().format(ID_TIME) + "-" + UUID.randomUUID().toString().substring(0, 6);
        Path dir = properties.workDir().resolve("studies").resolve(id);
        Files.createDirectories(dir);
        String extension = sourceName.contains(".") ? sourceName.substring(sourceName.lastIndexOf('.')) : ".mp4";
        Path video = dir.resolve("source" + extension.toLowerCase(Locale.ROOT));
        Files.copy(content, video, StandardCopyOption.REPLACE_EXISTING);
        VideoInfo info = ffmpeg.probe(video);
        Study study = new Study(id, sourceName, dir, video, Hashing.sha256(video), info);
        ffmpeg.extractFirstFrame(video, study.firstFrame());
        repository.add(study);
        repository.save(study);
        return study.view();
    }

    private Path sampleFile(String name) {
        Path file = properties.samplesDir().resolve(Path.of(name).getFileName().toString() + ".mp4");
        if (!Files.isRegularFile(file)) {
            throw new NotFoundException("No sample clip called " + name);
        }
        return file;
    }

    private RunRequest readPreset(String name) {
        Path file = properties.samplesDir().resolve(name + ".json");
        if (!Files.isRegularFile(file)) {
            return null;
        }
        try {
            return json.readValue(Files.readString(file), RunRequest.class);
        } catch (IOException | RuntimeException e) {
            return null;
        }
    }

    private Map<String, Object> readMeta(String name) {
        Path file = properties.samplesDir().resolve(name + ".json");
        if (!Files.isRegularFile(file)) {
            return null;
        }
        try {
            return json.readValue(Files.readString(file), new TypeReference<Map<String, Object>>() {
            });
        } catch (IOException | RuntimeException e) {
            return null;
        }
    }

    @PreDestroy
    public void shutdown() {
        runner.shutdownNow();
    }
}
