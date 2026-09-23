package streetproof.streetproof.ledger;

import java.util.Map;

public record StudyAsset(String subject, String name, Map<String, Object> jsonLd, String turtle) {
}
