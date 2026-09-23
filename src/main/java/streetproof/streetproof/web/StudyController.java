package streetproof.streetproof.web;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import streetproof.streetproof.graph.GraphService;
import streetproof.streetproof.graph.GraphView;
import streetproof.streetproof.ledger.PublishedRecord;
import streetproof.streetproof.report.CityReportService;
import streetproof.streetproof.study.FocalRequest;
import streetproof.streetproof.study.RunRequest;
import streetproof.streetproof.study.SampleClip;
import streetproof.streetproof.study.SpeedAnalysis;
import streetproof.streetproof.study.Study;
import streetproof.streetproof.study.StudyService;
import streetproof.streetproof.study.StudyView;
import streetproof.streetproof.study.ValidationReport;
import streetproof.streetproof.study.VehicleView;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class StudyController {

    private final StudyService studies;
    private final GraphService graphs;
    private final CityReportService reports;

    public StudyController(StudyService studies, GraphService graphs, CityReportService reports) {
        this.studies = studies;
        this.graphs = graphs;
        this.reports = reports;
    }

    @GetMapping(value = "/studies/{id}/report", produces = MediaType.TEXT_HTML_VALUE)
    public String report(@PathVariable String id) {
        return reports.render(id);
    }

    @PostMapping(value = "/studies", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public StudyView upload(@RequestParam("file") MultipartFile file) throws IOException {
        return studies.upload(file);
    }

    @GetMapping("/studies")
    public List<StudyView> list() {
        return studies.list();
    }

    @GetMapping("/studies/{id}")
    public StudyView get(@PathVariable String id) {
        return studies.get(id);
    }

    @PostMapping("/studies/{id}/run")
    public StudyView run(@PathVariable String id, @RequestBody RunRequest request) {
        return studies.run(id, request);
    }

    @GetMapping("/studies/{id}/first-frame")
    public ResponseEntity<Resource> firstFrame(@PathVariable String id) {
        return file(studies.require(id).firstFrame(), MediaType.IMAGE_JPEG);
    }

    @GetMapping("/studies/{id}/source")
    public ResponseEntity<Resource> source(@PathVariable String id) {
        return file(studies.require(id).video(), MediaType.parseMediaType("video/mp4"));
    }

    @GetMapping("/studies/{id}/video")
    public ResponseEntity<Resource> video(@PathVariable String id) {
        Study study = studies.require(id);
        return file(study.annotatedVideo(), MediaType.parseMediaType("video/mp4"));
    }

    @GetMapping("/studies/{id}/vehicles")
    public List<VehicleView> vehicles(@PathVariable String id) {
        return studies.vehicles(id);
    }

    @GetMapping("/studies/{id}/vehicles/{trackId}/thumbnail")
    public ResponseEntity<Resource> thumbnail(@PathVariable String id, @PathVariable int trackId) {
        return file(studies.thumbnail(id, trackId), MediaType.IMAGE_JPEG);
    }

    @GetMapping("/studies/{id}/analysis")
    public SpeedAnalysis analysis(@PathVariable String id) {
        return studies.analysis(id);
    }

    @GetMapping("/studies/{id}/graph")
    public GraphView graph(@PathVariable String id) {
        studies.analysis(id);
        return graphs.forStudy(studies.require(id));
    }

    @GetMapping("/graph")
    public GraphView everything() {
        return graphs.everything();
    }

    @GetMapping("/studies/{id}/asset")
    public Map<String, Object> asset(@PathVariable String id) {
        return studies.asset(id);
    }

    @PostMapping("/studies/{id}/publish")
    public PublishedRecord publish(@PathVariable String id) {
        return studies.publish(id);
    }

    @PostMapping("/studies/{id}/calibrate-focal")
    public Map<String, Object> calibrateFocal(@PathVariable String id, @RequestBody FocalRequest request) {
        return studies.calibrateFocal(id, request);
    }

    @GetMapping("/studies/{id}/history")
    public List<Map<String, Object>> history(@PathVariable String id) {
        return studies.history(id);
    }

    @GetMapping("/validation")
    public ValidationReport validation() {
        return studies.validation();
    }

    @GetMapping("/samples")
    public List<SampleClip> samples() throws IOException {
        return studies.samples();
    }

    @PostMapping("/samples/{name}/study")
    public StudyView fromSample(@PathVariable String name) throws IOException {
        return studies.fromSample(name);
    }

    private static ResponseEntity<Resource> file(Path path, MediaType type) {
        if (!Files.isRegularFile(path)) {
            throw new NotFoundException("Not ready yet: " + path.getFileName());
        }
        return ResponseEntity.ok().contentType(type).body(new FileSystemResource(path));
    }
}
