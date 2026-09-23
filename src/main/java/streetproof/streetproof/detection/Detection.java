package streetproof.streetproof.detection;

public record Detection(String label, double confidence, BoundingBox box) {
}
