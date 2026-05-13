package pe.edu.pucp.uniteair.dp1backend.service;

import org.springframework.stereotype.Service;
import pe.edu.pucp.uniteair.dp1backend.cache.SimulationCache;
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
                .estado("CONFIGURANDO")
                .duracionDias(duracionDias)
                .fechaInicio(fechaInicio)
                .fechaActualSimulacion(fechaInicio)
                .velocidad(1.0)
                .algoritmo(algoritmo)
                .progresoPorcentaje(0)
                .createdAt(LocalDateTime.now())
                .build();
        sessionRepository.save(session);

        SimulationState initialState = SimulationState.builder()
                .sessionId(sessionId)
                .simulationTime(fechaInicio)
                .vuelos(new ArrayList<>())
                .aeropuertos(new ArrayList<>())
                .maletasEntregadas(0)
                .maletasEnTransito(0)
                .progreso(0)
                .colapsada(false)
                .logs(new ArrayList<>())
                .build();
        simulationCache.put(sessionId, initialState);

        session.setEstado("EJECUTANDO");
        sessionRepository.save(session);

        simulationEngine.ejecutarSimulacion(sessionId, dataset, config, algoritmo,
                duracionDias, fechaInicio, 1.0);

        return simulationCache.get(sessionId);
    }

    public SimulationState obtenerEstado(String sessionId) {
        return simulationCache.get(sessionId);
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
