package streetproof.streetproof.speed;

import org.junit.jupiter.api.Test;
import streetproof.streetproof.SyntheticTracks;
import streetproof.streetproof.tracking.IouTracker;
import streetproof.streetproof.tracking.Track;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class SpeedEstimatorTest {

    private final SpeedEstimator estimator = new SpeedEstimator(4);

    private Track oneCar(double pixelsPerSecond, int frames) {
        return new IouTracker(0.2, 3, 3)
                .track(SyntheticTracks.carAtConstantSpeed(pixelsPerSecond, 15, frames, 10, 200), Set.of("car"))
                .getFirst();
    }

    @Test
    void curbMarksTurnPixelsIntoKmh() {
        Calibration tenMetresIs500Pixels = Calibration.curbMarks(100, 400, 600, 400, 10);
        SpeedEstimate estimate = estimator.estimate(oneCar(694.44, 12), tenMetresIs500Pixels, 1280, 720);
        assertThat(estimate.kmh()).isCloseTo(50.0, within(0.1));
        assertThat(estimate.rSquared()).isCloseTo(1.0, within(1e-9));
    }

    @Test
    void knownVehicleLengthGivesTheSameAnswer() {
        Calibration carIsFourMetres = Calibration.vehicleLength(4.0);
        SpeedEstimate estimate = estimator.estimate(oneCar(694.44, 12), carIsFourMetres, 1280, 720);
        assertThat(estimate.kmh()).isCloseTo(694.44 * (4.0 / 200) * 3.6, within(0.1));
    }

    @Test
    void approachModeRecoversSpeedFromAGrowingBox() {
        double focal = 900;
        double height = 1.5;
        double metresPerSecond = 20;
        java.util.List<streetproof.streetproof.detection.FrameDetections> frames = new java.util.ArrayList<>();
        for (int i = 0; i < 30; i++) {
            double t = i / 15.0;
            double distance = 80 - metresPerSecond * t;
            double h = focal * height / distance;
            double w = h * 1.4;
            frames.add(new streetproof.streetproof.detection.FrameDetections(i + 1, t, java.util.List.of(
                    new streetproof.streetproof.detection.Detection("car", 0.9,
                            new streetproof.streetproof.detection.BoundingBox(600 - w / 2, 360 - h / 2, 600 + w / 2, 360 + h / 2)))));
        }
        Track track = new IouTracker(0.2, 3, 3).track(frames, Set.of("car")).getFirst();
        SpeedEstimate estimate = estimator.estimate(track, Calibration.approach(height, focal), 1280, 720);
        assertThat(estimate.kmh()).isCloseTo(72.0, within(0.5));
        assertThat(SpeedEstimator.focalFromKnownSpeed(track, 72.0, height, 1280, 720, 4)).isCloseTo(focal, within(5.0));
    }

    @Test
    void framesWhereTheCarIsCutOffAreNotCounted() {
        SpeedEstimate estimate = estimator.estimate(oneCar(400, 20), Calibration.curbMarks(0, 0, 500, 0, 10), 600, 720);
        assertThat(estimate.cleanFrames()).isLessThan(estimate.totalFrames());
    }
}
