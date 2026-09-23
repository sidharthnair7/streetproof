package streetproof.streetproof;

import streetproof.streetproof.detection.BoundingBox;
import streetproof.streetproof.detection.Detection;
import streetproof.streetproof.detection.FrameDetections;

import java.util.ArrayList;
import java.util.List;

public final class SyntheticTracks {

    private SyntheticTracks() {
    }

    public static List<FrameDetections> carAtConstantSpeed(double pixelsPerSecond, double fps, int frames, double startX, double width) {
        List<FrameDetections> out = new ArrayList<>();
        for (int i = 0; i < frames; i++) {
            double t = i / fps;
            double x1 = startX + pixelsPerSecond * t;
            out.add(new FrameDetections(i + 1, t, List.of(
                    new Detection("car", 0.9, new BoundingBox(x1, 300, x1 + width, 380)))));
        }
        return out;
    }
}
