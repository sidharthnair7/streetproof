package streetproof.streetproof.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.ledger.KnowledgePublisher;
import streetproof.streetproof.livepeer.LivepeerClient;
import streetproof.streetproof.video.FfmpegService;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final FfmpegService ffmpeg;
    private final LivepeerClient livepeer;
    private final KnowledgePublisher publisher;
    private final StreetProofProperties properties;

    public HealthController(FfmpegService ffmpeg, LivepeerClient livepeer, KnowledgePublisher publisher, StreetProofProperties properties) {
        this.ffmpeg = ffmpeg;
        this.livepeer = livepeer;
        this.publisher = publisher;
        this.properties = properties;
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ffmpeg", ffmpeg.available());
        out.put("livepeerKeySet", livepeer.hasApiKey());
        out.put("livepeerEndpoint", properties.livepeer().endpoint());
        out.put("knowledgeMode", publisher.mode());
        out.put("workDir", properties.workDir().toString());
        out.put("sampleFps", properties.sampleFps());
        return out;
    }
}
