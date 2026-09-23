package streetproof.streetproof.ledger;

import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.gate.Verdict;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.study.Study;
import streetproof.streetproof.study.StudySummary;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class StudyAssetBuilder {

    public static final String SHA_PREDICATE = "https://schema.org/sha256";

    private final StreetProofProperties.Gate rules;

    public StudyAssetBuilder(StreetProofProperties.Gate rules) {
        this.rules = rules;
    }

    public StudyAsset build(Study study) {
        String subject = "urn:streetproof:study:" + study.id();
        StudySummary summary = study.analysis().summary();
        boolean approach = study.calibration() != null && study.calibration().mode() == Calibration.Mode.APPROACH;
        double minFit = approach ? rules.minRSquaredApproach() : rules.minRSquared();

        Map<String, Object> thresholds = new LinkedHashMap<>();
        thresholds.put("minCleanFrames", rules.minCleanFrames());
        thresholds.put("minRSquared", minFit);
        thresholds.put("maxWidthVariation", rules.maxWidthVariation());
        thresholds.put("minConfidence", rules.minConfidence());
        thresholds.put("plausibleKmh", List.of(rules.minKmh(), rules.maxKmh()));

        List<Map<String, Object>> vehicles = new ArrayList<>();
        for (Verdict verdict : study.verdicts()) {
            Map<String, Object> vehicle = new LinkedHashMap<>();
            vehicle.put("@id", subject + ":vehicle:" + verdict.trackId());
            vehicle.put("@type", "Observation");
            vehicle.put("result", verdict.proven() ? "proven" : "refused");
            if (verdict.proven()) {
                vehicle.put("speedKmh", verdict.kmh());
            } else {
                vehicle.put("refusalReason", verdict.reason().name());
            }
            vehicles.add(vehicle);
        }

        Map<String, Object> jsonLd = new LinkedHashMap<>();
        jsonLd.put("@context", "https://schema.org/");
        jsonLd.put("@id", subject);
        jsonLd.put("@type", "Dataset");
        jsonLd.put("name", "StreetProof speed study");
        jsonLd.put("dateCreated", Instant.now().toString());
        jsonLd.put("sha256", study.videoSha256());
        if (study.streetLabel() != null && !study.streetLabel().isBlank()) {
            jsonLd.put("spatialCoverage", study.streetLabel());
        }
        jsonLd.put("variableMeasured", "vehicle speed, km/h");
        jsonLd.put("measurementTechnique", "Livepeer yolo-detect on every frame, IoU tracking, "
                + (approach ? "head-on box growth with a known vehicle height" : "side-on distance calibration") + ", deterministic refusal gate");
        jsonLd.put("calibration", study.calibration() == null ? "none" : study.calibration().mode().name() + " " + study.calibration().metres() + " m");
        if (study.calibrationUal() != null) {
            jsonLd.put("calibratedWith", study.calibrationUal());
        }
        jsonLd.put("sampleFps", study.sampleFps());
        jsonLd.put("postedLimitKmh", summary.postedLimitKmh());
        jsonLd.put("vehiclesObserved", summary.vehiclesObserved());
        jsonLd.put("vehiclesProven", summary.vehiclesProven());
        jsonLd.put("v85Kmh", summary.v85Kmh());
        jsonLd.put("medianKmh", summary.medianKmh());
        jsonLd.put("shareOverLimit", summary.shareOverLimit());
        jsonLd.put("gateThresholds", thresholds);
        jsonLd.put("hasPart", vehicles);

        return new StudyAsset(subject, "streetproof-study-" + study.id(), jsonLd, turtle(subject, study, summary, vehicles, minFit));
    }

    private String turtle(String subject, Study study, StudySummary summary, List<Map<String, Object>> vehicles, double minFit) {
        StringBuilder t = new StringBuilder();
        t.append("@prefix schema: <https://schema.org/> .\n");
        t.append("@prefix sp: <https://streetproof.dev/ns#> .\n\n");
        t.append('<').append(subject).append("> a schema:Dataset ;\n");
        t.append("  schema:name ").append(literal("StreetProof speed study")).append(" ;\n");
        t.append("  <").append(SHA_PREDICATE).append("> ").append(literal(study.videoSha256())).append(" ;\n");
        if (study.streetLabel() != null && !study.streetLabel().isBlank()) {
            t.append("  schema:spatialCoverage ").append(literal(study.streetLabel())).append(" ;\n");
        }
        if (study.calibration() != null) {
            t.append("  sp:calibrationMode ").append(literal(study.calibration().mode().name())).append(" ;\n");
            t.append("  sp:calibrationMetres ").append(number(study.calibration().metres())).append(" ;\n");
        }
        if (study.calibrationUal() != null) {
            t.append("  sp:calibratedWith ").append(literal(study.calibrationUal())).append(" ;\n");
        }
        t.append("  sp:sampleFps ").append(number(study.sampleFps())).append(" ;\n");
        t.append("  sp:postedLimitKmh ").append(number(summary.postedLimitKmh())).append(" ;\n");
        t.append("  sp:vehiclesObserved ").append(summary.vehiclesObserved()).append(" ;\n");
        t.append("  sp:vehiclesProven ").append(summary.vehiclesProven()).append(" ;\n");
        if (summary.v85Kmh() != null) {
            t.append("  sp:v85Kmh ").append(number(summary.v85Kmh())).append(" ;\n");
        }
        if (summary.shareOverLimit() != null) {
            t.append("  sp:shareOverLimit ").append(number(summary.shareOverLimit())).append(" ;\n");
        }
        t.append("  sp:minCleanFrames ").append(rules.minCleanFrames()).append(" ;\n");
        t.append("  sp:minRSquared ").append(number(minFit)).append(" ;\n");
        t.append("  sp:detector ").append(literal("livepeer:yolo-detect")).append(" .\n");
        for (Map<String, Object> vehicle : vehicles) {
            t.append('\n').append('<').append(vehicle.get("@id")).append("> a schema:Observation ;\n");
            t.append("  sp:partOf <").append(subject).append("> ;\n");
            if (vehicle.containsKey("speedKmh")) {
                t.append("  sp:speedKmh ").append(number((Double) vehicle.get("speedKmh"))).append(" ;\n");
                t.append("  sp:result ").append(literal("proven")).append(" .\n");
            } else {
                t.append("  sp:refusalReason ").append(literal(String.valueOf(vehicle.get("refusalReason")))).append(" ;\n");
                t.append("  sp:result ").append(literal("refused")).append(" .\n");
            }
        }
        return t.toString();
    }

    private static String literal(String value) {
        return '"' + value.replace("\\", "\\\\").replace("\"", "\\\"") + '"';
    }

    private static String number(double value) {
        return String.format(Locale.ROOT, "\"%s\"^^<http://www.w3.org/2001/XMLSchema#decimal>", value);
    }
}
