package streetproof.streetproof.graph;

import org.springframework.stereotype.Service;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.gate.Verdict;
import streetproof.streetproof.study.Study;
import streetproof.streetproof.study.StudyRepository;
import streetproof.streetproof.study.StudyStatus;
import streetproof.streetproof.study.StudySummary;
import streetproof.streetproof.study.VehicleView;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class GraphService {

    private final StudyRepository repository;
    private final StreetProofProperties properties;

    public GraphService(StudyRepository repository, StreetProofProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    public GraphView forStudy(Study study) {
        Builder graph = new Builder();
        addStudy(graph, study);
        return graph.build();
    }

    public GraphView everything() {
        Builder graph = new Builder();
        for (Study study : repository.all()) {
            if (study.status() == StudyStatus.DONE) {
                addStudy(graph, study);
            }
        }
        return graph.build();
    }

    private void addStudy(Builder graph, Study study) {
        StudySummary summary = study.analysis().summary();
        String studyId = "study:" + study.id();
        Map<String, Object> studyData = new LinkedHashMap<>();
        studyData.put("v85Kmh", summary.v85Kmh());
        studyData.put("vehiclesProven", summary.vehiclesProven());
        studyData.put("vehiclesObserved", summary.vehiclesObserved());
        studyData.put("shareOverLimit", summary.shareOverLimit());
        studyData.put("postedLimitKmh", summary.postedLimitKmh());
        graph.node(studyId, "study", study.view().sourceName(), study.group(), summary.v85Kmh(), null, studyData);

        String detector = "capability:yolo-detect";
        graph.node(detector, "capability", "Livepeer yolo-detect", "livepeer", null, null, Map.of());
        graph.link(studyId, detector, "detectedWith");

        if (study.calibrationUal() != null) {
            String memory = "calibrationAsset:" + study.calibrationUal();
            graph.node(memory, "knowledgeAsset", "Calibration memory", "dkg", null, null, Map.of("ual", study.calibrationUal()));
            graph.link(studyId, memory, "calibratedWith");
        } else if (study.calibration() != null) {
            String calibration = "calibration:" + study.id();
            graph.node(calibration, "calibration", study.calibration().mode().name() + " · " + study.calibration().metres() + " m", "rule", null, null, Map.of());
            graph.link(studyId, calibration, "calibratedBy");
        }

        String gate = "gate:rules";
        Map<String, Object> rules = new LinkedHashMap<>();
        rules.put("minCleanFrames", properties.gate().minCleanFrames());
        rules.put("minRSquared", properties.gate().minRSquared());
        rules.put("minRSquaredApproach", properties.gate().minRSquaredApproach());
        rules.put("maxWidthVariation", properties.gate().maxWidthVariation());
        rules.put("minConfidence", properties.gate().minConfidence());
        graph.node(gate, "gate", "Refusal gate", "rule", null, null, rules);
        graph.link(studyId, gate, "judgedBy");

        if (study.streetLabel() != null && !study.streetLabel().isBlank()) {
            String street = "street:" + study.streetLabel().toLowerCase().replaceAll("[^a-z0-9]+", "-");
            graph.node(street, "street", study.streetLabel(), "street", null, null, Map.of());
            graph.link(street, studyId, "studiedIn");
        }

        if (study.published() != null) {
            String asset = "asset:" + study.published().ual();
            Map<String, Object> assetData = new LinkedHashMap<>();
            assetData.put("ual", study.published().ual());
            assetData.put("network", study.published().network());
            graph.node(asset, "knowledgeAsset", "Knowledge Asset", "dkg", null, null, assetData);
            graph.link(studyId, asset, "publishedAs");
        }

        for (Verdict verdict : study.verdicts()) {
            VehicleView vehicle = VehicleView.of(study.id(), verdict, study.postedLimitKmh(), study.knownKmh());
            String vehicleId = "vehicle:" + study.id() + ":" + verdict.trackId();
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("trackId", vehicle.trackId());
            data.put("kmh", vehicle.kmh());
            data.put("proven", vehicle.proven());
            data.put("overLimit", vehicle.overLimit());
            data.put("direction", vehicle.direction());
            data.put("firstSeenSeconds", vehicle.firstSeenSeconds());
            data.put("detail", vehicle.detail());
            String group = !vehicle.proven() ? "refused" : vehicle.overLimit() ? "over-limit" : "proven";
            String label = vehicle.proven() ? vehicle.kmh() + " km/h" : "refused";
            graph.node(vehicleId, "vehicle", label, group, vehicle.kmh(), vehicle.thumbnailUrl(), data);
            graph.link(studyId, vehicleId, "observed");
            if (!vehicle.proven()) {
                String reason = "reason:" + vehicle.reason();
                graph.node(reason, "reason", vehicle.reasonMeaning(), "refused", null, null, Map.of("code", vehicle.reason()));
                graph.link(vehicleId, reason, "refusedBecause");
            }
        }
    }

    private static final class Builder {
        private final Map<String, GraphView.Node> nodes = new LinkedHashMap<>();
        private final Set<GraphView.Link> links = new LinkedHashSet<>();

        void node(String id, String type, String label, String group, Double value, String imageUrl, Map<String, Object> data) {
            nodes.putIfAbsent(id, new GraphView.Node(id, type, label, group, value, imageUrl, data));
        }

        void link(String source, String target, String relation) {
            links.add(new GraphView.Link(source, target, relation));
        }

        GraphView build() {
            return new GraphView(new ArrayList<>(nodes.values()), new ArrayList<>(links));
        }
    }
}
