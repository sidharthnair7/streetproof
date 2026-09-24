package streetproof.streetproof.study;

import streetproof.streetproof.gate.Verdict;
import streetproof.streetproof.ledger.PublishedRecord;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.video.VideoInfo;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.DoubleAdder;

public class Study {

    private final String id;
    private final Instant createdAt;
    private final String sourceName;
    private final Path dir;
    private final Path video;
    private final String videoSha256;
    private final VideoInfo videoInfo;
    private final AtomicInteger framesTotal = new AtomicInteger();
    private final AtomicInteger framesDone = new AtomicInteger();
    private final AtomicInteger livepeerCalls = new AtomicInteger();
    private final DoubleAdder estimatedCostUsd = new DoubleAdder();

    private volatile StudyStatus status = StudyStatus.UPLOADED;
    private volatile Calibration calibration;
    private volatile double postedLimitKmh;
    private volatile double sampleFps;
    private volatile Double knownKmh;
    private volatile String streetLabel;
    private volatile String group = "study";
    private volatile int frameWidth;
    private volatile int frameHeight;
    private volatile boolean usedCachedDetections;
    private volatile String conditionsNote;
    private volatile List<Verdict> verdicts = List.of();
    private volatile List<Track> tracks = List.of();
    private volatile SpeedAnalysis analysis;
    private volatile PublishedRecord published;
    private volatile String error;
    private volatile String calibrationUal;

    public Study(String id, String sourceName, Path dir, Path video, String videoSha256, VideoInfo videoInfo) {
        this(id, Instant.now(), sourceName, dir, video, videoSha256, videoInfo);
    }

    private Study(String id, Instant createdAt, String sourceName, Path dir, Path video, String videoSha256, VideoInfo videoInfo) {
        this.id = id;
        this.createdAt = createdAt;
        this.sourceName = sourceName;
        this.dir = dir;
        this.video = video;
        this.videoSha256 = videoSha256;
        this.videoInfo = videoInfo;
    }

    public StudySnapshot snapshot() {
        return new StudySnapshot(id, createdAt, sourceName, video.getFileName().toString(), videoSha256, videoInfo, status,
                calibration, calibrationUal, postedLimitKmh, sampleFps, knownKmh, streetLabel, group, frameWidth, frameHeight,
                framesTotal.get(), framesDone.get(), livepeerCalls.get(), estimatedCostUsd.sum(), usedCachedDetections,
                conditionsNote, tracks, verdicts, analysis, published, error);
    }

    public static Study restore(StudySnapshot s, Path dir) {
        Study study = new Study(s.id(), s.createdAt() == null ? Instant.now() : s.createdAt(), s.sourceName(), dir,
                dir.resolve(s.videoFile()), s.videoSha256(), s.videoInfo());
        study.calibration = s.calibration();
        study.calibrationUal = s.calibrationUal();
        study.postedLimitKmh = s.postedLimitKmh();
        study.sampleFps = s.sampleFps();
        study.knownKmh = s.knownKmh();
        study.streetLabel = s.streetLabel();
        study.group = s.group() == null ? "study" : s.group();
        study.frameWidth = s.frameWidth();
        study.frameHeight = s.frameHeight();
        study.framesTotal.set(s.framesTotal());
        study.framesDone.set(s.framesDone());
        study.livepeerCalls.set(s.livepeerCalls());
        study.estimatedCostUsd.add(s.estimatedCostUsd());
        study.usedCachedDetections = s.usedCachedDetections();
        study.conditionsNote = s.conditionsNote();
        study.tracks = s.tracks() == null ? List.of() : List.copyOf(s.tracks());
        study.verdicts = s.verdicts() == null ? List.of() : List.copyOf(s.verdicts());
        study.analysis = s.analysis();
        study.published = s.published();
        study.error = s.error();
        boolean interrupted = s.status() != StudyStatus.DONE && s.status() != StudyStatus.FAILED && s.status() != StudyStatus.UPLOADED;
        study.status = interrupted ? StudyStatus.FAILED : s.status();
        if (interrupted) {
            study.error = "The server restarted while this study was running. Run it again.";
        }
        return study;
    }

