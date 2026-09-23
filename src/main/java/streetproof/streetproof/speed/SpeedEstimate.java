package streetproof.streetproof.speed;

public record SpeedEstimate(
        int trackId,
        String label,
        int totalFrames,
        int cleanFrames,
        double firstSeenSeconds,
        double lastSeenSeconds,
        double kmh,
        double rSquared,
        double widthVariation,
        double medianConfidence,
        double metresPerPixel,
        boolean movingRight
) {
}
