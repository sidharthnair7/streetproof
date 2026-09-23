package streetproof.streetproof.ledger;

import streetproof.streetproof.calibration.CalibrationRecord;
import streetproof.streetproof.util.Hashing;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

public class LocalLedgerPublisher implements KnowledgePublisher {

    private final Path ledgerDir;
    private final JsonMapper json = JsonMapper.builder().build();

    public LocalLedgerPublisher(Path ledgerDir) {
        this.ledgerDir = ledgerDir;
    }

    @Override
    public PublishedRecord publish(String studyId, String videoSha256, String streetLabel, StudyAsset asset) {
        String body = json.writeValueAsString(asset.jsonLd());
        String assetSha = Hashing.sha256(body);
        String ual = "local:streetproof:" + assetSha.substring(0, 24);
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("ual", ual);
        entry.put("studyId", studyId);
        entry.put("videoSha256", videoSha256);
        entry.put("streetLabel", streetLabel);
        entry.put("publishedAt", Instant.now().toString());
        entry.put("asset", asset.jsonLd());
        try {
            Files.createDirectories(ledgerDir);
            Files.writeString(ledgerDir.resolve(assetSha.substring(0, 24) + ".json"), json.writeValueAsString(entry));
        } catch (IOException e) {
            throw new IllegalStateException("Could not write to the local ledger", e);
        }
        return new PublishedRecord(ual, "local ledger (not the DKG)", mode(), Instant.now(), assetSha, null,
                "written to " + ledgerDir.getFileName());
    }

    @Override
    public Optional<String> recordedVideoSha256(String ual) {
        return entries().stream()
                .filter(e -> ual.equals(e.path("ual").asString("")))
                .map(e -> e.path("videoSha256").asString(""))
                .findFirst();
    }

    @Override
    public List<Map<String, Object>> historyFor(String streetLabel) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (streetLabel == null || streetLabel.isBlank()) {
            return out;
        }
        for (JsonNode entry : entries()) {
            if (streetLabel.equalsIgnoreCase(entry.path("streetLabel").asString(""))) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("ual", entry.path("ual").asString(""));
                row.put("publishedAt", entry.path("publishedAt").asString(""));
                row.put("v85Kmh", entry.path("asset").path("v85Kmh").asDouble(0));
                row.put("vehiclesProven", entry.path("asset").path("vehiclesProven").asInt(0));
                out.add(row);
            }
        }
        return out;
    }

    @Override
    public PublishedRecord publishCalibration(CalibrationRecord record, StudyAsset asset) {
        String ual = "local:streetproof:calibration:" + record.id();
        writeCalibration(record.withPublication(ual, "local ledger (not the DKG)"), asset.turtle());
        return new PublishedRecord(ual, "local ledger (not the DKG)", mode(), Instant.now(), Hashing.sha256(asset.turtle()), null,
                "written to " + ledgerDir.getFileName() + "/calibrations");
    }

    public void writeCalibration(CalibrationRecord record, String turtle) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("record", record);
        entry.put("turtle", turtle);
        try {
            Files.createDirectories(ledgerDir.resolve("calibrations"));
            Files.writeString(ledgerDir.resolve("calibrations").resolve(record.id() + ".json"), json.writeValueAsString(entry));
        } catch (IOException e) {
            throw new IllegalStateException("Could not write the calibration to the local ledger", e);
        }
    }

    @Override
    public Optional<String> fetchCalibration(String reference) {
        return calibrationEntries().stream()
                .filter(e -> reference.equals(e.path("record").path("ual").asString(""))
                        || reference.equals(e.path("record").path("id").asString("")))
                .map(e -> e.path("turtle").asString(""))
                .findFirst();
    }

    @Override
    public List<CalibrationRecord> calibrations() {
        List<CalibrationRecord> out = new ArrayList<>();
        for (JsonNode entry : calibrationEntries()) {
            out.add(json.treeToValue(entry.path("record"), CalibrationRecord.class));
        }
        out.sort(java.util.Comparator.comparing(CalibrationRecord::createdAt).reversed());
        return out;
    }

    private List<JsonNode> calibrationEntries() {
        Path dir = ledgerDir.resolve("calibrations");
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        try (Stream<Path> files = Files.list(dir)) {
            List<JsonNode> out = new ArrayList<>();
            for (Path file : files.filter(f -> f.toString().endsWith(".json")).toList()) {
                out.add(json.readTree(Files.readString(file)));
            }
            return out;
        } catch (IOException e) {
            throw new IllegalStateException("Could not read calibrations", e);
        }
    }

    @Override
    public String mode() {
        return "local";
    }

    private List<JsonNode> entries() {
        if (!Files.isDirectory(ledgerDir)) {
            return List.of();
        }
        try (Stream<Path> files = Files.list(ledgerDir)) {
            List<JsonNode> out = new ArrayList<>();
            for (Path file : files.filter(f -> f.toString().endsWith(".json")).toList()) {
                out.add(json.readTree(Files.readString(file)));
            }
            return out;
        } catch (IOException e) {
            throw new IllegalStateException("Could not read the local ledger", e);
        }
    }
}
