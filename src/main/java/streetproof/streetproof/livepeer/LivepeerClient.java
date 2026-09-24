package streetproof.streetproof.livepeer;

import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.detection.Detection;
import streetproof.streetproof.detection.DetectionParser;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class LivepeerClient {

    private final StreetProofProperties.Livepeer config;
    private final RestClient http;
    private final RestClient files;
    private final JsonMapper json = JsonMapper.builder().build();
    private final AtomicLong requestIds = new AtomicLong();

    public LivepeerClient(StreetProofProperties properties) {
        this.config = properties.livepeer();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).followRedirects(HttpClient.Redirect.NORMAL).build());
        factory.setReadTimeout(Duration.ofSeconds(config.timeoutSeconds() + 30L));
        RestClient.Builder builder = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(config.endpoint())
                .defaultHeader("Accept", "application/json, text/event-stream");
        if (config.hasApiKey()) {
            builder.defaultHeader("Authorization", "Bearer " + config.apiKey());
        }
        this.http = builder.build();
        this.files = RestClient.builder().requestFactory(factory).build();
    }

    public boolean hasApiKey() {
        return config.hasApiKey();
    }

    public String upload(byte[] bytes, String mimeType, String filename) {
        Map<String, Object> arguments = new LinkedHashMap<>();
        arguments.put("data", Base64.getEncoder().encodeToString(bytes));
        arguments.put("mime_type", mimeType);
        arguments.put("filename", filename);
        JsonNode result = callTool("upload", arguments);
        String url = result.path("url").asString("");
        if (url.isBlank()) {
            throw new LivepeerException("Upload returned no URL", true, "no_url");
        }
        return url;
    }

    public List<Detection> detect(String imageUrl) {
        Map<String, Object> arguments = new LinkedHashMap<>();
        arguments.put("capability", "yolo-detect");
        arguments.put("source_url", imageUrl);
        arguments.put("timeout", config.timeoutSeconds());
        JsonNode result = callTool("run_capability", arguments);
        if (result.has("detections")) {
            return DetectionParser.parse(result.path("detections"));
        }
        String sidecar = result.path("url").asString("");
        if (sidecar.endsWith(".json")) {
            try {
                String body = files.get().uri(URI.create(sidecar)).retrieve().body(String.class);
                if (body == null || body.isBlank()) {
                    throw new LivepeerException("The detections file was empty", true, "sidecar_empty");
                }
                return DetectionParser.parse(json.readTree(body));
            } catch (RestClientException e) {
                throw new LivepeerException("Could not read the detections file: " + e.getMessage(), true, "sidecar");
            }
        }
        return DetectionParser.parse(result);
    }

    public String askAboutImage(String imageUrl, String question) {
        Map<String, Object> arguments = new LinkedHashMap<>();
        arguments.put("capability", "nemotron-omni-vision");
        arguments.put("source_url", imageUrl);
        arguments.put("prompt", question);
        arguments.put("timeout", 30);
        JsonNode result = callTool("run_capability", arguments);
        for (JsonNode node : List.of(result, result.path("result"), result.path("output"))) {
            for (String field : List.of("text", "output", "answer", "result")) {
                JsonNode value = node.path(field);
                if (value.isString()) {
                    return value.asString();
                }
            }
        }
        return result.toString();
    }

    public JsonNode costReport() {
        return callTool("get_cost_report", Map.of());
    }

    public JsonNode callTool(String tool, Map<String, Object> arguments) {
        Map<String, Object> body = Map.of(
                "jsonrpc", "2.0",
                "id", requestIds.incrementAndGet(),
                "method", "tools/call",
                "params", Map.of("name", tool, "arguments", arguments));
        String raw;
        try {
            raw = http.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(json.writeValueAsString(body))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            throw new LivepeerException("Livepeer request failed: " + e.getMessage(), true, "transport");
        }
        JsonNode envelope = json.readTree(unwrapEventStream(raw));
        if (envelope.has("error")) {
            throw new LivepeerException(envelope.path("error").path("message").asString("Livepeer error"), false, "rpc_error");
        }
        JsonNode result = envelope.path("result");
        JsonNode structured = result.path("structuredContent");
        if (result.path("isError").asBoolean(false)) {
            String message = structured.path("error").asString(firstText(result));
            throw new LivepeerException(message, structured.path("retryable").asBoolean(false), structured.path("code").asString("tool_error"));
        }
        return structured.isMissingNode() || structured.isNull() ? result : structured;
    }

    private static String firstText(JsonNode result) {
        for (JsonNode content : result.path("content").values()) {
            if (content.has("text")) {
                return content.path("text").asString();
            }
        }
        return "Livepeer tool error";
    }

    static String unwrapEventStream(String raw) {
        if (raw == null) {
            return "{}";
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("{")) {
            return trimmed;
        }
        String last = "{}";
        for (String line : trimmed.split("\\R")) {
            if (line.startsWith("data:")) {
                last = line.substring(5).trim();
            }
        }
        return last;
    }
}
