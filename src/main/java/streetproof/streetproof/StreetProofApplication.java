package streetproof.streetproof;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class StreetProofApplication {

    public static void main(String[] args) {
        System.setProperty("java.awt.headless", "true");
        SpringApplication.run(StreetProofApplication.class, args);
    }

}
