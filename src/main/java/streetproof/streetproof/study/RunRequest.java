package streetproof.streetproof.study;

import streetproof.streetproof.speed.Calibration;

public record RunRequest(
        Calibration calibration,
        Double postedLimitKmh,
        Double sampleFps,
        Double knownKmh,
        String streetLabel,
        String group,
        Boolean checkConditions,
        String calibrationRef,
        Double vehicleHeightMetres
) {
}
