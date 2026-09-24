package streetproof.streetproof.calibration;

import org.springframework.stereotype.Service;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.ledger.Locators;
import streetproof.streetproof.ledger.KnowledgePublisher;
import streetproof.streetproof.ledger.PublishedRecord;
import streetproof.streetproof.ledger.StudyAssetBuilder;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.speed.SpeedEstimator;
import streetproof.streetproof.study.Study;
import streetproof.streetproof.study.StudyRepository;
import streetproof.streetproof.study.StudyStatus;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.util.Hashing;
import streetproof.streetproof.web.NotFoundException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class CalibrationService {

    public static final double TYPICAL_CAR_HEIGHT_METRES = 1.5;

    private final StudyRepository studies;
    private final KnowledgePublisher publisher;
    private final StudyAssetBuilder assets;
    private final StreetProofProperties properties;

    public CalibrationService(StudyRepository studies, KnowledgePublisher publisher, StudyAssetBuilder assets,
                              StreetProofProperties properties) {
        this.studies = studies;
        this.publisher = publisher;
        this.assets = assets;
        this.properties = properties;
    }

    public CalibrationRecord create(CalibrationRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Send one pass (studyId, knownKmh, vehicleHeightMetres) or a list of passes");
        }
        List<CalibrationPass> passes = request.allPasses();
        List<Study> passStudies = new ArrayList<>();
        List<Track> tracks = new ArrayList<>();
        List<Double> focals = new ArrayList<>();
        int width = 0;
        int height = 0;
        for (CalibrationPass pass : passes) {
            if (pass == null || pass.studyId() == null || pass.knownKmh() == null || pass.vehicleHeightMetres() == null) {
                throw new IllegalArgumentException("Every pass needs studyId, knownKmh and vehicleHeightMetres");
            }
            Study study = studies.find(pass.studyId())
                    .orElseThrow(() -> new NotFoundException("No study with id " + pass.studyId()));
            if (study.status() != StudyStatus.DONE) {
                throw new IllegalArgumentException("Run study " + study.id() + " first; calibration learns from its tracked vehicle");
            }
            Track track = study.tracks().stream()
                    .filter(t -> pass.trackId() == null || t.id() == pass.trackId())
                    .max(Comparator.comparingInt(t -> t.points().size()))
                    .orElseThrow(() -> new IllegalArgumentException("Study " + study.id() + " has no vehicle track to learn from"));
            if (width == 0) {
                width = study.frameWidth();
                height = study.frameHeight();
            }
            double focal = SpeedEstimator.focalFromKnownSpeed(track, pass.knownKmh(), pass.vehicleHeightMetres(),
                    study.frameWidth(), study.frameHeight(), properties.gate().edgeMarginPx());
            focals.add(focal * width / (double) study.frameWidth());
            passStudies.add(study);
            tracks.add(track);
        }

        double focal = CalibrationMath.median(focals);
        List<Double> deviations = CalibrationMath.deviationsPercent(focals, focal);
        for (int i = 0; i < deviations.size(); i++) {
            if (Math.abs(deviations.get(i)) > CalibrationMath.MAX_PASS_DISAGREEMENT_PERCENT) {
                throw new IllegalArgumentException(String.format(Locale.ROOT,
                        "Pass %d (%s) disagrees with the other passes by %.1f%%, more than the %.0f%% allowed. Check its known speed and vehicle height, or leave it out.",
                        i + 1, passStudies.get(i).view().sourceName(), deviations.get(i), CalibrationMath.MAX_PASS_DISAGREEMENT_PERCENT));
            }
        }

        List<CalibrationEvidence> evidence = new ArrayList<>();
        StringBuilder identity = new StringBuilder();
        for (int i = 0; i < passes.size(); i++) {
            Study study = passStudies.get(i);
            CalibrationPass pass = passes.get(i);
            identity.append(study.videoSha256()).append(':').append(tracks.get(i).id()).append(':').append(pass.knownKmh()).append(';');
            evidence.add(new CalibrationEvidence(study.id(), study.view().sourceName(), study.videoSha256(),
                    publishedUal(study), pass.knownKmh(), pass.vehicleHeightMetres(), tracks.get(i).id(),
                    Math.round(focals.get(i) * 10) / 10.0, deviations.get(i)));
        }

        Study first = passStudies.getFirst();
        CalibrationPass firstPass = passes.getFirst();
        String id = Hashing.sha256(identity.toString()).substring(0, 12);
        CalibrationRecord record = new CalibrationRecord(id,
                request.cameraLabel() == null || request.cameraLabel().isBlank() ? "camera " + id : request.cameraLabel(),
                Calibration.Mode.APPROACH.name(), Math.round(focal * 10) / 10.0,
                width, height, first.id(), first.videoSha256(),
                firstPass.knownKmh(), firstPass.vehicleHeightMetres(), tracks.getFirst().id(), Instant.now(), null, null,
                evidence, CalibrationMath.spreadPercent(focals, focal));
        PublishedRecord published = publisher.publishCalibration(record, CalibrationAssets.build(record));
        return record.withPublication(published.ual(), published.network());
    }

    private String publishedUal(Study study) {
        if (study.published() == null) {
            PublishedRecord record = publisher.publish(study.id(), study.videoSha256(), study.streetLabel(), assets.build(study));
            study.published(record);
            studies.save(study);
        }
        return study.published().ual();
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
                .filter(c -> Locators.sameAsset(reference, c.ual()) || reference.equals(c.id()))
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
                known.map(CalibrationRecord::network).orElse(publisher.mode()),
                known.map(CalibrationRecord::passes).orElse(null),
                known.map(CalibrationRecord::spreadPercent).orElse(null));
    }

    public Calibration toCalibration(CalibrationRecord record, Double vehicleHeightMetres, int frameWidth) {
        double height = vehicleHeightMetres == null || vehicleHeightMetres <= 0 ? TYPICAL_CAR_HEIGHT_METRES : vehicleHeightMetres;
        return Calibration.approach(height, Math.round(record.focalFor(frameWidth) * 10) / 10.0);
    }
}
