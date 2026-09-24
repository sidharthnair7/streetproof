package streetproof.streetproof.ledger;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocatorsTest {

    private static final String WORKING = "did:dkg:context-graph:0x5Ea07Ffddc58Dd261102746E6651747E18429dbe/streetproof/_working_memory/0x5ea07ffddc58dd261102746e6651747e18429dbe/16";

    @Test
    void onChainUalFindsTheSameAssetsWorkingMemoryLocator() {
        assertTrue(Locators.sameAsset("did:dkg:base:84532/0x5ea07ffddc58dd261102746e6651747e18429dbe/16", WORKING));
        assertTrue(Locators.sameAsset(WORKING, WORKING));
    }

    @Test
    void differentAssetNumberOrPublisherDoesNotMatch() {
        assertFalse(Locators.sameAsset("did:dkg:base:84532/0x5ea07ffddc58dd261102746e6651747e18429dbe/1", WORKING));
        assertFalse(Locators.sameAsset("did:dkg:base:84532/0x1111111111111111111111111111111111111111/16", WORKING));
        assertFalse(Locators.sameAsset(null, WORKING));
    }
}
