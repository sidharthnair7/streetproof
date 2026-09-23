package streetproof.streetproof.study;

import java.util.List;

public record CrossValidation(
        String method,
        List<Level> levels,
        List<ClipChoice> singleClipChoices
) {

    public record Level(
            int passes,
            int combinations,
            double meanAbsErrorPercent,
            double worstCombinationMeanPercent,
            double worstClipErrorPercent
    ) {
    }

    public record ClipChoice(
            String clip,
            double meanAbsErrorPercent,
            double worstAbsErrorPercent
    ) {
    }
}
