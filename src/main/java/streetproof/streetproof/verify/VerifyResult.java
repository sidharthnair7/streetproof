package streetproof.streetproof.verify;

import streetproof.streetproof.study.StudySummary;

public record VerifyResult(
        Outcome outcome,
        String message,
        String uploadedSha256,
        String recordedSha256,
        String ual,
        String studyId,
        StudySummary summary
) {

    public enum Outcome {
        MATCH,
        MISMATCH,
        NO_RECORD
    }
}
