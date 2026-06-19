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
    private final CargaArchivosService cargaArchivosService;

    public SimulationService(SimulationSessionRepository sessionRepository,
                             SimulationCache simulationCache,
                             SimulationEngine simulationEngine,
                             CargaArchivosService cargaArchivosService) {
        this.sessionRepository = sessionRepository;
        this.simulationCache = simulationCache;
        this.simulationEngine = simulationEngine;
        this.cargaArchivosService = cargaArchivosService;
    }

    public SimulationState iniciarSimulacion(SimulacionConfigRequest req, Dataset dataset) {
        String sessionId = UUID.randomUUID().toString();

        LocalDate fecha = req.getFechaInicio() != null
                ? LocalDate.parse(req.getFechaInicio(), DateTimeFormatter.ISO_LOCAL_DATE)
                : LocalDate.now();
        LocalTime hora = req.getHoraInicio() != null
                ? LocalTime.parse(req.getHoraInicio(), DateTimeFormatter.ISO_LOCAL_TIME)
                : LocalTime.now();
        LocalDateTime fechaInicio = LocalDateTime.of(fecha, hora);

        int duracionDias = req.getDuracionDias() > 0 ? req.getDuracionDias() : 3;
        String algoritmo = req.getAlgoritmo() != null ? req.getAlgoritmo() : "ALNS";
        double velocidad = req.getVelocidad() > 0 ? req.getVelocidad() : 1.0;

        Config_Simulacion config = new Config_Simulacion();
        config.setAeropuertoHub("SKBO");
        config.setMinimaConexion(java.time.Duration.ofMinutes(10));
        config.setIteracionesALNS(20);
        config.setMaxRutasPorPaquete(4);
        config.setMaxEscalas(2);
        config.setVentanaActualizacionPesos(5);
        config.setEvaporacionFeromona(0.4);

        cargaArchivosService.cargarDatasetConFechas(fecha, duracionDias);
        dataset = cargaArchivosService.obtenerUltimoDataset();
        if (dataset == null) {
            return SimulationState.builder()
                    .sessionId(sessionId)
                    .status("ERROR")
                    .simulationTime(fechaInicio)
                    .vuelos(new ArrayList<>())
                    .aeropuertos(new ArrayList<>())
                    .maletasEntregadas(0)
                    .maletasEnTransito(0)
                    .vuelosCulminados(0)
                    .vuelosEnTransito(0)
                    .vuelosCancelados(0)
                    .progreso(0)
                    .colapsada(false)
                    .logs(List.of(LogEntry.builder()
                            .timestamp(LocalDateTime.now())
                            .tipo("ERROR")
                            .mensaje("No se pudo cargar el dataset para las fechas seleccionadas")
                            .build()))
                    .build();
        }

        SimulationSession session = SimulationSession.builder()
                .sessionId(sessionId)
                .isNewSession(true)
                .estado("PLANIFICANDO")
                .duracionDias(duracionDias)
                .fechaInicio(fechaInicio)
                .fechaActualSimulacion(fechaInicio)
                .velocidad(velocidad)
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
                .vuelosCulminados(0)
                .vuelosEnTransito(0)
                .vuelosCancelados(0)
                .progreso(0)
                .colapsada(false)
                .logs(logs)
                .build();
        simulationCache.put(sessionId, initialState);

        simulationEngine.ejecutarSimulacion(sessionId, dataset, config, algoritmo,
                duracionDias, fechaInicio, velocidad);

        return simulationCache.get(sessionId);
    }

    public SimulationState obtenerEstado(String sessionId) {
        SimulationState state = simulationCache.get(sessionId);
        if (state == null) {
            var session = sessionRepository.findById(sessionId).orElse(null);
            if (session != null) {
                return SimulationState.builder()
                        .sessionId(sessionId)
                        .status(session.getEstado())
                        .simulationTime(session.getFechaActualSimulacion())
                        .maletasEntregadas(0)
                        .maletasEnTransito(0)
                        .vuelosCulminados(0)
                        .vuelosEnTransito(0)
                        .vuelosCancelados(0)
                        .progreso(session.getProgresoPorcentaje())
                        .colapsada("COLAPSADA".equals(session.getEstado()))
                        .motivoColapso(session.getMotivoColapso())
                        .logs(new ArrayList<>())
                        .build();
            }
            return null;
        }
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
                .vuelosCulminados(state.getVuelosCulminados())
                .vuelosEnTransito(state.getVuelosEnTransito())
                .vuelosCancelados(state.getVuelosCancelados())
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

    public void pausarSimulacion(String sessionId) {
        simulationEngine.pausarSimulacion(sessionId);
    }

    public void reanudarSimulacion(String sessionId) {
        simulationEngine.reanudarSimulacion(sessionId);
    }
}
