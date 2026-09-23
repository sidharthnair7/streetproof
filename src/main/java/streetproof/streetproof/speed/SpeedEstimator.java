package streetproof.streetproof.speed;

import streetproof.streetproof.detection.BoundingBox;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.tracking.TrackPoint;

import java.util.Arrays;
import java.util.List;

public class SpeedEstimator {

    public static final double FAR_FIELD_MAX_HEIGHT_SHARE = 0.4;
    public static final double MIN_APPROACH_HEIGHT_PX = 16;

    private final int edgeMarginPx;

    public SpeedEstimator(int edgeMarginPx) {
        this.edgeMarginPx = edgeMarginPx;
    }

    public SpeedEstimate estimate(Track track, Calibration calibration, int frameWidth, int frameHeight) {
        double medianConfidence = median(track.points().stream().mapToDouble(TrackPoint::confidence).toArray());
        if (calibration != null && calibration.mode() == Calibration.Mode.APPROACH) {
            return approach(track, calibration, frameWidth, frameHeight, medianConfidence);
        }
        List<TrackPoint> clean = track.points().stream()
                .filter(p -> p.box().fullyInside(frameWidth, edgeMarginPx))
                .toList();
        double widthVariation = coefficientOfVariation(clean.stream().mapToDouble(p -> p.box().width()).toArray());
        double metresPerPixel = sideOnScale(calibration, clean);
        double kmh = Double.NaN;
        double rSquared = 0;
        if (clean.size() >= 2 && metresPerPixel > 0) {
            Fit fit = fit(times(clean), clean.stream().mapToDouble(p -> p.box().centerX()).toArray());
            kmh = Math.abs(fit.slope()) * metresPerPixel * 3.6;
            rSquared = fit.rSquared();
        }
        return new SpeedEstimate(track.id(), track.label(), track.points().size(), clean.size(),
                track.first().timeSeconds(), track.last().timeSeconds(),
                kmh, rSquared, widthVariation, medianConfidence, metresPerPixel, track.movingRight());
    }

    public static double focalFromKnownSpeed(Track track, double knownKmh, double vehicleHeightMetres,
                                             int frameWidth, int frameHeight, int edgeMarginPx) {
        List<TrackPoint> clean = approachPoints(track, frameWidth, frameHeight, edgeMarginPx);
        if (clean.size() < 2) {
            throw new IllegalArgumentException("That vehicle has too few usable frames to calibrate on");
        }
        Fit fit = fit(times(clean), inverseHeights(clean));
        if (fit.slope() == 0) {
            throw new IllegalArgumentException("That vehicle does not move towards the camera");
        }
        return (knownKmh / 3.6) / (Math.abs(fit.slope()) * vehicleHeightMetres);
    }

    private SpeedEstimate approach(Track track, Calibration calibration, int frameWidth, int frameHeight, double medianConfidence) {
        List<TrackPoint> clean = approachPoints(track, frameWidth, frameHeight, edgeMarginPx);
        double aspectVariation = coefficientOfVariation(clean.stream().mapToDouble(p -> p.box().width() / p.box().height()).toArray());
        double scale = calibration.focalPx() * calibration.metres();
        double kmh = Double.NaN;
        double rSquared = 0;
        if (clean.size() >= 2) {
            Fit fit = fit(times(clean), inverseHeights(clean));
            kmh = Math.abs(fit.slope()) * scale * 3.6;
            rSquared = fit.rSquared();
        }
        return new SpeedEstimate(track.id(), track.label(), track.points().size(), clean.size(),
                track.first().timeSeconds(), track.last().timeSeconds(),
                kmh, rSquared, aspectVariation, medianConfidence, scale, track.movingRight());
    }

    private static List<TrackPoint> approachPoints(Track track, int frameWidth, int frameHeight, int margin) {
        return track.points().stream()
                .filter(p -> inside(p.box(), frameWidth, frameHeight, margin))
                .filter(p -> p.box().height() <= FAR_FIELD_MAX_HEIGHT_SHARE * frameHeight)
                .filter(p -> p.box().height() >= MIN_APPROACH_HEIGHT_PX)
                .toList();
    }

    private static boolean inside(BoundingBox box, int frameWidth, int frameHeight, int margin) {
        return box.fullyInside(frameWidth, margin) && box.y1() > margin && box.y2() < frameHeight - margin;
    }

    private static double sideOnScale(Calibration calibration, List<TrackPoint> clean) {
        if (calibration == null) {
            return 0;
        }
        if (calibration.mode() == Calibration.Mode.CURB_MARKS) {
            return calibration.curbMetresPerPixel();
        }
        double width = median(clean.stream().mapToDouble(p -> p.box().width()).toArray());
        return width > 0 ? calibration.metres() / width : 0;
    }

    private static double[] times(List<TrackPoint> points) {
        return points.stream().mapToDouble(TrackPoint::timeSeconds).toArray();
    }

    private static double[] inverseHeights(List<TrackPoint> points) {
        return points.stream().mapToDouble(p -> 1.0 / p.box().height()).toArray();
    }

    static Fit fit(double[] x, double[] y) {
        int n = x.length;
        double meanX = 0;
        double meanY = 0;
        for (int i = 0; i < n; i++) {
            meanX += x[i];
            meanY += y[i];
        }
        meanX /= n;
        meanY /= n;
        double sxx = 0;
        double sxy = 0;
        double syy = 0;
        for (int i = 0; i < n; i++) {
            sxx += (x[i] - meanX) * (x[i] - meanX);
            sxy += (x[i] - meanX) * (y[i] - meanY);
            syy += (y[i] - meanY) * (y[i] - meanY);
        }
        if (sxx == 0) {
            return new Fit(0, 0);
        }
        double slope = sxy / sxx;
        double rSquared = syy == 0 ? 1 : (sxy * sxy) / (sxx * syy);
        return new Fit(slope, rSquared);
    }

    static double median(double[] values) {
        if (values.length == 0) {
            return 0;
        }
        double[] sorted = values.clone();
        Arrays.sort(sorted);
        int mid = sorted.length / 2;
        return sorted.length % 2 == 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    static double coefficientOfVariation(double[] values) {
        if (values.length < 2) {
            return 0;
        }
        double mean = 0;
        for (double v : values) {
            mean += v;
        }
        mean /= values.length;
        if (mean == 0) {
            return 0;
        }
        double variance = 0;
        for (double v : values) {
            variance += (v - mean) * (v - mean);
        }
        variance /= values.length;
        return Math.sqrt(variance) / mean;
    }

    record Fit(double slope, double rSquared) {
    }
}
