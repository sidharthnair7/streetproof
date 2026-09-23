package streetproof.streetproof.study;

import streetproof.streetproof.gate.Verdict;

public record VehicleView(
        int trackId,
        String label,
        boolean proven,
        Double kmh,
        boolean overLimit,
        String reason,
        String reasonMeaning,
        String detail,
        String direction,
        double firstSeenSeconds,
        double lastSeenSeconds,
        int cleanFrames,
        int totalFrames,
        double rSquared,
        double medianConfidence,
        Double knownKmh,
        Double errorPercent,
        String thumbnailUrl
) {

    public static VehicleView of(String studyId, Verdict verdict, double postedLimitKmh, Double knownKmh) {
        var estimate = verdict.estimate();
        Double error = verdict.proven() && knownKmh != null && knownKmh > 0
                ? Math.round((verdict.kmh() - knownKmh) / knownKmh * 1000) / 10.0
                : null;
        return new VehicleView(
                verdict.trackId(),
                estimate.label(),
                verdict.proven(),
                verdict.kmh(),
                verdict.proven() && verdict.kmh() > postedLimitKmh,
                verdict.reason() == null ? null : verdict.reason().name(),
                verdict.reason() == null ? null : verdict.reason().meaning(),
                verdict.detail(),
                estimate.movingRight() ? "left-to-right" : "right-to-left",
                estimate.firstSeenSeconds(),
                estimate.lastSeenSeconds(),
                estimate.cleanFrames(),
                estimate.totalFrames(),
                Math.round(estimate.rSquared() * 10000) / 10000.0,
                Math.round(estimate.medianConfidence() * 1000) / 1000.0,
                knownKmh,
                error,
                "/api/studies/" + studyId + "/vehicles/" + verdict.trackId() + "/thumbnail");
    }
}
