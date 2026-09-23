package streetproof.streetproof.calibration;

import java.time.Instant;
import java.util.List;

public record CalibrationRecord(
        String id,
        String cameraLabel,
        String mode,
        double focalPx,
        int frameWidth,
        int frameHeight,
        String derivedFromStudy,
        String derivedFromVideoSha256,
        double knownKmh,
        double vehicleHeightMetres,
        int trackId,
        Instant createdAt,
        String ual,
        String network,
        List<CalibrationEvidence> passes,
        Double spreadPercent
) {

    public CalibrationRecord withPublication(String ual, String network) {
        return new CalibrationRecord(id, cameraLabel, mode, focalPx, frameWidth, frameHeight, derivedFromStudy,
                derivedFromVideoSha256, knownKmh, vehicleHeightMetres, trackId, createdAt, ual, network, passes, spreadPercent);
    }

    public double focalFor(int width) {
        return width <= 0 || frameWidth <= 0 ? focalPx : focalPx * width / (double) frameWidth;
    }

    public int passCount() {
        return passes == null || passes.isEmpty() ? 1 : passes.size();
    }
}
