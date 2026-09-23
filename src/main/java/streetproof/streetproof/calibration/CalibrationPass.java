package streetproof.streetproof.calibration;

public record CalibrationPass(
        String studyId,
        Double knownKmh,
        Double vehicleHeightMetres,
        Integer trackId
) {
}
