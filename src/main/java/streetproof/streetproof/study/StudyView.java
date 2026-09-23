package streetproof.streetproof.study;

import streetproof.streetproof.ledger.PublishedRecord;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.video.VideoInfo;

import java.time.Instant;

public record StudyView(
        String id,
        Instant createdAt,
        String sourceName,
        String group,
        String streetLabel,
        StudyStatus status,
        String videoSha256,
        VideoInfo video,
        int frameWidth,
        int frameHeight,
        Calibration calibration,
        String calibrationUal,
        double postedLimitKmh,
        double sampleFps,
        Double knownKmh,
        Progress progress,
        int livepeerCalls,
        double estimatedCostUsd,
        boolean usedCachedDetections,
        String conditionsNote,
        StudySummary summary,
        PublishedRecord published,
        String error,
        Links links
) {

    public record Progress(int framesDone, int framesTotal) {
    }

    public record Links(
            String firstFrame,
            String source,
            String video,
            String vehicles,
            String analysis,
            String graph,
            String asset
    ) {
    }
}
