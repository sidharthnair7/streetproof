package streetproof.streetproof.study;

import java.util.List;

public record ValidationReport(
        int clips,
        int proven,
        int refused,
        Double meanAbsErrorPercent,
        Double maxAbsErrorPercent,
        String calibrationClip,
        List<Row> rows,
        String summary
) {

    public record Row(
            String studyId,
            String clip,
            String role,
            double knownKmh,
            Double measuredKmh,
            Double errorPercent,
            boolean proven,
            String refusal
    ) {
    }
}
