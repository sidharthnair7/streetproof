package streetproof.streetproof.ledger;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class Locators {

    private static final Pattern ON_CHAIN = Pattern.compile("did:dkg:[a-z]+:\\d+/(0x[0-9a-fA-F]{40})/(\\d+)");

    private Locators() {
    }

    public static boolean sameAsset(String reference, String locator) {
        if (reference == null || locator == null) {
            return false;
        }
        String ref = reference.trim();
        if (ref.equals(locator)) {
            return true;
        }
        Matcher onChain = ON_CHAIN.matcher(ref);
        return onChain.matches()
                && locator.toLowerCase(Locale.ROOT).endsWith("/" + onChain.group(1).toLowerCase(Locale.ROOT) + "/" + onChain.group(2));
    }
}
