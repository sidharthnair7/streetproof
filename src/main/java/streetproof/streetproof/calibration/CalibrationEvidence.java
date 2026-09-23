package streetproof.streetproof.calibration;

public record CalibrationEvidence(
        String studyId,
        String clip,
        String videoSha256,
        String studyUal,
        double knownKmh,
        double vehicleHeightMetres,
        int trackId,
        double focalPx,
        double deviationPercent
) {
}
