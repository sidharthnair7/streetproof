package streetproof.streetproof.study;

public record SampleClip(
        String name,
        String title,
        String credit,
        boolean ready,
        RunRequest preset
) {
}
