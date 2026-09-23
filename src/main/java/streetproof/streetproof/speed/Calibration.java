package streetproof.streetproof.speed;

public record Calibration(Mode mode, Double x1, Double y1, Double x2, Double y2, Double metres, Double focalPx) {

    public enum Mode {
        CURB_MARKS,
        VEHICLE_LENGTH,
        APPROACH
    }

    public static Calibration curbMarks(double x1, double y1, double x2, double y2, double metres) {
        return new Calibration(Mode.CURB_MARKS, x1, y1, x2, y2, metres, null);
    }

    public static Calibration vehicleLength(double metres) {
        return new Calibration(Mode.VEHICLE_LENGTH, null, null, null, null, metres, null);
    }

    public static Calibration approach(double vehicleHeightMetres, double focalPx) {
        return new Calibration(Mode.APPROACH, null, null, null, null, vehicleHeightMetres, focalPx);
    }

    public void validate() {
        if (mode == null) {
            throw new IllegalArgumentException("Calibration needs a mode: CURB_MARKS, VEHICLE_LENGTH or APPROACH");
        }
        if (metres == null || metres <= 0) {
            throw new IllegalArgumentException("Calibration needs a positive size in metres");
        }
        if (mode == Mode.CURB_MARKS) {
            if (x1 == null || y1 == null || x2 == null || y2 == null) {
                throw new IllegalArgumentException("Curb marks need two points: x1, y1, x2, y2");
            }
            if (Math.abs(x2 - x1) < 20) {
                throw new IllegalArgumentException("The two curb marks must be at least 20 pixels apart along the road");
            }
        }
        if (mode == Mode.APPROACH && (focalPx == null || focalPx <= 0)) {
            throw new IllegalArgumentException("Approach mode needs the camera's focal length in pixels (focalPx)");
        }
    }

    public double curbMetresPerPixel() {
        return metres / Math.abs(x2 - x1);
    }
}
