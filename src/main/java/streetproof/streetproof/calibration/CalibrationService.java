package streetproof.streetproof.calibration;

import org.springframework.stereotype.Service;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.ledger.KnowledgePublisher;
import streetproof.streetproof.ledger.PublishedRecord;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.speed.SpeedEstimator;
import streetproof.streetproof.study.Study;
import streetproof.streetproof.study.StudyRepository;
import streetproof.streetproof.study.StudyStatus;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.util.Hashing;
import streetproof.streetproof.web.NotFoundException;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class CalibrationService {

    public static final double TYPICAL_CAR_HEIGHT_METRES = 1.5;

    private final StudyRepository studies;
    private final KnowledgePublisher publisher;
    private final StreetProofProperties properties;

    public CalibrationService(StudyRepository studies, KnowledgePublisher publisher, StreetProofProperties properties) {
        this.studies = studies;
        this.publisher = publisher;
        this.properties = properties;
    }

    public CalibrationRecord create(CalibrationRequest request) {
        if (request == null || request.studyId() == null || request.knownKmh() == null || request.vehicleHeightMetres() == null) {
            throw new IllegalArgumentException("Send studyId, knownKmh and vehicleHeightMetres");
        }
        Study study = studies.find(request.studyId())
                .orElseThrow(() -> new NotFoundException("No study with id " + request.studyId()));
        if (study.status() != StudyStatus.DONE) {
            throw new IllegalArgumentException("Run the study first; calibration learns from its tracked vehicle");
        }
        Track track = study.tracks().stream()
                .filter(t -> request.trackId() == null || t.id() == request.trackId())
                .max(Comparator.comparingInt(t -> t.points().size()))
                .orElseThrow(() -> new IllegalArgumentException("No vehicle track to learn from"));
        double focal = SpeedEstimator.focalFromKnownSpeed(track, request.knownKmh(), request.vehicleHeightMetres(),
                study.frameWidth(), study.frameHeight(), properties.gate().edgeMarginPx());
        String id = Hashing.sha256(study.videoSha256() + ":" + track.id() + ":" + request.knownKmh()).substring(0, 12);
        CalibrationRecord record = new CalibrationRecord(id,
                request.cameraLabel() == null || request.cameraLabel().isBlank() ? "camera " + id : request.cameraLabel(),
                Calibration.Mode.APPROACH.name(), Math.round(focal * 10) / 10.0,
                study.frameWidth(), study.frameHeight(), study.id(), study.videoSha256(),
                request.knownKmh(), request.vehicleHeightMetres(), track.id(), Instant.now(), null, null);
        PublishedRecord published = publisher.publishCalibration(record, CalibrationAssets.build(record));
        return record.withPublication(published.ual(), published.network());
    }

    public List<CalibrationRecord> list() {
        return publisher.calibrations();
    }

    public CalibrationRecord resolve(String reference) {
        String text = publisher.fetchCalibration(reference)
                .orElseThrow(() -> new NotFoundException("No calibration found for " + reference));
        double focal = CalibrationAssets.numberAfter(text, "focalPx")
                .orElseThrow(() -> new IllegalStateException("The calibration record has no focal length"));
        int width = CalibrationAssets.numberAfter(text, "frameWidth").map(Double::intValue).orElse(0);
        int height = CalibrationAssets.numberAfter(text, "frameHeight").map(Double::intValue).orElse(0);
        Optional<CalibrationRecord> known = list().stream()
                .filter(c -> reference.equals(c.ual()) || reference.equals(c.id()))
                .findFirst();
        return new CalibrationRecord(known.map(CalibrationRecord::id).orElse(reference),
                known.map(CalibrationRecord::cameraLabel).orElse(null),
                Calibration.Mode.APPROACH.name(), focal, width, height,
                known.map(CalibrationRecord::derivedFromStudy).orElse(null),
                known.map(CalibrationRecord::derivedFromVideoSha256).orElse(null),
                known.map(CalibrationRecord::knownKmh).orElse(0.0),
                known.map(CalibrationRecord::vehicleHeightMetres).orElse(0.0),
                known.map(CalibrationRecord::trackId).orElse(0),
                known.map(CalibrationRecord::createdAt).orElse(Instant.now()),
                known.map(CalibrationRecord::ual).orElse(reference),
                known.map(CalibrationRecord::network).orElse(publisher.mode()));
    }

    public Calibration toCalibration(CalibrationRecord record, Double vehicleHeightMetres, int frameWidth) {
        double height = vehicleHeightMetres == null || vehicleHeightMetres <= 0 ? TYPICAL_CAR_HEIGHT_METRES : vehicleHeightMetres;
        return Calibration.approach(height, Math.round(record.focalFor(frameWidth) * 10) / 10.0);
    }
}
