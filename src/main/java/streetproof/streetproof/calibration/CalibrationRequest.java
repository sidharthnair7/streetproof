package streetproof.streetproof.calibration;

public record CalibrationRequest(
        String studyId,
        Double knownKmh,
        Double vehicleHeightMetres,
        String cameraLabel,
        Integer trackId
) {
}
