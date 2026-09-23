package streetproof.streetproof.study;

public record StudySummary(
        int vehiclesObserved,
        int vehiclesProven,
        int vehiclesRefused,
        Double v85Kmh,
        Double medianKmh,
        Double shareOverLimit,
        double postedLimitKmh
) {
}
