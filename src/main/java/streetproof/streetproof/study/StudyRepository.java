package streetproof.streetproof.study;

import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class StudyRepository {

    private final Map<String, Study> studies = new ConcurrentHashMap<>();
    private final JsonMapper json = JsonMapper.builder().build();

    public void add(Study study) {
        studies.put(study.id(), study);
    }

    public Optional<Study> find(String id) {
        return Optional.ofNullable(studies.get(id));
    }

    public Optional<Study> findByVideoSha(String sha256) {
        return studies.values().stream().filter(s -> s.videoSha256().equals(sha256)).findFirst();
    }

    public List<Study> all() {
        return studies.values().stream().sorted(Comparator.comparing(Study::id).reversed()).toList();
    }

    public void save(Study study) {
        try {
            Files.writeString(study.dir().resolve("study.json"), json.writeValueAsString(study.view()));
        } catch (IOException | RuntimeException e) {
            study.conditionsNote("could not save study.json: " + e.getMessage());
        }
    }
}
