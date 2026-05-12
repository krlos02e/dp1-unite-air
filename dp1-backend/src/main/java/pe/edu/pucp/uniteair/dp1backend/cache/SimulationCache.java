package pe.edu.pucp.uniteair.dp1backend.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import pe.edu.pucp.uniteair.dp1backend.dto.SimulationState;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class SimulationCache {

    private Cache<String, SimulationState> cache;

    @PostConstruct
    public void init() {
        cache = Caffeine.newBuilder()
                .maximumSize(100)
                .expireAfterWrite(30, TimeUnit.MINUTES)
                .build();
    }

    public void put(String sessionId, SimulationState state) {
        cache.put(sessionId, state);
    }

    public SimulationState get(String sessionId) {
        return cache.getIfPresent(sessionId);
    }

    public void evict(String sessionId) {
        cache.invalidate(sessionId);
    }

    public boolean containsKey(String sessionId) {
        return cache.getIfPresent(sessionId) != null;
    }

    public Map<String, SimulationState> getAll() {
        Map<String, SimulationState> result = new HashMap<>();
        cache.asMap().forEach(result::put);
        return result;
    }
}
