package pe.edu.pucp.uniteair.dp1backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Dp1BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(Dp1BackendApplication.class, args);
    }

}
