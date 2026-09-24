package streetproof.streetproof.field;

import java.util.List;

public record DetectionField(
        int detections,
        List<StudyEntry> studies,
        List<VehicleEntry> vehicles,
        Points points
) {

    public record StudyEntry(
            String id,
            String clip,
            String street,
            String group,
            boolean calibrated,
            String calibrationUal,
            String ual,
            double postedLimitKmh,
            Double knownKmh,
            int frameWidth,
            int frameHeight
    ) {
    }

    public record VehicleEntry(
            int study,
            int trackId,
            String group,
            Double kmh,
            String reason,
            String reasonMeaning,
            String detail,
            String direction,
            double medianConfidence,
            Double errorPercent,
            String thumbnailUrl,
            int detections
    ) {
    }

    public record Points(
            int[] vehicle,
            int[] frame,
            double[] t,
            double[] confidence,
            double[] x,
            double[] y,
            double[] w,
            double[] h
    ) {
    }
}
