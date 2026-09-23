package streetproof.streetproof.tracking;

import streetproof.streetproof.detection.BoundingBox;
import streetproof.streetproof.detection.Detection;
import streetproof.streetproof.detection.FrameDetections;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

public class IouTracker {

    private final double minIou;
    private final int maxMissedFrames;
    private final int minTrackFrames;

    public IouTracker(double minIou, int maxMissedFrames, int minTrackFrames) {
        this.minIou = minIou;
        this.maxMissedFrames = maxMissedFrames;
        this.minTrackFrames = minTrackFrames;
    }

    public List<Track> track(List<FrameDetections> frames, Set<String> labels) {
        List<Growing> active = new ArrayList<>();
        List<Growing> finished = new ArrayList<>();
        int nextId = 1;
        List<FrameDetections> ordered = frames.stream().sorted(Comparator.comparingInt(FrameDetections::index)).toList();
        for (FrameDetections frame : ordered) {
            List<Detection> detections = frame.detections().stream()
                    .filter(d -> labels.isEmpty() || labels.contains(d.label()))
                    .toList();
            List<Pair> pairs = new ArrayList<>();
            for (int t = 0; t < active.size(); t++) {
                Growing track = active.get(t);
                BoundingBox expected = track.predict(frame.index());
                for (int d = 0; d < detections.size(); d++) {
                    BoundingBox candidate = detections.get(d).box();
                    double iou = expected.iou(candidate);
                    if (iou >= minIou) {
                        pairs.add(new Pair(t, d, iou));
                    } else if (track.points.size() == 1 && sameLaneNearby(expected, candidate)) {
                        pairs.add(new Pair(t, d, minIou / 2));
                    }
                }
            }
            pairs.sort(Comparator.comparingDouble(Pair::iou).reversed());
            boolean[] trackTaken = new boolean[active.size()];
            boolean[] detectionTaken = new boolean[detections.size()];
            for (Pair pair : pairs) {
                if (trackTaken[pair.track()] || detectionTaken[pair.detection()]) {
                    continue;
                }
                trackTaken[pair.track()] = true;
                detectionTaken[pair.detection()] = true;
                active.get(pair.track()).add(point(frame, detections.get(pair.detection())));
            }
            List<Growing> stillActive = new ArrayList<>();
            for (int t = 0; t < active.size(); t++) {
                Growing track = active.get(t);
                if (!trackTaken[t]) {
                    track.missed++;
                }
                if (track.missed > maxMissedFrames) {
                    finished.add(track);
                } else {
                    stillActive.add(track);
                }
            }
            for (int d = 0; d < detections.size(); d++) {
                if (!detectionTaken[d]) {
                    stillActive.add(new Growing(nextId++, detections.get(d).label(), point(frame, detections.get(d))));
                }
            }
            active = stillActive;
        }
        finished.addAll(active);
        return finished.stream()
                .filter(g -> g.points.size() >= minTrackFrames)
                .sorted(Comparator.comparingInt(g -> g.id))
                .map(g -> new Track(g.id, g.label, List.copyOf(g.points)))
                .toList();
    }

    static boolean sameLaneNearby(BoundingBox a, BoundingBox b) {
        double overlapY = Math.max(0, Math.min(a.y2(), b.y2()) - Math.max(a.y1(), b.y1()));
        double unionY = Math.max(a.y2(), b.y2()) - Math.min(a.y1(), b.y1());
        double sizeRatio = b.width() / Math.max(1, a.width());
        double gap = Math.abs(b.centerX() - a.centerX());
        return unionY > 0 && overlapY / unionY >= 0.6
                && sizeRatio >= 0.7 && sizeRatio <= 1.4
                && gap <= 1.2 * a.width();
    }

    private static TrackPoint point(FrameDetections frame, Detection detection) {
        return new TrackPoint(frame.index(), frame.timeSeconds(), detection.box(), detection.confidence());
    }

    private record Pair(int track, int detection, double iou) {
    }

    private static final class Growing {
        private final int id;
        private final String label;
        private final List<TrackPoint> points = new ArrayList<>();
        private int missed;

        private Growing(int id, String label, TrackPoint first) {
            this.id = id;
            this.label = label;
            this.points.add(first);
        }

        private void add(TrackPoint point) {
            points.add(point);
            missed = 0;
        }

        private BoundingBox predict(int frameIndex) {
            TrackPoint last = points.getLast();
            if (points.size() < 2) {
                return last.box();
            }
            TrackPoint previous = points.get(points.size() - 2);
            double step = Math.max(1, last.frameIndex() - previous.frameIndex());
            double ahead = (frameIndex - last.frameIndex()) / step;
            BoundingBox a = previous.box();
            BoundingBox b = last.box();
            return new BoundingBox(
                    b.x1() + (b.x1() - a.x1()) * ahead,
                    b.y1() + (b.y1() - a.y1()) * ahead,
                    b.x2() + (b.x2() - a.x2()) * ahead,
                    b.y2() + (b.y2() - a.y2()) * ahead);
        }
    }
}
