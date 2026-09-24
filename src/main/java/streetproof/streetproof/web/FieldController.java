package streetproof.streetproof.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import streetproof.streetproof.field.DetectionField;
import streetproof.streetproof.field.FieldService;

@RestController
@RequestMapping("/api")
public class FieldController {

    private final FieldService field;

    public FieldController(FieldService field) {
        this.field = field;
    }

    @GetMapping("/field")
    public DetectionField field() {
        return field.field();
    }
}
