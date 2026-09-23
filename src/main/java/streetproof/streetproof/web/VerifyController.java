package streetproof.streetproof.web;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import streetproof.streetproof.verify.VerifyResult;
import streetproof.streetproof.verify.VerifyService;

import java.io.IOException;

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
}
