package streetproof.streetproof.web;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import streetproof.streetproof.verify.VerifyResult;
import streetproof.streetproof.verify.VerifyService;

import java.io.IOException;
import java.util.Locale;

@RestController
@RequestMapping("/api")
public class VerifyController {

    private final VerifyService verifier;

    public VerifyController(VerifyService verifier) {
        this.verifier = verifier;
    }

    @PostMapping(value = "/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public VerifyResult verify(@RequestParam("file") MultipartFile file,
                               @RequestParam(value = "ual", required = false) String ual) throws IOException {
        return verifier.verify(file, ual);
    }

    @PostMapping(value = "/verify/hash", consumes = MediaType.APPLICATION_JSON_VALUE)
    public VerifyResult verifyHash(@RequestBody HashRequest request) {
        if (request == null || request.sha256() == null || !request.sha256().matches("(?i)[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Send sha256 as 64 hex characters");
        }
        return verifier.verify(request.sha256().toLowerCase(Locale.ROOT), request.ual());
    }

    public record HashRequest(String sha256, String ual) {
    }
}
