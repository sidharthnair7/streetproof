package streetproof.streetproof.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import streetproof.streetproof.calibration.CalibrationRecord;
import streetproof.streetproof.calibration.CalibrationRequest;
import streetproof.streetproof.calibration.CalibrationService;

import java.util.List;

@RestController
@RequestMapping("/api/calibrations")
public class CalibrationController {

    private final CalibrationService calibrations;

    public CalibrationController(CalibrationService calibrations) {
        this.calibrations = calibrations;
    }

    @PostMapping
    public CalibrationRecord create(@RequestBody CalibrationRequest request) {
        return calibrations.create(request);
    }

    @GetMapping
    public List<CalibrationRecord> list() {
        return calibrations.list();
    }

    @GetMapping("/resolve")
    public CalibrationRecord resolve(@RequestParam("ref") String reference) {
        return calibrations.resolve(reference);
    }
}
