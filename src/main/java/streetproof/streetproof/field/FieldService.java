package streetproof.streetproof.field;

import org.springframework.stereotype.Service;
import streetproof.streetproof.gate.Verdict;
import streetproof.streetproof.study.Study;
import streetproof.streetproof.study.StudyRepository;
import streetproof.streetproof.study.StudyStatus;
import streetproof.streetproof.study.VehicleView;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.tracking.TrackPoint;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FieldService {

    private final StudyRepository repository;

    public FieldService(StudyRepository repository) {
        this.repository = repository;
    }

    public DetectionField field() {
        Map<String, Study> latest = new java.util.LinkedHashMap<>();
        for (Study study : repository.all()) {
            if (study.status() == StudyStatus.DONE) {
                latest.putIfAbsent(study.videoSha256() + ":" + (study.calibration() != null), study);
            }
        }
        List<Study> done = latest.values().stream()
                .sorted(Comparator.comparing((Study s) -> s.view().sourceName()).thenComparing(Study::id))
                .toList();
        List<DetectionField.StudyEntry> studies = new ArrayList<>();
        List<DetectionField.VehicleEntry> vehicles = new ArrayList<>();
        List<int[]> ints = new ArrayList<>();
        List<double[]> doubles = new ArrayList<>();
        for (Study study : done) {
            int studyIndex = studies.size();
            studies.add(new DetectionField.StudyEntry(study.id(), study.view().sourceName(), study.streetLabel(), study.group(),
                    study.calibration() != null, study.calibrationUal(),
                    study.published() == null ? null : study.published().ual(),
                    study.postedLimitKmh(), study.knownKmh(), study.frameWidth(), study.frameHeight()));
            Map<Integer, Verdict> verdicts = new HashMap<>();
            for (Verdict verdict : study.verdicts()) {
                verdicts.put(verdict.trackId(), verdict);
            }
            double width = Math.max(1, study.frameWidth());
            double height = Math.max(1, study.frameHeight());
            for (Track track : study.tracks()) {
                Verdict verdict = verdicts.get(track.id());
                if (verdict == null) {
                    continue;
                }
                VehicleView view = VehicleView.of(study.id(), verdict, study.postedLimitKmh(), study.knownKmh());
                String group = !view.proven() ? "refused" : view.overLimit() ? "over-limit" : "proven";
                int vehicleIndex = vehicles.size();
                vehicles.add(new DetectionField.VehicleEntry(studyIndex, track.id(), group, view.kmh(), view.reason(),
                        view.reasonMeaning(), view.detail(), view.direction(), view.medianConfidence(), view.errorPercent(),
                        view.thumbnailUrl(), track.points().size()));
                for (TrackPoint point : track.points()) {
                    ints.add(new int[]{vehicleIndex, point.frameIndex()});
                    doubles.add(new double[]{
                            round(point.timeSeconds(), 3),
                            round(point.confidence(), 3),
                            round(point.box().centerX() / width, 4),
                            round((point.box().y1() + point.box().y2()) / 2 / height, 4),
                            round(point.box().width() / width, 4),
                            round(point.box().height() / height, 4)});
                }
            }
        }
        int n = ints.size();
        int[] vehicle = new int[n];
        int[] frame = new int[n];
        double[] t = new double[n];
        double[] confidence = new double[n];
        double[] x = new double[n];
        double[] y = new double[n];
        double[] w = new double[n];
        double[] h = new double[n];
        for (int i = 0; i < n; i++) {
            vehicle[i] = ints.get(i)[0];
            frame[i] = ints.get(i)[1];
            double[] d = doubles.get(i);
            t[i] = d[0];
            confidence[i] = d[1];
            x[i] = d[2];
            y[i] = d[3];
            w[i] = d[4];
            h[i] = d[5];
        }
        return new DetectionField(n, studies, vehicles, new DetectionField.Points(vehicle, frame, t, confidence, x, y, w, h));
    }

    private static double round(double value, int decimals) {
        double scale = Math.pow(10, decimals);
        return Math.round(value * scale) / scale;
    }
}
