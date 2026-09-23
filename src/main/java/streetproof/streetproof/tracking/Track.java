package streetproof.streetproof.tracking;

import java.util.List;

public record Track(int id, String label, List<TrackPoint> points) {

    public TrackPoint first() {
        return points.getFirst();
    }

    public TrackPoint last() {
        return points.getLast();
    }

    public boolean movingRight() {
        return last().box().centerX() >= first().box().centerX();
    }
}
