package streetproof.streetproof.detection;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class DetectionParser {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private static final Map<Integer, String> COCO_IDS = Map.of(
            0, "person",
            1, "bicycle",
            2, "car",
            3, "motorcycle",
            5, "bus",
            7, "truck"
    );

    private DetectionParser() {
    }

    public static List<Detection> parse(JsonNode node) {
        List<Detection> out = new ArrayList<>();
        collect(node, out, 0);
        return out;
    }

    private static void collect(JsonNode node, List<Detection> out, int depth) {
        if (node == null || node.isMissingNode() || node.isNull() || depth > 12) {
            return;
        }
        if (node.isObject()) {
            Optional<Detection> self = toDetection(node);
            if (self.isPresent()) {
                out.add(self.get());
                return;
            }
            for (var entry : node.properties()) {
                collect(entry.getValue(), out, depth + 1);
            }
            return;
        }
        if (node.isArray()) {
            for (JsonNode child : node.values()) {
                collect(child, out, depth + 1);
            }
            return;
        }
        if (node.isString()) {
            String text = node.asString().trim();
            if (text.startsWith("{") || text.startsWith("[")) {
                try {
                    collect(JSON.readTree(text), out, depth + 1);
                } catch (RuntimeException ignored) {
                }
            }
        }
    }

    private static Optional<Detection> toDetection(JsonNode node) {
        JsonNode box = firstPresent(node, "xyxy", "bbox", "box");
        JsonNode confidence = firstPresent(node, "conf", "confidence", "score");
        JsonNode label = firstPresent(node, "cls", "class", "label", "name", "class_name");
        if (box == null || confidence == null || label == null) {
            return Optional.empty();
        }
        Optional<BoundingBox> parsed = toBox(box);
        if (parsed.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new Detection(toLabel(label), confidence.asDouble(), parsed.get()));
    }

    private static Optional<BoundingBox> toBox(JsonNode box) {
        if (box.isArray() && box.size() >= 4) {
            return Optional.of(new BoundingBox(
                    box.path(0).asDouble(), box.path(1).asDouble(),
                    box.path(2).asDouble(), box.path(3).asDouble()));
        }
        if (box.isObject()) {
            JsonNode x1 = firstPresent(box, "x1", "xmin", "left");
            JsonNode y1 = firstPresent(box, "y1", "ymin", "top");
            JsonNode x2 = firstPresent(box, "x2", "xmax", "right");
            JsonNode y2 = firstPresent(box, "y2", "ymax", "bottom");
            if (x1 != null && y1 != null && x2 != null && y2 != null) {
                return Optional.of(new BoundingBox(x1.asDouble(), y1.asDouble(), x2.asDouble(), y2.asDouble()));
            }
        }
        return Optional.empty();
    }

    private static String toLabel(JsonNode label) {
        if (label.isNumber()) {
            return COCO_IDS.getOrDefault(label.asInt(), "class-" + label.asInt());
        }
        return label.asString().trim().toLowerCase();
    }

    private static JsonNode firstPresent(JsonNode node, String... names) {
        for (String name : names) {
            JsonNode value = node.get(name);
            if (value != null && !value.isNull()) {
                return value;
            }
        }
        return null;
    }
}
