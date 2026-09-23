package streetproof.streetproof.tracking;

import org.junit.jupiter.api.Test;
import streetproof.streetproof.SyntheticTracks;
import streetproof.streetproof.detection.BoundingBox;
import streetproof.streetproof.detection.Detection;
import streetproof.streetproof.detection.FrameDetections;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class IouTrackerTest {

    private final IouTracker tracker = new IouTracker(0.2, 3, 3);

    @Test
    void followsOneCarAcrossFrames() {
        List<Track> tracks = tracker.track(SyntheticTracks.carAtConstantSpeed(400, 15, 20, 10, 200), Set.of("car"));
        assertThat(tracks).hasSize(1);
        assertThat(tracks.getFirst().points()).hasSize(20);
    }

    @Test
    void keepsAFastCarByPredictingWhereItMoves() {
        List<Track> tracks = tracker.track(SyntheticTracks.carAtConstantSpeed(2400, 15, 8, 10, 200), Set.of("car"));
        assertThat(tracks).hasSize(1);
    }

    @Test
    void separatesTwoCarsGoingOppositeWays() {
        List<FrameDetections> frames = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            double t = i / 15.0;
            frames.add(new FrameDetections(i + 1, t, List.of(
                    new Detection("car", 0.9, new BoundingBox(100 + 300 * t, 200, 280 + 300 * t, 260)),
                    new Detection("car", 0.9, new BoundingBox(1000 - 300 * t, 400, 1180 - 300 * t, 470)))));
        }
        List<Track> tracks = tracker.track(frames, Set.of("car"));
        assertThat(tracks).hasSize(2);
        assertThat(tracks.get(0).movingRight()).isNotEqualTo(tracks.get(1).movingRight());
    }

    @Test
    void ignoresLabelsThatAreNotVehicles() {
        List<FrameDetections> frames = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            frames.add(new FrameDetections(i + 1, i / 15.0, List.of(
                    new Detection("person", 0.9, new BoundingBox(100, 100, 140, 220)))));
        }
        assertThat(tracker.track(frames, Set.of("car", "truck"))).isEmpty();
    }
}