    public String id() {
        return id;
    }

    public Path dir() {
        return dir;
    }

    public Path video() {
        return video;
    }

    public Path firstFrame() {
        return dir.resolve("first-frame.jpg");
    }

    public Path framesDir() {
        return dir.resolve("frames");
    }

    public Path annotatedDir() {
        return dir.resolve("annotated");
    }

    public Path annotatedVideo() {
        return dir.resolve("streetproof.mp4");
    }

    public Path thumbnailsDir() {
        return dir.resolve("vehicles");
    }

    public String videoSha256() {
        return videoSha256;
    }

    public VideoInfo videoInfo() {
        return videoInfo;
    }

    public StudyStatus status() {
        return status;
    }

    public void status(StudyStatus status) {
        this.status = status;
    }

    public Calibration calibration() {
        return calibration;
    }

    public double postedLimitKmh() {
        return postedLimitKmh;
    }

    public double sampleFps() {
        return sampleFps;
    }

    public Double knownKmh() {
        return knownKmh;
    }

    public String streetLabel() {
        return streetLabel;
    }

    public String group() {
        return group;
    }

    public List<Verdict> verdicts() {
        return verdicts;
    }

    public List<Track> tracks() {
        return tracks;
    }

    public int frameHeight() {
        return frameHeight;
    }

    public SpeedAnalysis analysis() {
        return analysis;
    }

    public PublishedRecord published() {
        return published;
    }

    public int frameWidth() {
        return frameWidth;
    }

    public void configure(Calibration calibration, double postedLimitKmh, double sampleFps, Double knownKmh, String streetLabel, String group) {
        this.calibration = calibration;
        this.postedLimitKmh = postedLimitKmh;
        this.sampleFps = sampleFps;
        this.knownKmh = knownKmh;
        this.streetLabel = streetLabel;
        this.group = group == null || group.isBlank() ? "study" : group;
        this.status = StudyStatus.QUEUED;
        this.error = null;
    }

    public void frameSize(int width, int height) {
        this.frameWidth = width;
        this.frameHeight = height;
    }

    public void framesTotal(int total) {
        framesTotal.set(total);
        framesDone.set(0);
    }

    public void frameDone() {
        framesDone.incrementAndGet();
    }

    public void livepeerCall(double costUsd) {
        livepeerCalls.incrementAndGet();
        estimatedCostUsd.add(costUsd);
    }

    public void usedCachedDetections(boolean used) {
        this.usedCachedDetections = used;
    }

    public void conditionsNote(String note) {
        this.conditionsNote = note;
    }

    public void results(List<Track> tracks, List<Verdict> verdicts, SpeedAnalysis analysis) {
        this.tracks = List.copyOf(tracks);
        this.verdicts = List.copyOf(verdicts);
        this.analysis = analysis;
    }

    public void calibratedWith(String ual) {
        this.calibrationUal = ual;
    }

    public String calibrationUal() {
        return calibrationUal;
    }

    public void published(PublishedRecord record) {
        this.published = record;
    }

    public void fail(String message) {
        this.error = message;
        this.status = StudyStatus.FAILED;
    }

    public StudyView view() {
        String base = "/api/studies/" + id;
        boolean done = status == StudyStatus.DONE;
        return new StudyView(
                id, createdAt, sourceName, group, streetLabel, status,
                videoSha256, videoInfo, frameWidth, frameHeight, calibration, calibrationUal, postedLimitKmh, sampleFps, knownKmh,
                new StudyView.Progress(framesDone.get(), framesTotal.get()),
                livepeerCalls.get(), Math.round(estimatedCostUsd.sum() * 10000) / 10000.0,
                usedCachedDetections, conditionsNote,
                analysis == null ? null : analysis.summary(),
                published, error,
                new StudyView.Links(
                        base + "/first-frame",
                        base + "/source",
                        done ? base + "/video" : null,
                        done ? base + "/vehicles" : null,
                        done ? base + "/analysis" : null,
                        done ? base + "/graph" : null,
                        done ? base + "/asset" : null));
    }
}
