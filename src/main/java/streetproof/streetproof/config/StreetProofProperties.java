package streetproof.streetproof.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Path;
import java.util.List;

@ConfigurationProperties("streetproof")
public record StreetProofProperties(
        Path workDir,
        Path samplesDir,
        String ffmpegPath,
        double sampleFps,
        int maxFrames,
        double defaultPostedLimitKmh,
        List<String> corsOrigins,
        Livepeer livepeer,
        Tracking tracking,
        Gate gate,
        Dkg dkg
) {

    public record Dkg(
            String mode,
            String cliPath,
            String contextGraph,
            int timeoutSeconds
    ) {
        public boolean usesCli() {
            return "cli".equalsIgnoreCase(mode);
        }
    }

    public record Livepeer(
            String endpoint,
            String apiKey,
            int timeoutSeconds,
            int concurrency,
            int maxRetries,
            double costPerDetectionUsd
    ) {
        public boolean hasApiKey() {
            return apiKey != null && !apiKey.isBlank();
        }
    }

    public record Tracking(
            double minIou,
            int maxMissedFrames,
            int minTrackFrames,
            List<String> vehicleLabels
    ) {
    }

    public record Gate(
            int minCleanFrames,
            double minRSquared,
            double minRSquaredApproach,
            double maxWidthVariation,
            double minConfidence,
            double minKmh,
            double maxKmh,
            int edgeMarginPx
    ) {
    }
}
