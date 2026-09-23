package streetproof.streetproof.gate;

import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.speed.SpeedEstimate;

import java.util.Locale;

public class SpeedGate {

    private final StreetProofProperties.Gate rules;

    public SpeedGate(StreetProofProperties.Gate rules) {
        this.rules = rules;
    }

    public Verdict evaluate(SpeedEstimate estimate, Calibration calibration, double fps) {
        if (calibration == null || estimate.metresPerPixel() <= 0) {
            return Verdict.refused(estimate, RefusalReason.NO_CALIBRATION, "no calibration was set for this video");
        }
        if (fps <= 0) {
            return Verdict.refused(estimate, RefusalReason.NO_FRAME_RATE, "the frame rate could not be read");
        }
        if (estimate.cleanFrames() < rules.minCleanFrames()) {
            return Verdict.refused(estimate, RefusalReason.TOO_FEW_CLEAN_FRAMES,
                    String.format(Locale.ROOT, "only %d clean frames, needs %d", estimate.cleanFrames(), rules.minCleanFrames()));
        }
        double minFit = calibration.mode() == Calibration.Mode.APPROACH ? rules.minRSquaredApproach() : rules.minRSquared();
        if (estimate.rSquared() < minFit) {
            return Verdict.refused(estimate, RefusalReason.UNSTEADY_MOTION,
                    String.format(Locale.ROOT, "straight-line fit R² %.3f, needs %.2f", estimate.rSquared(), minFit));
        }
        if (estimate.widthVariation() > rules.maxWidthVariation()) {
            return Verdict.refused(estimate, RefusalReason.UNSTABLE_BOX,
                    String.format(Locale.ROOT, "box width varies %.0f%%, limit %.0f%%", estimate.widthVariation() * 100, rules.maxWidthVariation() * 100));
        }
        if (estimate.medianConfidence() < rules.minConfidence()) {
            return Verdict.refused(estimate, RefusalReason.LOW_CONFIDENCE,
                    String.format(Locale.ROOT, "median confidence %.2f, needs %.2f", estimate.medianConfidence(), rules.minConfidence()));
        }
        if (Double.isNaN(estimate.kmh()) || estimate.kmh() < rules.minKmh() || estimate.kmh() > rules.maxKmh()) {
            return Verdict.refused(estimate, RefusalReason.IMPLAUSIBLE_SPEED,
                    String.format(Locale.ROOT, "%.1f km/h is outside %.0f to %.0f", estimate.kmh(), rules.minKmh(), rules.maxKmh()));
        }
        return Verdict.proven(estimate);
    }
}
