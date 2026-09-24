package streetproof.streetproof.study;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import streetproof.streetproof.config.StreetProofProperties;
import tools.jackson.core.json.JsonReadFeature;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

@Component
public class StudyRepository {

    private static final String STATE_FILE = "state.json";

    private final Map<String, Study> studies = new ConcurrentHashMap<>();
    private final JsonMapper json = JsonMapper.builder().enable(JsonReadFeature.ALLOW_NON_NUMERIC_NUMBERS).build();

    @Autowired
    public StudyRepository(StreetProofProperties properties) {
        this(properties.workDir().resolve("studies"));
    }

    StudyRepository(Path studiesRoot) {
        load(studiesRoot);
    }

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
            Path state = study.dir().resolve(STATE_FILE);
            Path temp = study.dir().resolve(STATE_FILE + ".tmp");
            Files.writeString(temp, json.writeValueAsString(study.snapshot()));
            Files.move(temp, state, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException | RuntimeException e) {
            study.conditionsNote("could not save the study: " + e.getMessage());
        }
    }

    public int size() {
        return studies.size();
    }

    private void load(Path root) {
        if (!Files.isDirectory(root)) {
            return;
        }
        try (Stream<Path> dirs = Files.list(root)) {
            dirs.filter(Files::isDirectory).forEach(dir -> {
                Path state = dir.resolve(STATE_FILE);
                if (!Files.isRegularFile(state)) {
                    return;
                }
                try {
                    StudySnapshot snapshot = json.readValue(Files.readString(state), StudySnapshot.class);
                    if (snapshot.id() != null && snapshot.videoFile() != null && Files.isRegularFile(dir.resolve(snapshot.videoFile()))) {
                        studies.put(snapshot.id(), Study.restore(snapshot, dir));
                    }
                } catch (IOException | RuntimeException ignored) {
                }
            });
        } catch (IOException ignored) {
        }
    }
}
