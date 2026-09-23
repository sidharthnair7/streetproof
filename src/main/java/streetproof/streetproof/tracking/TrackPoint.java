package streetproof.streetproof.tracking;

import streetproof.streetproof.detection.BoundingBox;

public record TrackPoint(int frameIndex, double timeSeconds, BoundingBox box, double confidence) {
}
