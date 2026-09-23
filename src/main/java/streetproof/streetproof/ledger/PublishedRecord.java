package streetproof.streetproof.ledger;

import java.time.Instant;

public record PublishedRecord(
        String ual,
        String network,
        String mode,
        Instant publishedAt,
        String assetSha256,
        String contextGraph,
        String evidence
) {
}
