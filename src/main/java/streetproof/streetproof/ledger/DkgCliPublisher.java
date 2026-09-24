package streetproof.streetproof.ledger;

import streetproof.streetproof.calibration.CalibrationAssets;
import streetproof.streetproof.calibration.CalibrationRecord;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.util.Hashing;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DkgCliPublisher implements KnowledgePublisher {

    private static final Pattern CONTEXT_GRAPH_ID = Pattern.compile("ID:\\s+(\\S+)");
    private static final Pattern ASSERTION = Pattern.compile("Assertion URI:\\s+(did:dkg:\\S+)");
    private static final Pattern UAL = Pattern.compile("(did:dkg:\\S+)");
    private static final Pattern SHA = Pattern.compile("\\b([0-9a-f]{64})\\b");

    private final StreetProofProperties.Dkg config;
    private final Path assetsDir;
    private final LocalLedgerPublisher index;
    private volatile String contextGraphId;

    public DkgCliPublisher(StreetProofProperties.Dkg config, Path assetsDir, LocalLedgerPublisher index) {
        this.config = config;
        this.assetsDir = assetsDir;
        this.index = index;
    }

    @Override
    public PublishedRecord publish(String studyId, String videoSha256, String streetLabel, StudyAsset asset) {
        String graph = contextGraph();
        Path ttl = assetsDir.resolve(asset.name() + ".ttl");
        try {
            Files.createDirectories(assetsDir);
            Files.writeString(ttl, asset.turtle());
        } catch (IOException e) {
            throw new IllegalStateException("Could not write the knowledge asset file", e);
        }
        String output = run(List.of(config.cliPath(), "ka", "create", asset.name(), "-c", graph, "--input-file", ttl.toString(), "--share"));
        String locator = locator(output, graph, asset.name());
        index.publish(studyId, videoSha256, streetLabel, asset);
        return new PublishedRecord(locator, "OriginTrail DKG (shared working memory)", mode(), Instant.now(),
                Hashing.sha256(asset.turtle()), graph, tail(output));
    }

    @Override
    public Optional<String> recordedVideoSha256(String ual) {
        String sparql;
        if (ual.contains("streetproof-study-")) {
            String subject = "urn:streetproof:study:" + ual.substring(ual.indexOf("streetproof-study-") + "streetproof-study-".length());
            sparql = "SELECT ?sha WHERE { GRAPH ?g { <" + subject + "> <" + StudyAssetBuilder.SHA_PREDICATE + "> ?sha } } LIMIT 1";
        } else if (ual.startsWith("did:dkg:") && ual.contains("/_working_memory/")) {
            String graph = ual.replace("/_working_memory/", "/_shared_memory/");
            sparql = "SELECT ?sha WHERE { GRAPH <" + graph + "> { ?s <" + StudyAssetBuilder.SHA_PREDICATE + "> ?sha } } LIMIT 1";
        } else {
            return index.recordedVideoSha256(ual);
        }
        Matcher sha = SHA.matcher(query(sparql));
        return sha.find() ? Optional.of(sha.group(1)) : Optional.empty();
    }

    @Override
    public List<Map<String, Object>> historyFor(String streetLabel) {
        if (streetLabel == null || streetLabel.isBlank()) {
            return List.of();
        }
        String sparql = "SELECT ?s ?v85 WHERE { GRAPH ?g { ?s <https://schema.org/spatialCoverage> \"" + streetLabel.replace("\"", "")
                + "\" . OPTIONAL { ?s <https://streetproof.dev/ns#v85Kmh> ?v85 } } }";
        String output = query(sparql);
        List<Map<String, Object>> rows = new ArrayList<>();
        Matcher subject = Pattern.compile("(urn:streetproof:study:[\\w-]+)").matcher(output);
        while (subject.find()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("subject", subject.group(1));
            rows.add(row);
        }
        return rows.isEmpty() ? index.historyFor(streetLabel) : rows;
    }

    @Override
    public PublishedRecord publishCalibration(CalibrationRecord record, StudyAsset asset) {
        String graph = contextGraph();
        Path ttl = assetsDir.resolve(asset.name() + ".ttl");
        try {
            Files.createDirectories(assetsDir);
            Files.writeString(ttl, asset.turtle());
        } catch (IOException e) {
            throw new IllegalStateException("Could not write the calibration asset file", e);
        }
        String output = run(List.of(config.cliPath(), "ka", "create", asset.name(), "-c", graph, "--input-file", ttl.toString(), "--share"));
        String locator = locator(output, graph, asset.name());
        String network = "OriginTrail DKG (shared working memory)";
        index.writeCalibration(record.withPublication(locator, network), asset.turtle());
        return new PublishedRecord(locator, network, mode(), Instant.now(), Hashing.sha256(asset.turtle()), graph, tail(output));
    }

    @Override
    public Optional<String> fetchCalibration(String reference) {
        if (reference.startsWith("did:dkg:") && reference.contains("/_working_memory/")) {
            String graph = reference.replace("/_working_memory/", "/_shared_memory/");
            String direct = query("SELECT ?p ?o WHERE { GRAPH <" + graph + "> { ?s ?p ?o } }");
            if (direct.contains(CalibrationAssets.NS + "focalPx")) {
                return Optional.of(direct);
            }
        }
        Matcher named = Pattern.compile("calibration[-:]([A-Za-z0-9]+)").matcher(reference);
        String id = named.find() ? named.group(1) : index.calibrations().stream()
                .filter(c -> reference.equals(c.ual()) || reference.equals(c.id()))
                .map(CalibrationRecord::id)
                .findFirst().orElse(null);
        if (id == null) {
            return Optional.empty();
        }
        String output = query(CalibrationAssets.sparqlFor(id));
        return output.contains("focalPx") ? Optional.of(output) : Optional.empty();
    }

    @Override
    public List<CalibrationRecord> calibrations() {
        return index.calibrations();
    }

    @Override
    public String mode() {
        return "dkg-cli";
    }

    private String query(String sparql) {
        Path file;
        try {
            Path queries = assetsDir.resolve("queries");
            Files.createDirectories(queries);
            file = Files.createTempFile(queries, "query-", ".rq");
            Files.writeString(file, sparql);
        } catch (IOException e) {
            throw new IllegalStateException("Could not write the query file", e);
        }
        try {
            return run(List.of(config.cliPath(), "query", contextGraph(), "--include-shared-memory", "-f", file.toString()));
        } finally {
            try {
                Files.deleteIfExists(file);
            } catch (IOException ignored) {
            }
        }
    }

    private static String locator(String output, String graph, String name) {
        Matcher assertion = ASSERTION.matcher(output);
        if (assertion.find()) {
            return assertion.group(1);
        }
        Matcher ual = UAL.matcher(output);
        return ual.find() ? ual.group(1) : graph + "/" + name;
    }

    private String contextGraph() {
        if (contextGraphId != null) {
            return contextGraphId;
        }
        synchronized (this) {
            if (contextGraphId == null) {
                String list = run(List.of(config.cliPath(), "context-graph", "list"));
                Matcher existing = Pattern.compile("(\\S+/" + Pattern.quote(config.contextGraph()) + ")\\b").matcher(list);
                if (existing.find()) {
                    contextGraphId = existing.group(1);
                } else {
                    String created = run(List.of(config.cliPath(), "context-graph", "create", config.contextGraph()));
                    Matcher id = CONTEXT_GRAPH_ID.matcher(created);
                    if (!id.find()) {
                        throw new IllegalStateException("Could not read the context graph ID from: " + tail(created));
                    }
                    contextGraphId = id.group(1);
                }
            }
            return contextGraphId;
        }
    }

    private String run(List<String> command) {
        List<String> full = new ArrayList<>();
        if (System.getProperty("os.name", "").toLowerCase().contains("win")) {
            full.add("cmd");
            full.add("/c");
        }
        full.addAll(command);
        try {
            Process process = new ProcessBuilder(full).redirectErrorStream(true).start();
            String output;
            try (InputStream in = process.getInputStream()) {
                output = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }
            if (!process.waitFor(config.timeoutSeconds(), TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IllegalStateException("The dkg command timed out: " + String.join(" ", command));
            }
            if (process.exitValue() != 0) {
                throw new IllegalStateException("The dkg command failed: " + tail(output));
            }
            return output;
        } catch (IOException e) {
            throw new IllegalStateException("Could not run the dkg CLI at " + config.cliPath(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while running the dkg CLI", e);
        }
    }

    private static String tail(String output) {
        String trimmed = output.strip();
        return trimmed.length() <= 600 ? trimmed : trimmed.substring(trimmed.length() - 600);
    }
}
