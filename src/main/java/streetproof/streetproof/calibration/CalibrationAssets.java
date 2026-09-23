package streetproof.streetproof.calibration;

import streetproof.streetproof.ledger.StudyAsset;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class CalibrationAssets {

    public static final String NS = "https://streetproof.dev/ns#";
    private static final Pattern NUMBER = Pattern.compile("\"?(-?\\d+(?:\\.\\d+)?)");

    private CalibrationAssets() {
    }

    public static String subject(String id) {
        return "urn:streetproof:calibration:" + id;
    }

    public static String assetName(String id) {
        return "streetproof-calibration-" + id;
    }

    public static StudyAsset build(CalibrationRecord record) {
        String subject = subject(record.id());
        Map<String, Object> jsonLd = new LinkedHashMap<>();
        jsonLd.put("@context", "https://schema.org/");
        jsonLd.put("@id", subject);
        jsonLd.put("@type", "Dataset");
        jsonLd.put("name", "StreetProof camera calibration");
        jsonLd.put("description", "How to turn a camera's pixels into distance, learned from a vehicle driving past at a known speed.");
        jsonLd.put("cameraLabel", record.cameraLabel());
        jsonLd.put("mode", record.mode());
        jsonLd.put("focalPx", record.focalPx());
        jsonLd.put("frameWidth", record.frameWidth());
        jsonLd.put("frameHeight", record.frameHeight());
        jsonLd.put("derivedFromVideoSha256", record.derivedFromVideoSha256());
        jsonLd.put("knownKmh", record.knownKmh());
        jsonLd.put("vehicleHeightMetres", record.vehicleHeightMetres());
        jsonLd.put("dateCreated", record.createdAt().toString());

        StringBuilder t = new StringBuilder();
        t.append("@prefix schema: <https://schema.org/> .\n");
        t.append("@prefix sp: <").append(NS).append("> .\n\n");
        t.append('<').append(subject).append("> a schema:Dataset ;\n");
        t.append("  schema:name ").append(literal("StreetProof camera calibration")).append(" ;\n");
        t.append("  sp:cameraLabel ").append(literal(record.cameraLabel())).append(" ;\n");
        t.append("  sp:mode ").append(literal(record.mode())).append(" ;\n");
        t.append("  sp:focalPx ").append(decimal(record.focalPx())).append(" ;\n");
        t.append("  sp:frameWidth ").append(record.frameWidth()).append(" ;\n");
        t.append("  sp:frameHeight ").append(record.frameHeight()).append(" ;\n");
        t.append("  sp:derivedFromVideoSha256 ").append(literal(record.derivedFromVideoSha256())).append(" ;\n");
        t.append("  sp:knownKmh ").append(decimal(record.knownKmh())).append(" ;\n");
        t.append("  sp:vehicleHeightMetres ").append(decimal(record.vehicleHeightMetres())).append(" .\n");
        return new StudyAsset(subject, assetName(record.id()), jsonLd, t.toString());
    }

    public static String sparqlFor(String id) {
        return "SELECT ?p ?o WHERE { GRAPH ?g { <" + subject(id) + "> ?p ?o } }";
    }

    public static Optional<Double> numberAfter(String text, String predicate) {
        String token = NS + predicate;
        int at = text.indexOf(token);
        if (at < 0) {
            token = "sp:" + predicate;
            at = text.indexOf(token);
        }
        if (at < 0) {
            return Optional.empty();
        }
        Matcher m = NUMBER.matcher(text.substring(at + token.length()));
        return m.find() ? Optional.of(Double.parseDouble(m.group(1))) : Optional.empty();
    }

    private static String literal(String value) {
        return '"' + (value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"")) + '"';
    }

    private static String decimal(double value) {
        return String.format(Locale.ROOT, "\"%s\"^^<http://www.w3.org/2001/XMLSchema#decimal>", value);
    }
}
