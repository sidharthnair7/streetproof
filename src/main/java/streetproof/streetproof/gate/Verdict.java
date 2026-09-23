package streetproof.streetproof.gate;

import streetproof.streetproof.speed.SpeedEstimate;

public record Verdict(
        int trackId,
        boolean proven,
        Double kmh,
        RefusalReason reason,
        String detail,
        SpeedEstimate estimate
) {

    public static Verdict proven(SpeedEstimate estimate) {
        return new Verdict(estimate.trackId(), true, round(estimate.kmh()), null, null, estimate);
    }

    public static Verdict refused(SpeedEstimate estimate, RefusalReason reason, String detail) {
        return new Verdict(estimate.trackId(), false, null, reason, detail, estimate);
    }

    private static Double round(double kmh) {
        return Math.round(kmh * 10) / 10.0;
    }
}
