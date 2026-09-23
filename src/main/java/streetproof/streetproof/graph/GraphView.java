package streetproof.streetproof.graph;

import java.util.List;
import java.util.Map;

public record GraphView(List<Node> nodes, List<Link> links) {

    public record Node(String id, String type, String label, String group, Double value, String imageUrl, Map<String, Object> data) {
    }

    public record Link(String source, String target, String relation) {
    }
}
