package streetproof.streetproof.study;

import streetproof.streetproof.calibration.CalibrationMath;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class CrossValidator {

    public static final String METHOD = "Every measured speed is proportional to the calibration's focal length, so calibrating on other clips "
            + "rescales every speed by the same factor. This re-scores every possible choice of calibration clips "
            + "(median of their focal lengths) on the clips left out, without re-running detection.";

    private CrossValidator() {
    }

    public static CrossValidation compute(List<String> clips, List<Double> ratios, int maxPasses) {
        int n = ratios.size();
        List<CrossValidation.Level> levels = new ArrayList<>();
        for (int k = 1; k <= Math.min(maxPasses, n - 1); k++) {
            List<int[]> combos = CalibrationMath.combinations(n, k);
            double sumOfMeans = 0;
            double worstMean = 0;
            double worstClip = 0;
            for (int[] combo : combos) {
                double[] errors = errors(ratios, combo);
                double mean = mean(errors);
                sumOfMeans += mean;
                worstMean = Math.max(worstMean, mean);
                worstClip = Math.max(worstClip, max(errors));
            }
            levels.add(new CrossValidation.Level(k, combos.size(), round(sumOfMeans / combos.size()), round(worstMean), round(worstClip)));
        }
        List<CrossValidation.ClipChoice> choices = new ArrayList<>();
        if (n >= 2) {
            for (int i = 0; i < n; i++) {
                double[] errors = errors(ratios, new int[]{i});
                choices.add(new CrossValidation.ClipChoice(clips.get(i), round(mean(errors)), round(max(errors))));
            }
        }
        choices.sort(Comparator.comparingDouble(CrossValidation.ClipChoice::meanAbsErrorPercent));
        return new CrossValidation(METHOD, levels, choices);
    }

    private static double[] errors(List<Double> ratios, int[] combo) {
        List<Double> inverse = new ArrayList<>();
        boolean[] used = new boolean[ratios.size()];
        for (int index : combo) {
            inverse.add(1 / ratios.get(index));
            used[index] = true;
        }
        double scale = CalibrationMath.median(inverse);
        double[] errors = new double[ratios.size() - combo.length];
        int at = 0;
        for (int j = 0; j < ratios.size(); j++) {
            if (!used[j]) {
                errors[at++] = Math.abs(ratios.get(j) * scale - 1) * 100;
            }
        }
        return errors;
    }

    private static double mean(double[] values) {
        double sum = 0;
        for (double value : values) {
            sum += value;
        }
        return values.length == 0 ? 0 : sum / values.length;
    }

    private static double max(double[] values) {
        double best = 0;
        for (double value : values) {
            best = Math.max(best, value);
        }
        return best;
    }

    private static double round(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
