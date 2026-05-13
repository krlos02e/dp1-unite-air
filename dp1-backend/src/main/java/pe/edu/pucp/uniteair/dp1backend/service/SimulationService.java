package pe.edu.pucp.uniteair.dp1backend.service;

import org.springframework.stereotype.Service;
import pe.edu.pucp.uniteair.dp1backend.cache.SimulationCache;
import pe.edu.pucp.uniteair.dp1backend.dto.LogEntry;
import pe.edu.pucp.uniteair.dp1backend.dto.SimulationState;
import pe.edu.pucp.uniteair.dp1backend.dto.SimulacionConfigRequest;
import pe.edu.pucp.uniteair.dp1backend.engine.SimulationEngine;
import pe.edu.pucp.uniteair.dp1backend.entity.SimulationSession;
import pe.edu.pucp.uniteair.dp1backend.repository.SimulationSessionRepository;
import tasf.config.Config_Simulacion;
import tasf.core.Dataset;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class SimulationService {

    private final SimulationSessionRepository sessionRepository;
    private final SimulationCache simulationCache;
    private final SimulationEngine simulationEngine;

    public SimulationService(SimulationSessionRepository sessionRepository,
                             SimulationCache simulationCache,
                             SimulationEngine simulationEngine) {
        this.sessionRepository = sessionRepository;
        this.simulationCache = simulationCache;
        this.simulationEngine = simulationEngine;
    }

    public SimulationState iniciarSimulacion(SimulacionConfigRequest req, Dataset dataset) {
        String sessionId = UUID.randomUUID().toString();

        LocalDate fecha = req.getFechaInicio() != null
                ? LocalDate.parse(req.getFechaInicio(), DateTimeFormatter.ISO_LOCAL_DATE)
                : LocalDate.now();
        LocalTime hora = req.getHoraInicio() != null
                ? LocalTime.parse(req.getHoraInicio(), DateTimeFormatter.ofPattern("HH:mm"))
                : LocalTime.now();
        LocalDateTime fechaInicio = LocalDateTime.of(fecha, hora);

        int duracionDias = req.getDuracionDias() > 0 ? req.getDuracionDias() : 3;
        String algoritmo = req.getAlgoritmo() != null ? req.getAlgoritmo() : "ALNS";

        Config_Simulacion config = new Config_Simulacion();
        config.setAeropuertoHub("SKBO");

        SimulationSession session = SimulationSession.builder()
                .sessionId(sessionId)
                .estado("PLANIFICANDO")
                .duracionDias(duracionDias)
                .fechaInicio(fechaInicio)
                .fechaActualSimulacion(fechaInicio)
                .velocidad(1.0)
                .algoritmo(algoritmo)
                .progresoPorcentaje(0)
                .createdAt(LocalDateTime.now())
                .build();
        sessionRepository.save(session);

        ArrayList<LogEntry> logs = new ArrayList<>();
        logs.add(LogEntry.builder()
                .timestamp(LocalDateTime.now())
                .tipo("INFO")
                .mensaje("Iniciando planificación de rutas...")
                .build());

        SimulationState initialState = SimulationState.builder()
                .sessionId(sessionId)
                .status("PLANIFICANDO")
                .simulationTime(fechaInicio)
                .vuelos(new ArrayList<>())
                .aeropuertos(new ArrayList<>())
                .maletasEntregadas(0)
                .maletasEnTransito(0)
                .progreso(0)
                .colapsada(false)
                .logs(logs)
                .build();
        simulationCache.put(sessionId, initialState);

        simulationEngine.ejecutarSimulacion(sessionId, dataset, config, algoritmo,
                duracionDias, fechaInicio, 1.0);

        return simulationCache.get(sessionId);
    }

    public SimulationState obtenerEstado(String sessionId) {
        SimulationState state = simulationCache.get(sessionId);
        if (state == null) return null;
        List<LogEntry> logs = state.getLogs();
        if (logs != null && logs.size() > 50) {
            logs = logs.subList(logs.size() - 50, logs.size());
        }
        return SimulationState.builder()
                .sessionId(state.getSessionId())
                .status(state.getStatus())
                .simulationTime(state.getSimulationTime())
                .vuelos(state.getVuelos())
                .aeropuertos(state.getAeropuertos())
                .maletasEntregadas(state.getMaletasEntregadas())
                .maletasEnTransito(state.getMaletasEnTransito())
                .progreso(state.getProgreso())
                .colapsada(state.isColapsada())
                .motivoColapso(state.getMotivoColapso())
                .logs(logs != null ? new ArrayList<>(logs) : null)
                .build();
    }

    public SimulationState detenerSimulacion(String sessionId) {
        simulationEngine.detenerSimulacion(sessionId);
        var session = sessionRepository.findById(sessionId).orElse(null);
        if (session != null) {
            session.setEstado("COMPLETADA");
            sessionRepository.save(session);
        }
        return simulationCache.get(sessionId);
    }
}
