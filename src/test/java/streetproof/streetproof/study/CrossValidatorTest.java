package streetproof.streetproof.study;

import org.junit.jupiter.api.Test;
import streetproof.streetproof.calibration.CalibrationMath;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CrossValidatorTest {

    @Test
    void medianIgnoresOneBadPass() {
        assertThat(CalibrationMath.median(List.of(900.0, 905.0, 1100.0))).isEqualTo(905.0);
        assertThat(CalibrationMath.median(List.of(900.0, 1000.0))).isEqualTo(950.0);
    }

    @Test
    void combinationsCountEveryChoiceOnce() {
        assertThat(CalibrationMath.combinations(12, 1)).hasSize(12);
        assertThat(CalibrationMath.combinations(12, 3)).hasSize(220);
    }

    @Test
    void calibratingOnAClipRescalesTheOthers() {
        CrossValidation result = CrossValidator.compute(List.of("a", "b", "c"), List.of(1.0, 1.1, 1.2), 2);
        CrossValidation.ClipChoice onA = result.singleClipChoices().stream().filter(c -> c.clip().equals("a")).findFirst().orElseThrow();
        assertThat(onA.meanAbsErrorPercent()).isEqualTo(15.0);
        assertThat(onA.worstAbsErrorPercent()).isEqualTo(20.0);
        assertThat(result.levels()).hasSize(2);
        assertThat(result.levels().getFirst().combinations()).isEqualTo(3);
    }

    @Test
    void aClipThatMatchesTheOthersGivesZeroError() {
        CrossValidation result = CrossValidator.compute(List.of("a", "b", "c"), List.of(1.1, 1.1, 1.1), 1);
        assertThat(result.levels().getFirst().meanAbsErrorPercent()).isEqualTo(0.0);
    }
}
