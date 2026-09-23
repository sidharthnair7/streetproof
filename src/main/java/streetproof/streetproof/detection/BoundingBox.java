package streetproof.streetproof.detection;

public record BoundingBox(double x1, double y1, double x2, double y2) {

    public double width() {
        return x2 - x1;
    }

    public double height() {
        return y2 - y1;
    }

    public double centerX() {
        return (x1 + x2) / 2;
    }

    public double area() {
        return Math.max(0, width()) * Math.max(0, height());
    }

    public BoundingBox shiftX(double dx) {
        return new BoundingBox(x1 + dx, y1, x2 + dx, y2);
    }

    public double iou(BoundingBox other) {
        double ix1 = Math.max(x1, other.x1);
        double iy1 = Math.max(y1, other.y1);
        double ix2 = Math.min(x2, other.x2);
        double iy2 = Math.min(y2, other.y2);
        double intersection = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
        double union = area() + other.area() - intersection;
        return union <= 0 ? 0 : intersection / union;
    }

    public boolean fullyInside(int frameWidth, int margin) {
        return x1 > margin && x2 < frameWidth - margin;
    }
}
