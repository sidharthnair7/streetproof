package streetproof.streetproof.study;

import streetproof.streetproof.gate.Verdict;
import streetproof.streetproof.ledger.PublishedRecord;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.video.VideoInfo;

import java.time.Instant;
import java.util.List;

public record StudySnapshot(
        String id,
        Instant createdAt,
        String sourceName,
        String videoFile,
        String videoSha256,
        VideoInfo videoInfo,
        StudyStatus status,
        Calibration calibration,
        String calibrationUal,
        double postedLimitKmh,
        double sampleFps,
        Double knownKmh,
        String streetLabel,
        String group,
        int frameWidth,
        int frameHeight,
        int framesTotal,
        int framesDone,
        int livepeerCalls,
        double estimatedCostUsd,
        boolean usedCachedDetections,
        String conditionsNote,
        List<Track> tracks,
        List<Verdict> verdicts,
        SpeedAnalysis analysis,
        PublishedRecord published,
        String error
) {
}
