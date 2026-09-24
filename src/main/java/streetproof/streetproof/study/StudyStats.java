package streetproof.streetproof.study;

import streetproof.streetproof.gate.Verdict;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class StudyStats {

    private static final int BIN_WIDTH_KMH = 5;

    private StudyStats() {
    }

    public static Double percentile(List<Double> values, double percentile) {
        if (values.isEmpty()) {
            return null;
        }
        List<Double> sorted = values.stream().sorted().toList();
        int rank = (int) Math.ceil(percentile / 100.0 * sorted.size());
        return sorted.get(Math.max(0, Math.min(sorted.size() - 1, rank - 1)));
    }

    public static StudySummary summarize(List<Verdict> verdicts, double postedLimitKmh) {
        List<Double> speeds = provenSpeeds(verdicts);
        int proven = speeds.size();
        Double share = proven == 0 ? null
                : round(speeds.stream().filter(s -> s > postedLimitKmh).count() / (double) proven);
        return new StudySummary(verdicts.size(), proven, verdicts.size() - proven,
                percentile(speeds, 85), percentile(speeds, 50), share, postedLimitKmh);
    }

    public static SpeedAnalysis analyse(List<Verdict> verdicts, double postedLimitKmh) {
        StudySummary summary = summarize(verdicts, postedLimitKmh);
        List<Double> speeds = provenSpeeds(verdicts);
        Double mean = speeds.isEmpty() ? null : round(speeds.stream().mapToDouble(Double::doubleValue).average().orElse(0));
        Double max = speeds.isEmpty() ? null : speeds.stream().max(Double::compare).orElse(null);
        Double overBy10 = speeds.isEmpty() ? null
                : round(speeds.stream().filter(s -> s > postedLimitKmh + 10).count() / (double) speeds.size());

        Map<String, Integer> refusals = new LinkedHashMap<>();
        Map<String, Integer> directions = new LinkedHashMap<>();
        List<SpeedAnalysis.Point> overTime = new ArrayList<>();
        for (Verdict verdict : verdicts) {
            directions.merge(verdict.estimate().movingRight() ? "left-to-right" : "right-to-left", 1, Integer::sum);
            if (verdict.proven()) {
                double mid = (verdict.estimate().firstSeenSeconds() + verdict.estimate().lastSeenSeconds()) / 2;
                overTime.add(new SpeedAnalysis.Point(round(mid), verdict.kmh(), verdict.trackId()));
            } else {
                refusals.merge(verdict.reason().name(), 1, Integer::sum);
            }
        }
        overTime.sort(Comparator.comparingDouble(SpeedAnalysis.Point::timeSeconds));
        return new SpeedAnalysis(summary, mean, max, overBy10, histogram(speeds), refusals, overTime, directions,
                headline(summary), percentile(speeds, 95));
    }

    private static List<SpeedAnalysis.Bin> histogram(List<Double> speeds) {
        List<SpeedAnalysis.Bin> bins = new ArrayList<>();
        if (speeds.isEmpty()) {
            return bins;
        }
        int low = (int) (Math.floor(speeds.stream().min(Double::compare).orElse(0.0) / BIN_WIDTH_KMH) * BIN_WIDTH_KMH);
        int high = (int) (Math.floor(speeds.stream().max(Double::compare).orElse(0.0) / BIN_WIDTH_KMH) * BIN_WIDTH_KMH);
        for (int from = low; from <= high; from += BIN_WIDTH_KMH) {
            int start = from;
            int count = (int) speeds.stream().filter(s -> s >= start && s < start + BIN_WIDTH_KMH).count();
            bins.add(new SpeedAnalysis.Bin(start, start + BIN_WIDTH_KMH, count));
        }
        return bins;
    }

    private static String headline(StudySummary summary) {
        if (summary.vehiclesProven() == 0) {
            return "No speed could be proven in this video, so this study makes no claim.";
        }
        String base = String.format(Locale.ROOT, "%d of %d vehicles measured. 85%% drove at or under %.1f km/h",
                summary.vehiclesProven(), summary.vehiclesObserved(), summary.v85Kmh());
        if (summary.shareOverLimit() != null) {
            base += String.format(Locale.ROOT, "; %.0f%% went over the %.0f km/h limit.",
                    summary.shareOverLimit() * 100, summary.postedLimitKmh());
        }
        return base;
    }

    private static List<Double> provenSpeeds(List<Verdict> verdicts) {
        return verdicts.stream().filter(Verdict::proven).map(Verdict::kmh).toList();
    }

    private static Double round(double value) {
        return Math.round(value * 1000) / 1000.0;
    }
}
