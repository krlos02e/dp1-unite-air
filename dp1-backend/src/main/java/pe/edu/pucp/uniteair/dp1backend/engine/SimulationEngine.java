package pe.edu.pucp.uniteair.dp1backend.engine;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import pe.edu.pucp.uniteair.dp1backend.cache.SimulationCache;
import pe.edu.pucp.uniteair.dp1backend.config.AeropuertoCoordenadas;
import pe.edu.pucp.uniteair.dp1backend.dto.*;
import pe.edu.pucp.uniteair.dp1backend.entity.SimulationSession;
import pe.edu.pucp.uniteair.dp1backend.repository.SimulationSessionRepository;
import tasf.config.Config_Simulacion;
import tasf.core.Dataset;
import tasf.core.EstadoOperacional;
import tasf.core.PlanificacionUtils;
import tasf.core.Solucion;
import tasf.model.Aeropuerto;
import tasf.model.Paquete;
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



    private final SimulationCache simulationCache;
    private final SimulationSessionRepository sessionRepository;
    private final Map<String, CompletableFuture<Void>> activeSimulations = new ConcurrentHashMap<>();
    private final Map<String, Boolean> cancellationFlags = new ConcurrentHashMap<>();
    private final Map<String, Boolean> pauseFlags = new ConcurrentHashMap<>();

    public SimulationEngine(SimulationCache simulationCache, SimulationSessionRepository sessionRepository) {
        this.simulationCache = simulationCache;
        this.sessionRepository = sessionRepository;
    }

    public void pausarSimulacion(String sessionId) {
        pauseFlags.put(sessionId, true);
    }

    public void reanudarSimulacion(String sessionId) {
        pauseFlags.remove(sessionId);
    }

    public boolean isPausada(String sessionId) {
        return pauseFlags.getOrDefault(sessionId, false);
    }

    private void esperarSiPausada(String sessionId) throws InterruptedException {
        while (pauseFlags.getOrDefault(sessionId, false)) {
            Thread.sleep(200);
        }
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

                PlanificacionUtils.limpiarCacheGlobal();

                // Inicializar visualización inmediatamente con datos del dataset
                logs.add(LogEntry.builder()
                        .timestamp(fechaInicio)
                        .tipo("INFO")
                        .mensaje("Planificando rutas...")
                        .build());
                actualizarEstadoEnCache(sessionId, fechaInicio, dataset, cargaVuelo, ocupacionAeropuerto,
                        0, 0, 0, duracionHoras, false, null, logs, "PLANIFICANDO");

                // Variables compartidas entre hilos
                final int[] horaRef = {0};
                final LocalDateTime[] simTimeRef = {fechaInicio};
                final boolean[] planificacionTerminada = {false};
                final Solucion[] solucionRef = {null};
                final List<LogEntry> vizLogs = Collections.synchronizedList(new ArrayList<>(logs));

                // Hilo de planificación
                Thread planificadorThread = new Thread(() -> {
                    System.out.println("[2/4] Algoritmo: " + algoritmo);
                    System.out.println("[3/4] Algoritmo ejecutando...");
                    long tPlanStart = System.nanoTime();
                    Solucion sol = orchestrator.ejecutarFlujoCompleto(dataset, config);
                    long tPlanEnd = System.nanoTime();
                    long duracionMs = (tPlanEnd - tPlanStart) / 1_000_000;
                    System.out.printf("[4/4] Planificación completada [%dms]%n", duracionMs);
                    solucionRef[0] = sol;
                    planificacionTerminada[0] = true;
                });
                planificadorThread.setDaemon(true);
                planificadorThread.start();

                // Hilo de visualización: avanza el tiempo de simulación mientras planifica
                Thread visualizacionThread = new Thread(() -> {
                    int hora = 0;
                    LocalDateTime simTime = fechaInicio;
                    Set<String> rutasEntregadasViz = new HashSet<>();
                    while (!planificacionTerminada[0] && !Thread.currentThread().isInterrupted()) {
                        if (cancellationFlags.getOrDefault(sessionId, false)) break;

                        try {
                            esperarSiPausada(sessionId);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            break;
                        }

                        // Cálculo de carga vuelo y ocupación aeropuerto
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

                        // Calcular contadores de maletas si la planificación ya terminó
                        int vizEntregadas = 0;
                        int vizEnTransito = 0;
                        Solucion sol = solucionRef[0];
                        if (sol != null) {
                            Map<String, Ruta> rutasViz = sol.getRutasAsignadas();
                            vizEnTransito = rutasViz.size();
                            for (Map.Entry<String, Ruta> entry : rutasViz.entrySet()) {
                                Ruta ruta = entry.getValue();
                                if (!ruta.getVuelos().isEmpty()) {
                                    Vuelo ultimo = ruta.getVuelos().get(ruta.getVuelos().size() - 1);
                                    if (simTime.isAfter(ultimo.getLlegadaUtc())) {
                                        vizEntregadas++;
                                        vizEnTransito--;
                                        rutasEntregadasViz.add(entry.getKey());
                                    }
                                }
                            }
                        }

                        if (hora > 0 && hora % 12 == 0) {
                            vizLogs.add(LogEntry.builder()
                                    .timestamp(simTime)
                                    .tipo("INFO")
                                    .mensaje(String.format("Planificación en curso... Hora simulada %d/%d", hora, duracionHoras))
                                    .build());
                        }

                        actualizarEstadoEnCache(sessionId, simTime, dataset, cargaVuelo, ocupacionAeropuerto,
                                vizEntregadas, vizEnTransito, hora, duracionHoras, false, null, vizLogs, "PLANIFICANDO");

                        long sleepMs = (long) (2000.0 / Math.max(0.5, velocidad));
                        if (sleepMs > 0) {
                            try {
                                Thread.sleep(sleepMs);
                            } catch (InterruptedException e) {
                                Thread.currentThread().interrupt();
                                break;
                            }
                        }

                        hora++;
                        simTime = fechaInicio.plusHours(hora);
                        if (hora > duracionHoras) {
                            hora = duracionHoras;
                            simTime = fechaInicio.plusHours(duracionHoras);
                        }
                        horaRef[0] = hora;
                        simTimeRef[0] = simTime;
                    }
                });
                visualizacionThread.setDaemon(true);
                visualizacionThread.start();

                // Esperar a que termine la planificación
                planificadorThread.join();
                planificacionTerminada[0] = true;
                visualizacionThread.interrupt();
                visualizacionThread.join(500);

                Solucion solucion = solucionRef[0];
                if (solucion == null) {
                    throw new IllegalStateException("La planificación no produjo una solución");
                }

                Map<String, Ruta> rutas = solucion.getRutasAsignadas();
                Set<String> noAsignados = solucion.getPaquetesNoAsignados();
                boolean hayColapso = !noAsignados.isEmpty();
                maletasEnTransito = rutas.size();

                // Calcular carga real por vuelo según rutas asignadas
                for (Map.Entry<String, Ruta> entry : rutas.entrySet()) {
                    Paquete paquete = dataset.getPaquetePorId(entry.getKey());
                    int cantidad = paquete != null ? paquete.getCantidad() : 1;
                    for (Vuelo v : entry.getValue().getVuelos()) {
                        cargaVuelo.merge(v.getId(), cantidad, Integer::sum);
                    }
                }

                System.out.println("=== Ejecucion Completada ===");
                System.out.printf("Paquetes totales: %d, rutas asignadas: %d%n",
                        dataset.getPaquetes().size(), rutas.size());
                System.out.println("Asignados: " + rutas.size() + " | Sin asignar: " + noAsignados.size());
                System.out.println("Colapso: " + (hayColapso ? "SI" : "NO"));
                System.out.println("Costo total: " + (long) solucion.getCostoTotal());

                logs.add(LogEntry.builder()
                        .timestamp(fechaInicio)
                        .tipo("INFO")
                        .mensaje(String.format("Planificación completada: %d rutas asignadas, %d no asignados",
                                rutas.size(), noAsignados.size()))
                        .build());

                if (hayColapso) {
                    String motivo = "Colapso en planificación: " + noAsignados.size() + " paquetes sin asignar";
                    logs.add(LogEntry.builder()
                            .timestamp(fechaInicio)
                            .tipo("COLAPSO")
                            .mensaje(motivo)
                            .build());
                    actualizarEstadoColapsado(sessionId, fechaInicio, motivo, logs);
                    actualizarSesionColapsada(sessionId, motivo, 0, duracionHoras);
                    return;
                }

                // Sincronizar logs acumulados durante la visualización
                logs = new ArrayList<>(vizLogs);
                logs.add(LogEntry.builder()
                        .timestamp(simTimeRef[0])
                        .tipo("INFO")
                        .mensaje(String.format("Continuando simulación desde hora %d/%d", horaRef[0], duracionHoras))
                        .build());

                // Calcular entregas retroactivas hasta el punto donde quedó la visualización
                Set<String> rutasEntregadas = new HashSet<>();
                LocalDateTime simTimeActual = simTimeRef[0];
                int horaActual = horaRef[0];

                for (Map.Entry<String, Ruta> entry : rutas.entrySet()) {
                    Ruta ruta = entry.getValue();
                    if (!ruta.getVuelos().isEmpty()) {
                        Vuelo ultimo = ruta.getVuelos().get(ruta.getVuelos().size() - 1);
                        if (simTimeActual.isAfter(ultimo.getLlegadaUtc())) {
                            maletasEntregadas++;
                            rutasEntregadas.add(entry.getKey());
                        }
                    }
                }
                maletasEnTransito = rutas.size() - maletasEntregadas;

                // Continuar simulación desde horaActual
                for (int hora = horaActual; hora <= duracionHoras; hora++) {
                    if (cancellationFlags.getOrDefault(sessionId, false)) break;
                    esperarSiPausada(sessionId);

                    LocalDateTime simTime = fechaInicio.plusHours(hora);

                    for (Map.Entry<String, Ruta> entry : rutas.entrySet()) {
                        String rutaId = entry.getKey();
                        if (rutasEntregadas.contains(rutaId)) continue;
                        Ruta ruta = entry.getValue();
                        if (!ruta.getVuelos().isEmpty()) {
                            Vuelo ultimo = ruta.getVuelos().get(ruta.getVuelos().size() - 1);
                            if (simTime.isAfter(ultimo.getLlegadaUtc())) {
                                maletasEntregadas++;
                                maletasEnTransito--;
                                rutasEntregadas.add(rutaId);
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
                                .timestamp(simTime)
                                .tipo("INFO")
                                .mensaje(String.format("Hora %d: %d maletas entregadas, %d en tránsito",
                                        hora, maletasEntregadas, maletasEnTransito))
                                .build());
                    }

                    actualizarEstadoEnCache(sessionId, simTime, dataset, cargaVuelo, ocupacionAeropuerto,
                            maletasEntregadas, maletasEnTransito, hora, duracionHoras, false, null, logs, "EJECUTANDO");

                    long sleepMs = (long) (3000.0 / Math.max(0.5, velocidad));
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
                    SimulationState finalState = simulationCache.get(sessionId);
                    if (finalState != null) {
                        SimulationState completed = SimulationState.builder()
                                .sessionId(sessionId)
                                .status("COMPLETADA")
                                .simulationTime(finalState.getSimulationTime())
                                .vuelos(finalState.getVuelos())
                                .aeropuertos(finalState.getAeropuertos())
                                .maletasEntregadas(finalState.getMaletasEntregadas())
                                .maletasEnTransito(finalState.getMaletasEnTransito())
                                .progreso(100)
                                .colapsada(false)
                                .logs(finalState.getLogs())
                                .build();
                        simulationCache.put(sessionId, completed);
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                System.err.println("[ERROR] Simulación " + sessionId + " falló: " + e.getMessage());
                e.printStackTrace();
                try {
                    var session = sessionRepository.findById(sessionId).orElse(null);
                    if (session != null) {
                        session.setEstado("ERROR");
                        session.setMotivoColapso("Error interno: " + e.getMessage());
                        sessionRepository.save(session);
                    }
                } catch (Exception ignored) {}
            } finally {
                activeSimulations.remove(sessionId);
                cancellationFlags.remove(sessionId);
                pauseFlags.remove(sessionId);
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
        pauseFlags.remove(sessionId);
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
                                          String motivo, List<LogEntry> logs, String status) {
        // Monotonicity guard: never let simulation time/progress go backwards
        SimulationState prevState = simulationCache.get(sessionId);
        int prevHora = 0;
        int prevProgreso = 0;
        int prevEntregadas = 0;
        int prevTransito = 0;
        if (prevState != null) {
            prevHora = (prevState.getProgreso() * totalHoras) / 100;
            prevProgreso = prevState.getProgreso();
            prevEntregadas = prevState.getMaletasEntregadas();
            prevTransito = prevState.getMaletasEnTransito();
        }
        int horaEfectiva = Math.max(hora, prevHora);
        int progresoSim = Math.min(100, totalHoras > 0 ? (horaEfectiva * 100) / totalHoras : 0);
        progresoSim = Math.max(progresoSim, prevProgreso);
        maletasEntregadas = Math.max(maletasEntregadas, prevEntregadas);
        maletasEnTransito = Math.max(maletasEnTransito, prevTransito);

        int[] vuelosCulminados = {0};
        int[] vuelosEnTransito = {0};
        int[] vuelosCancelados = {0};

        long vuelosConCarga = cargaVuelo.values().stream().filter(c -> c > 0).count();
        if (!cargaVuelo.isEmpty()) {
            System.out.printf("[DEBUG actualizarEstadoEnCache] status=%s cargaVuelo.size=%d vuelosConCarga=%d totalMaletas=%d%n",
                    status, cargaVuelo.size(), vuelosConCarga, cargaVuelo.values().stream().mapToInt(Integer::intValue).sum());
        }

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
            if (progreso >= 100.0) vuelosCulminados[0]++;
            else if (progreso > 0.0) vuelosEnTransito[0]++;
            else if (simTime != null && v.getSalidaUtc() != null && simTime.isAfter(v.getSalidaUtc())) vuelosCancelados[0]++;

            double[] origCoord = AeropuertoCoordenadas.get(v.getOrigen().getCodigoOACI());
            double[] destCoord = AeropuertoCoordenadas.get(v.getDestino().getCodigoOACI());
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

        int totalVuelosDataset = dataset.getVuelos() != null ? dataset.getVuelos().size() : 0;
        List<AeropuertoDTO> aeropuertosDTO = dataset.getAeropuertos().values().stream().map(a -> {
            double[] coord = AeropuertoCoordenadas.get(a.getCodigoOACI());
            int ocup = ocupacionAeropuerto.getOrDefault(a.getCodigoOACI(), 0);
            List<String> entrantes = dataset.getVuelos().stream()
                    .filter(v -> v.getDestino().getCodigoOACI().equals(a.getCodigoOACI()))
                    .map(Vuelo::getId)
                    .collect(Collectors.toList());
            List<String> salientes = dataset.getVuelos().stream()
                    .filter(v -> v.getOrigen().getCodigoOACI().equals(a.getCodigoOACI()))
                    .map(Vuelo::getId)
                    .collect(Collectors.toList());
            if (totalVuelosDataset > 0 && entrantes.size() + salientes.size() > 0) {
                System.out.printf("[DEBUG AeropuertoDTO] %s: entrantes=%d salientes=%d%n",
                        a.getCodigoOACI(), entrantes.size(), salientes.size());
            }
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
                .status(status)
                .simulationTime(simTime)
                .vuelos(vuelosDTO)
                .aeropuertos(aeropuertosDTO)
                .maletasEntregadas(maletasEntregadas)
                .maletasEnTransito(maletasEnTransito)
                .vuelosCulminados(vuelosCulminados[0])
                .vuelosEnTransito(vuelosEnTransito[0])
                .vuelosCancelados(vuelosCancelados[0])
                .progreso(progresoSim)
                .colapsada(colapsada)
                .motivoColapso(motivo)
                .logs(new ArrayList<>(logs))
                .build();

        simulationCache.put(sessionId, state);
    }

    private void actualizarEstadoPlanificando(String sessionId, String mensaje) {
        SimulationState current = simulationCache.get(sessionId);
        if (current == null) return;
        List<LogEntry> logs = new ArrayList<>(current.getLogs() != null ? current.getLogs() : new ArrayList<>());
        logs.add(LogEntry.builder()
                .timestamp(LocalDateTime.now())
                .tipo("INFO")
                .mensaje(mensaje)
                .build());
        SimulationState updated = SimulationState.builder()
                .sessionId(sessionId)
                .status("PLANIFICANDO")
                .simulationTime(current.getSimulationTime())
                .vuelos(current.getVuelos())
                .aeropuertos(current.getAeropuertos())
                .maletasEntregadas(0)
                .maletasEnTransito(0)
                .progreso(0)
                .colapsada(false)
                .logs(logs)
                .build();
        simulationCache.put(sessionId, updated);
    }

    private void actualizarEstadoEjecutando(String sessionId, LocalDateTime fechaInicio, List<LogEntry> logs) {
        SimulationState updated = SimulationState.builder()
                .sessionId(sessionId)
                .status("EJECUTANDO")
                .simulationTime(fechaInicio)
                .vuelos(new ArrayList<>())
                .aeropuertos(new ArrayList<>())
                .maletasEntregadas(0)
                .maletasEnTransito(0)
                .progreso(0)
                .colapsada(false)
                .logs(logs)
                .build();
        simulationCache.put(sessionId, updated);
    }

    private void actualizarEstadoColapsado(String sessionId, LocalDateTime simTime, String motivo, List<LogEntry> logs) {
        SimulationState updated = SimulationState.builder()
                .sessionId(sessionId)
                .status("COLAPSADA")
                .simulationTime(simTime)
                .vuelos(new ArrayList<>())
                .aeropuertos(new ArrayList<>())
                .maletasEntregadas(0)
                .maletasEnTransito(0)
                .progreso(0)
                .colapsada(true)
                .motivoColapso(motivo)
                .logs(logs)
                .build();
        simulationCache.put(sessionId, updated);
    }
}
