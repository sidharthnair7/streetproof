package streetproof.streetproof.study;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import streetproof.streetproof.SyntheticTracks;
import streetproof.streetproof.config.StreetProofProperties;
import streetproof.streetproof.gate.RefusalReason;
import streetproof.streetproof.gate.Verdict;
import streetproof.streetproof.ledger.PublishedRecord;
import streetproof.streetproof.speed.Calibration;
import streetproof.streetproof.speed.SpeedEstimate;
import streetproof.streetproof.tracking.IouTracker;
import streetproof.streetproof.tracking.Track;
import streetproof.streetproof.video.VideoInfo;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class StudyRepositoryTest {

    @TempDir
    Path root;

    private Study study(String id) throws Exception {
        Path dir = Files.createDirectories(root.resolve(id));
        Path video = Files.writeString(dir.resolve("source.mp4"), "not really a video");
        return new Study(id, "clip.mp4", dir, video, "ab".repeat(32), new VideoInfo(10, 30, 856, 480));
    }

    @Test
    void aFinishedStudyComesBackAfterARestart() throws Exception {
        StudyRepository first = new StudyRepository(root);
        Study study = study("s1");
        List<Track> tracks = new IouTracker(0.2, 3, 3).track(SyntheticTracks.carAtConstantSpeed(300, 15, 20, 50, 120), Set.of("car"));
        SpeedEstimate estimate = new SpeedEstimate(1, "car", 20, 18, 0, 1.3, 48.7, 0.999, 0.03, 0.9, 0.02, true);
        SpeedEstimate refused = new SpeedEstimate(2, "car", 4, 3, 0, 0.2, Double.NaN, Double.NaN, 0.5, 0.4, 0.02, false);
        List<Verdict> verdicts = List.of(Verdict.proven(estimate), Verdict.refused(refused, RefusalReason.TOO_FEW_CLEAN_FRAMES, "only 3 clean frames"));
        study.configure(Calibration.vehicleLength(4.5), 40, 15, 50.0, "Test Street", "validation");
        study.frameSize(856, 480);
        study.calibratedWith("did:dkg:test/1");
        study.results(tracks, verdicts, StudyStats.analyse(verdicts, 40));
        study.published(new PublishedRecord("did:dkg:test/2", "test", "dkg-cli", Instant.now(), "cd".repeat(32), "graph", "ok"));
        study.status(StudyStatus.DONE);
        first.add(study);
        first.save(study);

        Study back = new StudyRepository(root).find("s1").orElseThrow();
        assertThat(back.status()).isEqualTo(StudyStatus.DONE);
        assertThat(back.tracks()).hasSize(tracks.size());
        assertThat(back.tracks().getFirst().points()).hasSize(tracks.getFirst().points().size());
        assertThat(back.verdicts()).hasSize(2);
        assertThat(back.verdicts().getFirst().kmh()).isEqualTo(48.7);
        assertThat(back.verdicts().get(1).reason()).isEqualTo(RefusalReason.TOO_FEW_CLEAN_FRAMES);
        assertThat(back.analysis().summary().vehiclesProven()).isEqualTo(1);
        assertThat(back.published().ual()).isEqualTo("did:dkg:test/2");
        assertThat(back.calibrationUal()).isEqualTo("did:dkg:test/1");
        assertThat(back.streetLabel()).isEqualTo("Test Street");
        assertThat(back.view().links().video()).isNotNull();
    }

    @Test
    void aStudyCutOffByARestartIsMarkedFailed() throws Exception {
        StudyRepository first = new StudyRepository(root);
        Study study = study("s2");
        study.configure(null, 40, 15, null, null, null);
        study.status(StudyStatus.DETECTING);
        first.add(study);
        first.save(study);

        Study back = new StudyRepository(root).find("s2").orElseThrow();
        assertThat(back.status()).isEqualTo(StudyStatus.FAILED);
        assertThat(back.view().error()).contains("restarted");
    }
}
