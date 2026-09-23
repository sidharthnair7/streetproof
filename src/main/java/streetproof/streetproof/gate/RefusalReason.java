package streetproof.streetproof.gate;

public enum RefusalReason {
    NO_CALIBRATION("No calibration, so no distance on the road is known"),
    NO_FRAME_RATE("The frame rate is unknown, so no time between frames is known"),
    TOO_FEW_CLEAN_FRAMES("Not enough frames with the whole vehicle inside the picture"),
    UNSTEADY_MOTION("The movement is not a steady line: braking, occlusion or a tracking switch"),
    UNSTABLE_BOX("The vehicle's box keeps changing size: two vehicles merged or one was partly hidden"),
    LOW_CONFIDENCE("The detector was not confident this is a vehicle"),
    IMPLAUSIBLE_SPEED("The speed is outside what a street vehicle can do"),
    POOR_CONDITIONS("The footage conditions make measurement unreliable");

    private final String meaning;

    RefusalReason(String meaning) {
        this.meaning = meaning;
    }

    public String meaning() {
        return meaning;
    }
}
