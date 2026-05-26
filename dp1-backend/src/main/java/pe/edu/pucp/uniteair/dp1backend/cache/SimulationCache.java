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
    private String activeSessionId;

    @PostConstruct
    public void init() {
        cache = Caffeine.newBuilder()
                .maximumSize(100)
                .expireAfterWrite(30, TimeUnit.MINUTES)
                .build();
    }

    public void put(String sessionId, SimulationState state) {
        cache.put(sessionId, state);
        if ("PLANIFICANDO".equals(state.getStatus()) || "EJECUTANDO".equals(state.getStatus())) {
            this.activeSessionId = sessionId;
        }
    }

    public SimulationState get(String sessionId) {
        return cache.getIfPresent(sessionId);
    }

    public void evict(String sessionId) {
        cache.invalidate(sessionId);
        if (sessionId.equals(this.activeSessionId)) {
            this.activeSessionId = null;
        }
    }

    public boolean containsKey(String sessionId) {
        return cache.getIfPresent(sessionId) != null;
    }

    public String getActiveSessionId() {
        if (activeSessionId == null) return null;
        SimulationState state = cache.getIfPresent(activeSessionId);
        if (state == null || "COLAPSADA".equals(state.getStatus()) || "COMPLETADA".equals(state.getStatus()) || "ERROR".equals(state.getStatus())) {
            activeSessionId = null;
            return null;
        }
        return activeSessionId;
    }

    public Map<String, SimulationState> getAll() {
        Map<String, SimulationState> result = new HashMap<>();
        cache.asMap().forEach(result::put);
        return result;
    }
}
