package pe.edu.pucp.uniteair.dp1backend.engine;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import pe.edu.pucp.uniteair.dp1backend.cache.SimulationCache;
import pe.edu.pucp.uniteair.dp1backend.dto.*;
import pe.edu.pucp.uniteair.dp1backend.entity.SimulationSession;
import pe.edu.pucp.uniteair.dp1backend.repository.SimulationSessionRepository;
import tasf.config.Config_Simulacion;
import tasf.core.Dataset;
import tasf.core.EstadoOperacional;
import tasf.core.Solucion;
import tasf.model.Aeropuerto;
import tasf.model.Vuelo;
import tasf.model.Ruta;
import tasf.strategy.TwoPhaseOrchestrator;
import tasf.strategy.PlanificadorRutasStrategy;
import tasf.strategy.alns.ALNS_RutasPlanner;
import tasf.strategy.aco.ACO_RutasPlanner;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class SimulationEngine {

    private static final Map<String, double[]> COORDENADAS = new HashMap<>();
    static {
        COORDENADAS.put("SKBO", new double[]{4.7016, -74.1469});
        COORDENADAS.put("SKRG", new double[]{6.1645, -75.4231});
        COORDENADAS.put("SKCL", new double[]{3.5439, -76.3816});
        COORDENADAS.put("SKBQ", new double[]{10.8896, -74.7808});
        COORDENADAS.put("SEGU", new double[]{-2.1574, -79.8836});
        COORDENADAS.put("SPJC", new double[]{-12.0219, -77.1143});
        COORDENADAS.put("SCEL", new double[]{-33.3930, -70.7858});
        COORDENADAS.put("SAEZ", new double[]{-34.8222, -58.5358});
        COORDENADAS.put("SBGR", new double[]{-23.4356, -46.4731});
        COORDENADAS.put("KJFK", new double[]{40.6413, -73.7781});
        COORDENADAS.put("KLAX", new double[]{33.9425, -118.4081});
        COORDENADAS.put("KORD", new double[]{41.9786, -87.9047});
        COORDENADAS.put("KATL", new double[]{33.6407, -84.4277});
        COORDENADAS.put("KDFW", new double[]{32.8998, -97.0403});
        COORDENADAS.put("KMIA", new double[]{25.7932, -80.2906});
        COORDENADAS.put("KSFO", new double[]{37.6213, -122.3790});
        COORDENADAS.put("KSEA", new double[]{47.4489, -122.3094});
        COORDENADAS.put("PHNL", new double[]{21.3245, -157.9251});
        COORDENADAS.put("EGLL", new double[]{51.4700, -0.4543});
        COORDENADAS.put("LFPG", new double[]{49.0097, 2.5479});
        COORDENADAS.put("EDDF", new double[]{50.0379, 8.5622});
        COORDENADAS.put("EHAM", new double[]{52.3105, 4.7683});
        COORDENADAS.put("LEMD", new double[]{40.4983, -3.5676});
        COORDENADAS.put("LIRF", new double[]{41.8002, 12.2388});
        COORDENADAS.put("LSZH", new double[]{47.4582, 8.5480});
        COORDENADAS.put("UUDD", new double[]{55.5918, 37.2674});
        COORDENADAS.put("ULLI", new double[]{59.8003, 30.2625});
        COORDENADAS.put("RJTT", new double[]{35.5494, 139.7798});
        COORDENADAS.put("RKSI", new double[]{37.4602, 126.4407});
        COORDENADAS.put("ZSPD", new double[]{31.1443, 121.8083});
        COORDENADAS.put("VHHH", new double[]{22.3080, 113.9185});
        COORDENADAS.put("WSSS", new double[]{1.3592, 103.9894});
        COORDENADAS.put("OMDB", new double[]{25.2532, 55.3657});
        COORDENADAS.put("OTHH", new double[]{25.2606, 51.6140});
        COORDENADAS.put("VIDP", new double[]{28.5562, 77.1000});
        COORDENADAS.put("FAOR", new double[]{-26.1392, 28.2460});
        COORDENADAS.put("CYYZ", new double[]{43.6777, -79.6248});
        COORDENADAS.put("MMMX", new double[]{19.4363, -99.0721});
    }

    private final SimulationCache simulationCache;
    private final SimulationSessionRepository sessionRepository;
    private final Map<String, CompletableFuture<Void>> activeSimulations = new ConcurrentHashMap<>();
    private final Map<String, Boolean> cancellationFlags = new ConcurrentHashMap<>();

    public SimulationEngine(SimulationCache simulationCache, SimulationSessionRepository sessionRepository) {
        this.simulationCache = simulationCache;
        this.sessionRepository = sessionRepository;
    }

    @Async("taskExecutor")
    public CompletableFuture<Void> ejecutarSimulacion(String sessionId, Dataset dataset,
                                                       Config_Simulacion config, String algoritmo,
                                                       int duracionDias, LocalDateTime fechaInicio, double velocidad) {
        CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
            try {
                int duracionHoras = duracionDias * 24;
                EstadoOperacional estado = new EstadoOperacional();
                Map<String, Integer> cargaVuelo = new ConcurrentHashMap<>();
                Map<String, Integer> ocupacionAeropuerto = new ConcurrentHashMap<>();
                List<LogEntry> logs = new ArrayList<>();
                int maletasEntregadas = 0;
                int maletasEnTransito = 0;

                PlanificadorRutasStrategy planner = "ACO".equalsIgnoreCase(algoritmo)
                        ? new ACO_RutasPlanner()
                        : new ALNS_RutasPlanner();
                TwoPhaseOrchestrator orchestrator = new TwoPhaseOrchestrator(planner);

                Solucion solucion = orchestrator.ejecutarFlujoCompleto(dataset, config);

                Map<String, Ruta> rutas = solucion.getRutasAsignadas();
                Set<String> noAsignados = solucion.getPaquetesNoAsignados();
                maletasEnTransito = rutas.size();

                for (int hora = 0; hora <= duracionHoras; hora++) {
                    if (cancellationFlags.getOrDefault(sessionId, false)) break;

                    LocalDateTime simTime = fechaInicio.plusHours(hora);

                    for (Map.Entry<String, Ruta> entry : rutas.entrySet()) {
                        Ruta ruta = entry.getValue();
                        if (!ruta.getVuelos().isEmpty()) {
                            Vuelo ultimo = ruta.getVuelos().get(ruta.getVuelos().size() - 1);
                            if (simTime.isAfter(ultimo.getLlegadaUtc())) {
                                maletasEntregadas++;
                                maletasEnTransito--;
                            }
                        }
                    }

                    for (Vuelo vuelo : dataset.getVuelos()) {
                        if (simTime.isAfter(vuelo.getSalidaUtc()) && simTime.isBefore(vuelo.getLlegadaUtc())) {
                            String key = vuelo.getId();
                            int carga = estado.getCargaVuelo(key);
                            cargaVuelo.put(key, carga);
                        }
                    }

                    for (Aeropuerto a : dataset.getAeropuertos().values()) {
                        int ocup = estado.getOcupacionHora(a.getCodigoOACI(), simTime);
                        ocupacionAeropuerto.put(a.getCodigoOACI(), ocup);
                    }

                    if (hora > 0 && hora % 12 == 0) {
                        logs.add(LogEntry.builder()
                                .timestamp(LocalDateTime.now())
                                .tipo("INFO")
                                .mensaje(String.format("Hora %d: %d maletas entregadas, %d en tránsito",
                                        hora, maletasEntregadas, maletasEnTransito))
                                .build());
                    }

                    if (maletasEnTransito > 0 && hora > duracionHoras / 2) {
                        long stagnant = rutas.values().stream()
                                .filter(r -> !r.getVuelos().isEmpty())
                                .filter(r -> {
                                    Vuelo ultimo = r.getVuelos().get(r.getVuelos().size() - 1);
                                    return simTime.isAfter(ultimo.getLlegadaUtc().plusHours(24));
                                })
                                .count();
                        if (stagnant > rutas.size() * 0.3) {
                            String motivo = "Colapso: " + stagnant + " envíos estancados sin entregar en hora " + hora;
                            logs.add(LogEntry.builder()
                                    .timestamp(LocalDateTime.now())
                                    .tipo("COLAPSO")
                                    .mensaje(motivo)
                                    .build());
                            actualizarSesionColapsada(sessionId, motivo, hora, duracionHoras);
                            actualizarEstadoEnCache(sessionId, simTime, dataset, cargaVuelo, ocupacionAeropuerto,
                                    maletasEntregadas, maletasEnTransito, hora, duracionHoras, true, motivo, logs);
                            break;
                        }
                    }

                    actualizarEstadoEnCache(sessionId, simTime, dataset, cargaVuelo, ocupacionAeropuerto,
                            maletasEntregadas, maletasEnTransito, hora, duracionHoras, false, null, logs);

                    var session = sessionRepository.findById(sessionId).orElse(null);
                    if (session != null) {
                        session.setFechaActualSimulacion(simTime);
                        session.setProgresoPorcentaje(Math.min(100, (hora * 100) / duracionHoras));
                        sessionRepository.save(session);
                    }

                    long sleepMs = (long) (1000.0 / Math.max(1, velocidad));
                    if (sleepMs > 0) {
                        Thread.sleep(sleepMs);
                    }
                }

                if (!cancellationFlags.getOrDefault(sessionId, false)) {
                    var session = sessionRepository.findById(sessionId).orElse(null);
                    if (session != null) {
                        session.setEstado("COMPLETADA");
                        session.setProgresoPorcentaje(100);
                        sessionRepository.save(session);
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                activeSimulations.remove(sessionId);
                cancellationFlags.remove(sessionId);
            }
        });

        activeSimulations.put(sessionId, future);
        return future;
    }

    public void detenerSimulacion(String sessionId) {
        cancellationFlags.put(sessionId, true);
        CompletableFuture<Void> future = activeSimulations.get(sessionId);
        if (future != null) {
            future.cancel(true);
        }
        activeSimulations.remove(sessionId);
        cancellationFlags.remove(sessionId);
    }

    private void actualizarSesionColapsada(String sessionId, String motivo, int hora, int totalHoras) {
        var session = sessionRepository.findById(sessionId).orElse(null);
        if (session != null) {
            session.setEstado("COLAPSADA");
            session.setMotivoColapso(motivo);
            session.setProgresoPorcentaje(Math.min(100, (hora * 100) / Math.max(1, totalHoras)));
            sessionRepository.save(session);
        }
    }

    private void actualizarEstadoEnCache(String sessionId, LocalDateTime simTime, Dataset dataset,
                                          Map<String, Integer> cargaVuelo, Map<String, Integer> ocupacionAeropuerto,
                                          int maletasEntregadas, int maletasEnTransito,
                                          int hora, int totalHoras, boolean colapsada,
                                          String motivo, List<LogEntry> logs) {
        List<VueloDTO> vuelosDTO = dataset.getVuelos().stream().map(v -> {
            double progreso = 0.0;
            if (simTime != null && v.getSalidaUtc() != null && v.getLlegadaUtc() != null) {
                long total = ChronoUnit.MINUTES.between(v.getSalidaUtc(), v.getLlegadaUtc());
                long transcurrido = ChronoUnit.MINUTES.between(v.getSalidaUtc(), simTime);
                if (total > 0) {
                    progreso = Math.min(100.0, Math.max(0.0, (double) transcurrido / total * 100));
                }
                if (simTime.isAfter(v.getLlegadaUtc())) progreso = 100.0;
                if (simTime.isBefore(v.getSalidaUtc())) progreso = 0.0;
            }
            double[] origCoord = COORDENADAS.getOrDefault(v.getOrigen().getCodigoOACI(), new double[]{0, 0});
            double[] destCoord = COORDENADAS.getOrDefault(v.getDestino().getCodigoOACI(), new double[]{0, 0});
            return VueloDTO.builder()
                    .id(v.getId())
                    .origen(v.getOrigen().getCodigoOACI())
                    .destino(v.getDestino().getCodigoOACI())
                    .latOrigen(origCoord[0]).lonOrigen(origCoord[1])
                    .latDestino(destCoord[0]).lonDestino(destCoord[1])
                    .salidaUtc(v.getSalidaUtc())
                    .llegadaUtc(v.getLlegadaUtc())
                    .capacidad(v.getCapacidadCarga())
                    .cargaActual(cargaVuelo.getOrDefault(v.getId(), 0))
                    .progresoVuelo(progreso)
                    .build();
        }).collect(Collectors.toList());

        List<AeropuertoDTO> aeropuertosDTO = dataset.getAeropuertos().values().stream().map(a -> {
            double[] coord = COORDENADAS.getOrDefault(a.getCodigoOACI(), new double[]{0, 0});
            int ocup = ocupacionAeropuerto.getOrDefault(a.getCodigoOACI(), 0);
            List<String> entrantes = dataset.getVuelos().stream()
                    .filter(v -> v.getDestino().getCodigoOACI().equals(a.getCodigoOACI()))
                    .map(Vuelo::getId)
                    .collect(Collectors.toList());
            List<String> salientes = dataset.getVuelos().stream()
                    .filter(v -> v.getOrigen().getCodigoOACI().equals(a.getCodigoOACI()))
                    .map(Vuelo::getId)
                    .collect(Collectors.toList());
            return AeropuertoDTO.builder()
                    .codigoOACI(a.getCodigoOACI())
                    .latitud(coord[0]).longitud(coord[1])
                    .capacidadMaxima(a.getCapacidadMaxima())
                    .ocupacionActual(ocup)
                    .vuelosEntrantes(entrantes)
                    .vuelosSalientes(salientes)
                    .build();
        }).collect(Collectors.toList());

        SimulationState state = SimulationState.builder()
                .sessionId(sessionId)
                .simulationTime(simTime)
                .vuelos(vuelosDTO)
                .aeropuertos(aeropuertosDTO)
                .maletasEntregadas(maletasEntregadas)
                .maletasEnTransito(maletasEnTransito)
                .progreso(Math.min(100, totalHoras > 0 ? (hora * 100) / totalHoras : 0))
                .colapsada(colapsada)
                .motivoColapso(motivo)
                .logs(new ArrayList<>(logs))
                .build();

        simulationCache.put(sessionId, state);
    }
}
