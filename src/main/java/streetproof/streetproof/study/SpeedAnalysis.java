package streetproof.streetproof.study;

import java.util.List;
import java.util.Map;

public record SpeedAnalysis(
        StudySummary summary,
        Double meanKmh,
        Double maxKmh,
        Double shareOverLimitBy10,
        List<Bin> histogram,
        Map<String, Integer> refusalsByReason,
        List<Point> speedOverTime,
        Map<String, Integer> byDirection,
        String headline,
        Double p95Kmh
) {

    public record Bin(int fromKmh, int toKmh, int count) {
    }

    public record Point(double timeSeconds, double kmh, int trackId) {
    }
}
