package streetproof.streetproof.gate;

import org.junit.jupiter.api.Test;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.speed.SpeedEstimate;

import static org.assertj.core.api.Assertions.assertThat;

class SpeedGateTest {

    private final SpeedGate gate = new SpeedGate(new StreetProofProperties.Gate(6, 0.98, 0.95, 0.15, 0.5, 3, 200, 4));
    private final Calibration calibration = Calibration.curbMarks(100, 400, 600, 400, 10);

    private SpeedEstimate estimate(int cleanFrames, double kmh, double rSquared, double widthVariation, double confidence) {
        return new SpeedEstimate(1, "car", cleanFrames + 2, cleanFrames, 0, 1, kmh, rSquared, widthVariation, confidence, 0.02, true);
    }

    @Test
    void provesAGoodMeasurement() {
        Verdict verdict = gate.evaluate(estimate(10, 48.7, 0.999, 0.03, 0.9), calibration, 15);
        assertThat(verdict.proven()).isTrue();
        assertThat(verdict.kmh()).isEqualTo(48.7);
    }

    @Test
    void refusesWithoutCalibration() {
        Verdict verdict = gate.evaluate(estimate(10, 48.7, 0.999, 0.03, 0.9), null, 15);
        assertThat(verdict.reason()).isEqualTo(RefusalReason.NO_CALIBRATION);
    }

    @Test
    void refusesTooFewCleanFramesAndSaysHowMany() {
        Verdict verdict = gate.evaluate(estimate(4, 48.7, 0.999, 0.03, 0.9), calibration, 15);
        assertThat(verdict.reason()).isEqualTo(RefusalReason.TOO_FEW_CLEAN_FRAMES);
        assertThat(verdict.detail()).isEqualTo("only 4 clean frames, needs 6");
    }

    @Test
    void refusesUnsteadyMotion() {
        assertThat(gate.evaluate(estimate(10, 48.7, 0.90, 0.03, 0.9), calibration, 15).reason())
                .isEqualTo(RefusalReason.UNSTEADY_MOTION);
    }

    @Test
    void refusesAMergedBox() {
        assertThat(gate.evaluate(estimate(10, 48.7, 0.999, 0.4, 0.9), calibration, 15).reason())
                .isEqualTo(RefusalReason.UNSTABLE_BOX);
    }

    @Test
    void refusesLowConfidence() {
        assertThat(gate.evaluate(estimate(10, 48.7, 0.999, 0.03, 0.3), calibration, 15).reason())
                .isEqualTo(RefusalReason.LOW_CONFIDENCE);
    }

    @Test
    void refusesImpossibleSpeeds() {
        assertThat(gate.evaluate(estimate(10, 260, 0.999, 0.03, 0.9), calibration, 15).reason())
                .isEqualTo(RefusalReason.IMPLAUSIBLE_SPEED);
    }
}
