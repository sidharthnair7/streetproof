package streetproof.streetproof.study;

import org.junit.jupiter.api.Test;
import streetproof.streetproof.gate.RefusalReason;
import streetproof.streetproof.gate.Verdict;
import streetproof.streetproof.speed.SpeedEstimate;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StudyStatsTest {

    private static SpeedEstimate estimate(int id, double kmh) {
        return new SpeedEstimate(id, "car", 12, 10, id, id + 1, kmh, 0.999, 0.03, 0.9, 0.02, true);
    }

    @Test
    void v85IsTheSpeed85PercentOfDriversStayAtOrUnder() {
        List<Double> speeds = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            speeds.add((double) (30 + i));
        }
        assertThat(StudyStats.percentile(speeds, 85)).isEqualTo(47.0);
    }

    @Test
    void summaryCountsOnlyProvenSpeeds() {
        List<Verdict> verdicts = List.of(
                Verdict.proven(estimate(1, 42)),
                Verdict.proven(estimate(2, 55)),
                Verdict.proven(estimate(3, 61)),
                Verdict.refused(estimate(4, 90), RefusalReason.TOO_FEW_CLEAN_FRAMES, "only 3 clean frames, needs 6"));
        StudySummary summary = StudyStats.summarize(verdicts, 50);
        assertThat(summary.vehiclesObserved()).isEqualTo(4);
        assertThat(summary.vehiclesProven()).isEqualTo(3);
        assertThat(summary.v85Kmh()).isEqualTo(61.0);
        assertThat(summary.shareOverLimit()).isEqualTo(0.667);
    }

    @Test
    void noProvenSpeedMeansNoClaim() {
        List<Verdict> verdicts = List.of(
                Verdict.refused(estimate(1, 40), RefusalReason.UNSTEADY_MOTION, "fit too loose"));
        SpeedAnalysis analysis = StudyStats.analyse(verdicts, 50);
        assertThat(analysis.summary().v85Kmh()).isNull();
        assertThat(analysis.headline()).startsWith("No speed could be proven");
        assertThat(analysis.refusalsByReason()).containsEntry("UNSTEADY_MOTION", 1);
    }
}
