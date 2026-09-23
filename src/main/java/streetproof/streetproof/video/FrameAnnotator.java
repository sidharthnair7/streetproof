package streetproof.streetproof.video;

import streetproof.streetproof.detection.BoundingBox;
import streetproof.streetproof.gate.Verdict;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.tracking.TrackPoint;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class FrameAnnotator {

    private static final Color PROVEN = new Color(0x3DDC84);
    private static final Color REFUSED = new Color(0xFF5A4F);
    private static final Color PANEL = new Color(0, 0, 0, 170);

    public void render(List<Path> frames, List<Track> tracks, Map<Integer, Verdict> verdicts, double postedLimitKmh, Path outDir) {
        Map<Integer, List<Mark>> byFrame = new HashMap<>();
        for (Track track : tracks) {
            Verdict verdict = verdicts.get(track.id());
            if (verdict == null) {
                continue;
            }
            List<TrackPoint> seen = new ArrayList<>();
            for (TrackPoint point : track.points()) {
                seen.add(point);
                byFrame.computeIfAbsent(point.frameIndex(), k -> new ArrayList<>())
                        .add(new Mark(track.id(), point.box(), verdict, List.copyOf(seen)));
            }
        }
        try {
            Files.createDirectories(outDir);
            for (int i = 0; i < frames.size(); i++) {
                BufferedImage image = ImageIO.read(frames.get(i).toFile());
                Graphics2D g = image.createGraphics();
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                int unit = Math.max(12, image.getWidth() / 70);
                for (Mark mark : byFrame.getOrDefault(i + 1, List.of())) {
                    draw(g, mark, unit, postedLimitKmh);
                }
                banner(g, image.getWidth(), unit);
                g.dispose();
                ImageIO.write(image, "jpg", outDir.resolve(String.format(Locale.ROOT, "%05d.jpg", i + 1)).toFile());
            }
        } catch (IOException e) {
            throw new IllegalStateException("Could not annotate frames", e);
        }
    }

    public void thumbnail(Path frame, BoundingBox box, Path out) {
        try {
            BufferedImage image = ImageIO.read(frame.toFile());
            int pad = (int) (box.width() * 0.12);
            int x = clamp((int) box.x1() - pad, 0, image.getWidth() - 1);
            int y = clamp((int) box.y1() - pad, 0, image.getHeight() - 1);
            int w = clamp((int) box.width() + pad * 2, 1, image.getWidth() - x);
            int h = clamp((int) box.height() + pad * 2, 1, image.getHeight() - y);
            Files.createDirectories(out.getParent());
            ImageIO.write(image.getSubimage(x, y, w, h), "jpg", out.toFile());
        } catch (IOException e) {
            throw new IllegalStateException("Could not write thumbnail " + out, e);
        }
    }

    private void draw(Graphics2D g, Mark mark, int unit, double postedLimitKmh) {
        Verdict verdict = mark.verdict();
        Color color = verdict.proven() ? PROVEN : REFUSED;
        BoundingBox box = mark.box();
        g.setColor(new Color(color.getRed(), color.getGreen(), color.getBlue(), 150));
        g.setStroke(new BasicStroke(Math.max(2f, unit / 6f), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        for (int i = 1; i < mark.trail().size(); i++) {
            BoundingBox a = mark.trail().get(i - 1).box();
            BoundingBox b = mark.trail().get(i).box();
            g.drawLine((int) a.centerX(), (int) a.y2(), (int) b.centerX(), (int) b.y2());
        }
        g.setColor(color);
        g.setStroke(new BasicStroke(Math.max(2f, unit / 5f)));
        g.drawRect((int) box.x1(), (int) box.y1(), (int) box.width(), (int) box.height());
        String text = verdict.proven()
                ? String.format(Locale.ROOT, "#%d  %.1f km/h%s", mark.trackId(), verdict.kmh(), verdict.kmh() > postedLimitKmh ? "  OVER" : "")
                : String.format(Locale.ROOT, "#%d  refused: %s", mark.trackId(), verdict.detail());
        label(g, text, (int) box.x1(), (int) box.y1(), unit, color);
    }

    private void label(Graphics2D g, String text, int x, int y, int unit, Color color) {
        g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, unit));
        FontMetrics metrics = g.getFontMetrics();
        int width = metrics.stringWidth(text) + unit;
        int height = metrics.getHeight() + unit / 3;
        int top = Math.max(0, y - height - 2);
        g.setColor(PANEL);
        g.fillRoundRect(x, top, width, height, unit / 2, unit / 2);
        g.setColor(color);
        g.drawString(text, x + unit / 2, top + metrics.getAscent() + unit / 6);
    }

    private void banner(Graphics2D g, int width, int unit) {
        String text = "StreetProof  ·  detection by Livepeer yolo-detect  ·  green = proven, red = refused";
        g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, Math.max(11, unit * 3 / 4)));
        FontMetrics metrics = g.getFontMetrics();
        g.setColor(PANEL);
        g.fillRect(0, 0, width, metrics.getHeight() + unit / 2);
        g.setColor(Color.WHITE);
        g.drawString(text, unit / 2, metrics.getAscent() + unit / 4);
    }

    private static int clamp(int value, int low, int high) {
        return Math.max(low, Math.min(high, value));
    }

    private record Mark(int trackId, BoundingBox box, Verdict verdict, List<TrackPoint> trail) {
    }
}
