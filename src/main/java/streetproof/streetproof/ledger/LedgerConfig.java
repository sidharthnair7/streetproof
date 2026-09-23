package streetproof.streetproof.ledger;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import streetproof.streetproof.config.StreetProofProperties;

@Configuration
public class LedgerConfig {

    @Bean
    public KnowledgePublisher knowledgePublisher(StreetProofProperties properties) {
        LocalLedgerPublisher local = new LocalLedgerPublisher(properties.workDir().resolve("ledger"));
        if (properties.dkg() != null && properties.dkg().usesCli()) {
            return new DkgCliPublisher(properties.dkg(), properties.workDir().resolve("assets"), local);
        }
        return local;
    }

    @Bean
    public StudyAssetBuilder studyAssetBuilder(StreetProofProperties properties) {
        return new StudyAssetBuilder(properties.gate());
    }
}
