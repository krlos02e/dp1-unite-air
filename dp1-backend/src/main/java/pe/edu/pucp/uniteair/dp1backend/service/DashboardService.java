package pe.edu.pucp.uniteair.dp1backend.service;

import org.springframework.stereotype.Service;
import pe.edu.pucp.uniteair.dp1backend.cache.SimulationCache;
import pe.edu.pucp.uniteair.dp1backend.dto.AeropuertoDTO;
import pe.edu.pucp.uniteair.dp1backend.dto.DashboardData;
import pe.edu.pucp.uniteair.dp1backend.dto.VueloDTO;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final SimulationCache simulationCache;

    public DashboardService(SimulationCache simulationCache) {
        this.simulationCache = simulationCache;
    }

    public DashboardData obtenerDashboard(String sessionId) {
        var state = simulationCache.get(sessionId);
        if (state == null) {
            return new DashboardData(0, 0, 0, 0, List.of(), List.of());
        }

        int totalVuelos = state.getVuelos() != null ? state.getVuelos().size() : 0;
        int totalAeropuertos = state.getAeropuertos() != null ? state.getAeropuertos().size() : 0;

        List<VueloDTO> vuelosActivos = List.of();
        if (state.getVuelos() != null) {
            vuelosActivos = state.getVuelos().stream()
                    .filter(v -> v.getProgresoVuelo() > 0 && v.getProgresoVuelo() < 100.0)
                    .collect(Collectors.toList());
        }

        return new DashboardData(
                state.getMaletasEntregadas(),
                state.getMaletasEnTransito(),
                totalVuelos,
                totalAeropuertos,
                state.getAeropuertos(),
                vuelosActivos
        );
    }
}
