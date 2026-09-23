package streetproof.streetproof.ledger;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface KnowledgePublisher {

    PublishedRecord publish(String studyId, String videoSha256, String streetLabel, StudyAsset asset);

    Optional<String> recordedVideoSha256(String ual);

    List<Map<String, Object>> historyFor(String streetLabel);

    PublishedRecord publishCalibration(streetproof.streetproof.calibration.CalibrationRecord record, StudyAsset asset);

    Optional<String> fetchCalibration(String reference);

    List<streetproof.streetproof.calibration.CalibrationRecord> calibrations();

    String mode();
}
