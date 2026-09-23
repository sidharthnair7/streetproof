package streetproof.streetproof.detection;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DetectionParserTest {

    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void readsClsConfXyxy() {
        List<Detection> detections = DetectionParser.parse(json.readTree(
                "{\"ok\":true,\"result\":{\"detections\":[{\"cls\":\"car\",\"conf\":0.91,\"xyxy\":[10,20,110,80]}]}}"));
        assertThat(detections).hasSize(1);
        assertThat(detections.getFirst().label()).isEqualTo("car");
        assertThat(detections.getFirst().box().width()).isEqualTo(100);
    }

    @Test
    void readsNumericCocoClassesAndObjectBoxes() {
        List<Detection> detections = DetectionParser.parse(json.readTree(
                "[{\"class\":7,\"confidence\":0.8,\"bbox\":{\"x1\":1,\"y1\":2,\"x2\":3,\"y2\":4}}]"));
        assertThat(detections.getFirst().label()).isEqualTo("truck");
    }

    @Test
    void readsDetectionsHiddenInsideAJsonString() {
        List<Detection> detections = DetectionParser.parse(json.readTree(
                "{\"output\":\"[{\\\"name\\\":\\\"bus\\\",\\\"score\\\":0.7,\\\"box\\\":[0,0,5,5]}]\"}"));
        assertThat(detections).extracting(Detection::label).containsExactly("bus");
    }
}
