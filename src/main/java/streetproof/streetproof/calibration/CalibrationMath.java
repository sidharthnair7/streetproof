package streetproof.streetproof.calibration;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class CalibrationMath {

    public static final double MAX_PASS_DISAGREEMENT_PERCENT = 15.0;

    private CalibrationMath() {
    }

    public static double median(List<Double> values) {
        if (values.isEmpty()) {
            throw new IllegalArgumentException("No values");
        }
        double[] sorted = values.stream().mapToDouble(Double::doubleValue).sorted().toArray();
        int middle = sorted.length / 2;
        return sorted.length % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2.0;
    }

    public static List<Double> deviationsPercent(List<Double> values, double centre) {
        List<Double> out = new ArrayList<>();
        for (double value : values) {
            out.add(Math.round((value - centre) / centre * 1000) / 10.0);
        }
        return out;
    }

    public static double spreadPercent(List<Double> values, double centre) {
        double min = values.stream().mapToDouble(Double::doubleValue).min().orElse(centre);
        double max = values.stream().mapToDouble(Double::doubleValue).max().orElse(centre);
        return Math.round((max - min) / centre * 1000) / 10.0;
    }

    public static List<int[]> combinations(int n, int k) {
        List<int[]> out = new ArrayList<>();
        if (k <= 0 || k > n) {
            return out;
        }
        int[] pick = new int[k];
        for (int i = 0; i < k; i++) {
            pick[i] = i;
        }
        while (true) {
            out.add(Arrays.copyOf(pick, k));
            int i = k - 1;
            while (i >= 0 && pick[i] == n - k + i) {
                i--;
            }
            if (i < 0) {
                return out;
            }
            pick[i]++;
            for (int j = i + 1; j < k; j++) {
                pick[j] = pick[j - 1] + 1;
            }
        }
    }
}
