package streetproof.streetproof.video;

import org.springframework.stereotype.Component;
import streetproof.streetproof.config.StreetProofProperties;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Component
public class FfmpegService {

    private static final Pattern DURATION = Pattern.compile("Duration: (\\d+):(\\d+):(\\d+(?:\\.\\d+)?)");
    private static final Pattern VIDEO_STREAM = Pattern.compile("Video: .*?(\\d{2,5})x(\\d{2,5}).*?(\\d+(?:\\.\\d+)?) fps");

    private static final String SCALE = "scale='min(1280,iw)':-2";

    private final String ffmpeg;

    public FfmpegService(StreetProofProperties properties) {
        this.ffmpeg = properties.ffmpegPath();
    }

    public boolean available() {
        try {
            Process process = new ProcessBuilder(ffmpeg, "-version").redirectErrorStream(true).start();
            process.getInputStream().readAllBytes();
            return process.waitFor() == 0;
        } catch (IOException e) {
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    public VideoInfo probe(Path video) {
        String output = run(List.of(ffmpeg, "-hide_banner", "-i", video.toString()), true);
        Matcher duration = DURATION.matcher(output);
        Matcher stream = VIDEO_STREAM.matcher(output);
        if (!stream.find()) {
            throw new IllegalArgumentException("That file has no readable video stream");
        }
        double seconds = 0;
        if (duration.find()) {
            seconds = Integer.parseInt(duration.group(1)) * 3600
                    + Integer.parseInt(duration.group(2)) * 60
                    + Double.parseDouble(duration.group(3));
        }
        return new VideoInfo(seconds, Double.parseDouble(stream.group(3)),
                Integer.parseInt(stream.group(1)), Integer.parseInt(stream.group(2)));
    }

    public Path extractFirstFrame(Path video, Path out) {
        run(List.of(ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", video.toString(),
                "-vf", SCALE, "-frames:v", "1", "-q:v", "3", out.toString()), false);
        return out;
    }

    public List<Path> extractFrames(Path video, double fps, Path outDir) {
        try {
            Files.createDirectories(outDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create " + outDir, e);
        }
        String filter = fps > 0 ? "fps=" + fps + "," + SCALE : SCALE;
        run(List.of(ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", video.toString(),
                "-vf", filter, "-q:v", "3", outDir.resolve("%05d.jpg").toString()), false);
        try (Stream<Path> files = Files.list(outDir)) {
            return files.filter(p -> p.getFileName().toString().endsWith(".jpg")).sorted().toList();
        } catch (IOException e) {
            throw new IllegalStateException("Could not list frames in " + outDir, e);
        }
    }

    public Path encode(Path framesDir, double fps, Path out) {
        run(List.of(ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-framerate", String.valueOf(fps), "-i", framesDir.resolve("%05d.jpg").toString(),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", out.toString()), false);
        return out;
    }

    private String run(List<String> command, boolean tolerateFailure) {
        ProcessBuilder builder = new ProcessBuilder(new ArrayList<>(command)).redirectErrorStream(true);
        try {
            Process process = builder.start();
            String output;
            try (InputStream in = process.getInputStream()) {
                output = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }
            if (!process.waitFor(10, TimeUnit.MINUTES)) {
                process.destroyForcibly();
                throw new IllegalStateException("ffmpeg timed out");
            }
            if (process.exitValue() != 0 && !tolerateFailure) {
                throw new IllegalStateException("ffmpeg failed: " + output.lines().reduce((a, b) -> b).orElse(""));
            }
            return output;
        } catch (IOException e) {
            throw new IllegalStateException("Could not run ffmpeg at " + ffmpeg, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while running ffmpeg", e);
        }
    }
}
