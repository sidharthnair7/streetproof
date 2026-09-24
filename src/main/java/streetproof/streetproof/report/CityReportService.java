package streetproof.streetproof.report;

import org.springframework.stereotype.Service;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.gate.RefusalReason;
import streetproof.streetproof.ledger.StudyAssetBuilder;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.study.SpeedAnalysis;
import streetproof.streetproof.study.Study;
import streetproof.streetproof.study.StudyService;
import streetproof.streetproof.study.StudyStatus;
import streetproof.streetproof.study.StudySummary;
import streetproof.streetproof.study.ValidationReport;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CityReportService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("MMMM d, yyyy, h:mm a", Locale.ENGLISH)
            .withZone(ZoneId.systemDefault());

    private final StudyService studies;
    private final StreetProofProperties properties;

    public CityReportService(StudyService studies, StreetProofProperties properties) {
        this.studies = studies;
        this.properties = properties;
    }

    public String render(String id) {
        Study study = studies.require(id);
        if (study.status() != StudyStatus.DONE || study.analysis() == null) {
            throw new IllegalArgumentException("The study has not finished, so there is nothing to report yet");
        }
        SpeedAnalysis analysis = study.analysis();
        StudySummary s = analysis.summary();
        String street = blank(study.streetLabel()) ? study.view().sourceName() : study.streetLabel();
        StringBuilder h = new StringBuilder();
        h.append("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">");
        h.append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
        h.append("<title>Speed study: ").append(esc(street)).append("</title><style>").append(CSS).append("</style></head><body><main>");

        h.append("<header><p class=\"kicker\">Neighbourhood speed study</p><h1>").append(esc(street)).append("</h1>");
        h.append("<p class=\"meta\">Measured ").append(DATE.format(study.view().createdAt()))
                .append(" &middot; ").append(fmt(study.videoInfo().durationSeconds(), 1)).append(" s of footage")
                .append(" &middot; posted limit ").append(fmt(s.postedLimitKmh(), 0)).append(" km/h</p></header>");

        h.append("<section class=\"finding\">").append(finding(s, analysis)).append("</section>");

        h.append("<section class=\"figures\">");
        figure(h, s.v85Kmh() == null ? "n/a" : fmt(s.v85Kmh(), 1) + " km/h", "85th percentile speed",
                "The speed 85% of measured drivers stayed at or under. Traffic engineers use it when reviewing a limit.");
        figure(h, s.medianKmh() == null ? "n/a" : fmt(s.medianKmh(), 1) + " km/h", "Median speed", "Half of measured drivers were faster, half slower.");
        figure(h, s.shareOverLimit() == null ? "n/a" : pct(s.shareOverLimit()), "Over the limit",
                analysis.shareOverLimitBy10() == null ? "" : pct(analysis.shareOverLimitBy10()) + " were more than 10 km/h over.");
        figure(h, s.vehiclesProven() + " of " + s.vehiclesObserved(), "Vehicles measured",
                s.vehiclesRefused() + " refused rather than guessed. See below.");
        h.append("</section>");

        h.append("<section><h2>Measured speeds</h2>").append(histogram(analysis.histogram(), s.postedLimitKmh())).append("</section>");

        h.append(warrant(s, analysis));

        h.append("<section><h2>Vehicles refused, and why</h2>");
        Map<String, Integer> refusals = analysis.refusalsByReason();
        if (refusals == null || refusals.isEmpty()) {
            h.append("<p>No vehicle was refused.</p>");
        } else {
            h.append("<p>StreetProof refuses to give a speed when the video cannot support one. These vehicles are left out of every figure above.</p>");
            h.append("<table><thead><tr><th>Reason</th><th class=\"num\">Vehicles</th><th>What it means</th></tr></thead><tbody>");
            for (Map.Entry<String, Integer> e : refusals.entrySet()) {
                h.append("<tr><td><code>").append(esc(e.getKey())).append("</code></td><td class=\"num\">").append(e.getValue())
                        .append("</td><td>").append(esc(meaning(e.getKey()))).append("</td></tr>");
            }
            h.append("</tbody></table>");
        }
        h.append("</section>");

        h.append("<section><h2>How the speeds were measured</h2><ol>");
        h.append("<li>Every frame (").append(fmt(study.sampleFps(), 0)).append(" per second) was sent to Livepeer's <code>yolo-detect</code> model, which boxes each vehicle.</li>");
        if (study.view().conditionsNote() != null && study.view().conditionsNote().startsWith("Livepeer vision check")) {
            h.append("<li>A Livepeer vision model (<code>nemotron-omni-vision</code>) looked at one frame for darkness, rain, glare or a blocked view. ")
                    .append(esc(study.view().conditionsNote().replaceAll("[.\\s]+$", ""))).append(". It can only refuse footage, never add a speed.</li>");
        }
        h.append("<li>Boxes were linked frame to frame into one track per vehicle.</li>");
        h.append("<li>").append(esc(calibrationLine(study))).append("</li>");
        h.append("<li>A fixed set of rules decided, for each vehicle, whether the evidence supports a speed: at least ")
                .append(properties.gate().minCleanFrames()).append(" clean frames, a steady straight-line fit, a stable box, detector confidence of at least ")
                .append(fmt(properties.gate().minConfidence(), 2)).append(", and a plausible speed. Anything else was refused, with the reason.</li>");
        h.append("</ol></section>");

        h.append("<section><h2>How to check this report</h2>");
        if (study.published() != null) {
            h.append("<p>The study was published as a Knowledge Asset to the OriginTrail Decentralized Knowledge Graph (Shared Working Memory on the V10 testnet, not yet registered on-chain). Anyone with the video and the record's locator can check that the video was not changed.</p><dl>");
        } else {
            h.append("<p>This study has not been published yet. Once it is, its fingerprint and results go to the OriginTrail Decentralized Knowledge Graph and anyone with the video can check it.</p><dl>");
        }
        row(h, "Video fingerprint (SHA-256)", "<code>" + esc(study.videoSha256()) + "</code>");
        if (study.published() != null) {
            row(h, "Study record on the DKG", "<code>" + esc(study.published().ual()) + "</code>");
        } else {
            row(h, "Study record on the DKG", "Not published yet. Publish the study to make it checkable.");
        }
        if (study.calibrationUal() != null) {
            row(h, "Calibration record on the DKG", "<code>" + esc(study.calibrationUal()) + "</code>");
        }
        h.append("</dl><p>To check: give StreetProof's Verify page the original video. It recomputes the fingerprint and compares it with the one on the DKG. A video that was edited, re-encoded or swapped does not match.</p>");
        if (study.published() != null && study.published().ual().contains("/_working_memory/")) {
            String graph = study.published().ual().replace("/_working_memory/", "/_shared_memory/");
            h.append("<p>Or query the DKG directly:</p><pre>SELECT ?sha WHERE { GRAPH &lt;").append(esc(graph)).append("&gt; { ?s &lt;")
                    .append(StudyAssetBuilder.SHA_PREDICATE).append("&gt; ?sha } }</pre>");
        }
        h.append("</section>");

        h.append("<section><h2>Limits of this study</h2><ul>");
        h.append("<li>Speeds come from ordinary video, not certified radar. This is evidence for asking the city for a formal study, not a basis for a ticket.</li>");
        boolean headOn = study.calibration() != null && study.calibration().mode() == Calibration.Mode.APPROACH;
        h.append("<li>Every speed depends on the camera calibration. ")
                .append(esc(headOn ? accuracyLine() : "This side-on method has not yet been checked against known speeds.")).append("</li>");
        if (study.calibration() != null && study.calibration().mode() == Calibration.Mode.APPROACH) {
            h.append("<li>Head-on measurement assumes a vehicle height of ").append(fmt(study.calibration().metres(), 2))
                    .append(" m. A vehicle 10% taller than that reads about 10% slow, and one 10% shorter reads about 10% fast.</li>");
        }
        h.append("<li>Only the vehicles that passed the rules are counted. The refused ones may have been faster or slower.</li>");
        h.append("<li>One recording is one moment. Several recordings on different days make a stronger case.</li>");
        h.append("</ul></section>");

        h.append("<footer>Generated by StreetProof from study <code>").append(esc(study.id())).append("</code>.</footer>");
        h.append("</main></body></html>");
        return h.toString();
    }

    private String finding(StudySummary s, SpeedAnalysis analysis) {
        if (s.vehiclesProven() == 0) {
            return "<p>No vehicle could be measured with enough evidence, so this study makes no claim about speeds. "
                    + "The reasons are listed below.</p>";
        }
        StringBuilder f = new StringBuilder("<p>");
        f.append("On a street posted at <strong>").append(fmt(s.postedLimitKmh(), 0)).append(" km/h</strong>, ");
        f.append("85% of measured drivers were at or under <strong>").append(fmt(s.v85Kmh(), 1)).append(" km/h</strong>");
        if (s.shareOverLimit() != null) {
            f.append(", and <strong>").append(pct(s.shareOverLimit())).append("</strong> were over the limit");
        }
        f.append(".</p>");
        if (s.vehiclesProven() < 50) {
            f.append("<p class=\"note\">Based on ").append(s.vehiclesProven()).append(s.vehiclesProven() == 1 ? " vehicle" : " vehicles")
                    .append(". Spot speed studies usually use at least 50 vehicles, preferably 100, so treat these figures as a first look.</p>");
        }
        return f.toString();
    }

    private String warrant(StudySummary s, SpeedAnalysis analysis) {
        StringBuilder w = new StringBuilder("<section><h2>Against a city's traffic calming rules</h2>");
        w.append("<p>Toronto's 2023 Traffic Calming Policy is a concrete example. Speed humps are warranted on a block of at least 120 m ")
                .append("when the 85th percentile is more than 8 km/h over the warrant speed limit, or the 95th percentile is more than 15 km/h over. ")
                .append("The warrant speed limit is 30 km/h on local roads and 40 km/h on most collector roads. ")
                .append("If the city finds a request not warranted, a three-year moratorium on new data collection applies, so a resident check first matters.</p>");
        w.append("<table><thead><tr><th>Test</th><th class=\"num\">This study</th><th class=\"num\">Local road</th><th class=\"num\">Collector</th></tr></thead><tbody>");
        warrantRow(w, "85th percentile", s.v85Kmh(), 30 + 8, 40 + 8);
        warrantRow(w, "95th percentile", analysis.p95Kmh(), 30 + 15, 40 + 15);
        w.append("</tbody></table>");
        w.append("<p class=\"note\">Block length cannot be judged from video. ")
                .append(s.vehiclesProven() < 50
                        ? "This study measured " + s.vehiclesProven() + (s.vehiclesProven() == 1 ? " vehicle" : " vehicles")
                        + ", fewer than the 50 (preferably 100) a spot speed study usually uses, so treat it as indicative."
                        : "It meets the usual spot speed study sample of at least 50 vehicles.")
                .append(" Sources: City of Toronto 2023 Traffic Calming Policy; Arizona State University POP Center, Speeding in Residential Areas, spot speed study guide.</p>");
        return w.append("</section>").toString();
    }

    private static void warrantRow(StringBuilder w, String label, Double value, int local, int collector) {
        w.append("<tr><td>").append(label).append("</td><td class=\"num\">").append(value == null ? "n/a" : fmt(value, 1) + " km/h")
                .append("</td><td class=\"num\">").append(verdict(value, local)).append("</td><td class=\"num\">")
                .append(verdict(value, collector)).append("</td></tr>");
    }

    private static String verdict(Double value, int threshold) {
        if (value == null) {
            return "over " + threshold + ": n/a";
        }
        return value > threshold ? "over " + threshold + ": <strong>yes</strong>" : "over " + threshold + ": no";
    }

    private String accuracyLine() {
        ValidationReport v = studies.validation();
        if (v.meanAbsErrorPercent() == null) {
            return "Its accuracy has not been measured against known speeds yet.";
        }
        return String.format(Locale.ROOT,
                "On %d test clips of cars driving at known speeds, the mean error was %.1f%% and the worst was %.1f%%.",
                v.proven(), v.meanAbsErrorPercent(), v.maxAbsErrorPercent());
    }

    private String calibrationLine(Study study) {
        Calibration c = study.calibration();
        if (c == null) {
            return "No calibration was set, so no speed could be computed.";
        }
        String source = study.calibrationUal() == null ? "" : " The calibration was loaded from its published record on the DKG.";
        return switch (c.mode()) {
            case APPROACH -> "For vehicles driving towards the camera, speed came from how fast the box grows, using the camera's focal length ("
                    + fmt(c.focalPx(), 1) + " px) and the vehicle's height." + source;
            case CURB_MARKS -> "Distance on the road came from two marks a known " + fmt(c.metres(), 2) + " m apart." + source;
            case VEHICLE_LENGTH -> "Distance on the road came from a typical vehicle length of " + fmt(c.metres(), 2) + " m." + source;
        };
    }

    private static String histogram(List<SpeedAnalysis.Bin> bins, double limit) {
        if (bins == null || bins.isEmpty()) {
            return "<p>No measured speeds to chart.</p>";
        }
        int start = (int) (Math.floor(Math.min(bins.getFirst().fromKmh(), limit - 10) / 5.0) * 5);
        int end = (int) (Math.ceil(Math.max(bins.getLast().toKmh(), limit + 10) / 5.0) * 5);
        java.util.Map<Integer, Integer> counts = new java.util.HashMap<>();
        for (SpeedAnalysis.Bin bin : bins) {
            counts.merge(bin.fromKmh(), bin.count(), Integer::sum);
        }
        List<SpeedAnalysis.Bin> padded = new java.util.ArrayList<>();
        for (int from = Math.max(0, start); from < end; from += 5) {
            padded.add(new SpeedAnalysis.Bin(from, from + 5, counts.getOrDefault(from, 0)));
        }
        bins = padded;
        int max = Math.max(1, bins.stream().mapToInt(SpeedAnalysis.Bin::count).max().orElse(1));
        int width = 680;
        int height = 220;
        int left = 36;
        int bottom = 30;
        int top = 16;
        double barWidth = (width - left - 8) / (double) bins.size();
        int from = bins.getFirst().fromKmh();
        int to = bins.getLast().toKmh();
        StringBuilder svg = new StringBuilder();
        svg.append("<div class=\"chart\"><svg viewBox=\"0 0 ").append(width).append(' ').append(height)
                .append("\" role=\"img\" aria-label=\"Histogram of measured speeds\">");
        for (int tick = 0; tick <= max; tick += Math.max(1, (int) Math.ceil(max / 4.0))) {
            double y = height - bottom - (height - bottom - top) * tick / (double) max;
            svg.append("<line x1=\"").append(left).append("\" x2=\"").append(width).append("\" y1=\"").append(fmt(y, 1)).append("\" y2=\"").append(fmt(y, 1))
                    .append("\" class=\"grid\"/><text x=\"").append(left - 6).append("\" y=\"").append(fmt(y + 4, 1)).append("\" class=\"axis\" text-anchor=\"end\">")
                    .append(tick).append("</text>");
        }
        for (int i = 0; i < bins.size(); i++) {
            SpeedAnalysis.Bin bin = bins.get(i);
            double barHeight = (height - bottom - top) * bin.count() / (double) max;
            double x = left + i * barWidth + 2;
            double y = height - bottom - barHeight;
            String cls = bin.fromKmh() >= limit ? "bar over" : "bar";
            svg.append("<rect x=\"").append(fmt(x, 1)).append("\" y=\"").append(fmt(y, 1)).append("\" width=\"").append(fmt(barWidth - 4, 1))
                    .append("\" height=\"").append(fmt(barHeight, 1)).append("\" class=\"").append(cls).append("\"><title>")
                    .append(bin.fromKmh()).append('-').append(bin.toKmh()).append(" km/h: ").append(bin.count()).append("</title></rect>");
            svg.append("<text x=\"").append(fmt(left + i * barWidth, 1)).append("\" y=\"").append(height - bottom + 16)
                    .append("\" class=\"axis\" text-anchor=\"middle\">").append(bin.fromKmh()).append("</text>");
        }
        svg.append("<text x=\"").append(fmt(left + bins.size() * barWidth, 1)).append("\" y=\"").append(height - bottom + 16)
                .append("\" class=\"axis\" text-anchor=\"middle\">").append(bins.getLast().toKmh()).append("</text>");
        if (limit >= from && limit <= to) {
            double x = left + (limit - from) / (double) (to - from) * (width - left - 8);
            svg.append("<line x1=\"").append(fmt(x, 1)).append("\" x2=\"").append(fmt(x, 1)).append("\" y1=\"").append(top - 6)
                    .append("\" y2=\"").append(height - bottom).append("\" class=\"limit\"/><text x=\"").append(fmt(x + 4, 1)).append("\" y=\"")
                    .append(top + 4).append("\" class=\"limit-label\">limit ").append(fmt(limit, 0)).append("</text>");
        }
        svg.append("</svg><p class=\"caption\">Vehicles per 5 km/h band. Bands at or above the limit are shaded darker.</p></div>");
        return svg.toString();
    }

    private static void figure(StringBuilder h, String value, String label, String note) {
        h.append("<div class=\"figure\"><div class=\"value\">").append(esc(value)).append("</div><div class=\"label\">").append(esc(label))
                .append("</div><div class=\"note\">").append(esc(note)).append("</div></div>");
    }

    private static void row(StringBuilder h, String term, String html) {
        h.append("<dt>").append(esc(term)).append("</dt><dd>").append(html).append("</dd>");
    }

    private static String meaning(String reason) {
        try {
            return RefusalReason.valueOf(reason).meaning();
        } catch (IllegalArgumentException e) {
            return reason;
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String pct(double share) {
        return String.format(Locale.ROOT, "%.0f%%", share * 100);
    }

    private static String fmt(double value, int decimals) {
        return String.format(Locale.ROOT, "%." + decimals + "f", value);
    }

    private static String esc(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static final String CSS = """
            :root{--ink:#1d2330;--muted:#5d6675;--line:#d9dde4;--paper:#fbfaf7;--accent:#b8741a;--over:#9c3b2e;--bar:#6b7a90}
            *{box-sizing:border-box}
            body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 "Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif}
            main{max-width:780px;margin:0 auto;padding:40px 20px 56px}
            header{border-bottom:2px solid var(--ink);padding-bottom:14px;margin-bottom:22px}
            .kicker{text-transform:uppercase;letter-spacing:.12em;font-size:12px;color:var(--accent);margin:0 0 6px;font-weight:600}
            h1{font-size:30px;line-height:1.15;margin:0 0 8px;text-wrap:balance}
            h2{font-size:17px;margin:30px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
            .meta{color:var(--muted);margin:0;font-size:14px}
            .finding p{font-size:18px;margin:0 0 8px;max-width:62ch}
            .finding .note,.note{font-size:13px;color:var(--muted)}
            .figures{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:22px 0 6px}
            .figure{border:1px solid var(--line);border-radius:6px;padding:12px 14px;background:#fff}
            .value{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums}
            .label{font-weight:600;font-size:13px;margin-top:2px}
            .figure .note{margin-top:4px;line-height:1.4}
            .chart svg{width:100%;height:auto;display:block}
            .bar{fill:var(--bar)} .bar.over{fill:var(--over)}
            .grid{stroke:var(--line);stroke-width:1} .axis{fill:var(--muted);font-size:11px}
            .limit{stroke:var(--accent);stroke-width:2;stroke-dasharray:4 3} .limit-label{fill:var(--accent);font-size:11px;font-weight:600}
            .caption{font-size:12px;color:var(--muted);margin:4px 0 0}
            table{width:100%;border-collapse:collapse;font-size:14px}
            th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
            th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
            .num{text-align:right;font-variant-numeric:tabular-nums}
            ol,ul{padding-left:22px;max-width:66ch} li{margin:4px 0}
            dl{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:6px 14px;margin:10px 0}
            dt{font-weight:600;font-size:13px} dd{margin:0;min-width:0}
            code{font-family:Consolas,"SFMono-Regular",Menlo,monospace;font-size:12px;overflow-wrap:anywhere}
            pre{background:#fff;border:1px solid var(--line);border-radius:6px;padding:10px;font-size:12px;overflow-x:auto;white-space:pre-wrap;overflow-wrap:anywhere}
            footer{margin-top:36px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}
            @media (max-width:560px){dl{grid-template-columns:1fr}h1{font-size:24px}}
            @media print{body{background:#fff}main{padding:0}.figure{break-inside:avoid}section{break-inside:avoid-page}}
            """;
}
