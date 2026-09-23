package streetproof.streetproof.verify;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import streetproof.streetproof.ledger.KnowledgePublisher;
import streetproof.streetproof.study.Study;
import streetproof.streetproof.study.StudyRepository;
import streetproof.streetproof.util.Hashing;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;

@Service
public class VerifyService {

    private final StudyRepository repository;
    private final KnowledgePublisher publisher;

    public VerifyService(StudyRepository repository, KnowledgePublisher publisher) {
        this.repository = repository;
        this.publisher = publisher;
    }

    public VerifyResult verify(MultipartFile file, String ual) throws IOException {
        Path temp = Files.createTempFile("streetproof-verify-", ".bin");
        try {
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, temp, StandardCopyOption.REPLACE_EXISTING);
            }
            return verify(Hashing.sha256(temp), ual);
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    public VerifyResult verify(String uploadedSha, String ual) {
        Optional<Study> byVideo = repository.findByVideoSha(uploadedSha);
        if (ual != null && !ual.isBlank()) {
            Optional<String> recorded = publisher.recordedVideoSha256(ual.trim());
            if (recorded.isEmpty()) {
                return new VerifyResult(VerifyResult.Outcome.NO_RECORD, "No published study was found at that locator.",
                        uploadedSha, null, ual, null, null);
            }
            if (!recorded.get().equals(uploadedSha)) {
                return new VerifyResult(VerifyResult.Outcome.MISMATCH,
                        "This video is not the one the study was published for. It was edited, re-encoded or swapped.",
                        uploadedSha, recorded.get(), ual, null, null);
            }
            return new VerifyResult(VerifyResult.Outcome.MATCH,
                    "This is exactly the video the published study measured.",
                    uploadedSha, recorded.get(), ual, byVideo.map(Study::id).orElse(null),
                    byVideo.map(s -> s.analysis() == null ? null : s.analysis().summary()).orElse(null));
        }
        return byVideo
                .filter(s -> s.published() != null)
                .map(s -> new VerifyResult(VerifyResult.Outcome.MATCH, "This video matches a published study.",
                        uploadedSha, s.videoSha256(), s.published().ual(), s.id(), s.analysis().summary()))
                .orElseGet(() -> new VerifyResult(VerifyResult.Outcome.NO_RECORD,
                        "No published study was made from this exact video.", uploadedSha, null, null, null, null));
    }
}
