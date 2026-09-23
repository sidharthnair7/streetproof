package streetproof.streetproof.calibration;

import java.util.List;

public record CalibrationRequest(
        String studyId,
        Double knownKmh,
        Double vehicleHeightMetres,
        String cameraLabel,
        Integer trackId,
        List<CalibrationPass> passes
) {

    public List<CalibrationPass> allPasses() {
        if (passes != null && !passes.isEmpty()) {
            return passes;
        }
        return List.of(new CalibrationPass(studyId, knownKmh, vehicleHeightMetres, trackId));
    }
}
