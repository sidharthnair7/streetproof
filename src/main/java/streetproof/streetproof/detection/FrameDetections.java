package streetproof.streetproof.detection;

import java.util.List;

public record FrameDetections(int index, double timeSeconds, List<Detection> detections) {
}
