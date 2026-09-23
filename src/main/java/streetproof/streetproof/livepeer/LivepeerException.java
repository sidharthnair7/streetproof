package streetproof.streetproof.livepeer;

public class LivepeerException extends RuntimeException {

    private final boolean retryable;
    private final String code;

    public LivepeerException(String message, boolean retryable, String code) {
        super(message);
        this.retryable = retryable;
        this.code = code;
    }

    public boolean retryable() {
        return retryable;
    }

    public String code() {
        return code;
    }
}
