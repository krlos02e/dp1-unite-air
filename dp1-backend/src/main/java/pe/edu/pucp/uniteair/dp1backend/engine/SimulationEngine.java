package pe.edu.pucp.uniteair.dp1backend.engine;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import pe.edu.pucp.uniteair.dp1backend.cache.SimulationCache;
import pe.edu.pucp.uniteair.dp1backend.config.AeropuertoCoordenadas;
import pe.edu.pucp.uniteair.dp1backend.dto.*;
import pe.edu.pucp.uniteair.dp1backend.repository.SimulationSessionRepository;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;
import tasf.config.Config_Simulacion;
import tasf.core.Dataset;
import tasf.core.EstadoOperacional;
import tasf.core.PlanificacionUtils;
import tasf.core.Solucion;
import tasf.model.Aeropuerto;
import tasf.model.Paquete;
import tasf.model.Vuelo;
import tasf.model.Ruta;
import pe.edu.pucp.uniteair.dp1backend.dto.EnvioSimulacionDTO;
import tasf.strategy.TwoPhaseOrchestrator;
import tasf.strategy.PlanificadorRutasStrategy;
import tasf.strategy.alns.ALNS_RutasPlanner;

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
    private final CargaArchivosService cargaArchivosService;
    private final Map<String, CompletableFuture<Void>> activeSimulations = new ConcurrentHashMap<>();
    private final Map<String, Boolean> cancellationFlags = new ConcurrentHashMap<>();
    private final Map<String, Boolean> pauseFlags = new ConcurrentHashMap<>();

    // Precalculated caches per session to avoid O(n*m) in every update
    private final Map<String, List<AeropuertoDTO>> airportBaseCache = new ConcurrentHashMap<>();
    private final Map<String, Map<String, double[]>> flightCoordCache = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Long>> flightDurationCache = new ConcurrentHashMap<>();

    public SimulationEngine(SimulationCache simulationCache, SimulationSessionRepository sessionRepository, CargaArchivosService cargaArchivosService) {
        this.simulationCache = simulationCache;
        this.sessionRepository = sessionRepository;
        this.cargaArchivosService = cargaArchivosService;
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

        PlanificadorRutasStrategy planner = new ALNS_RutasPlanner();
                TwoPhaseOrchestrator orchestrator = new TwoPhaseOrchestrator(planner);

                PlanificacionUtils.limpiarCacheGlobal();

                // Precalculate airport and flight coordinate caches once per session
                precalcularCaches(sessionId, dataset);

                // Inicializar visualización inmediatamente con datos del dataset
                logs.add(LogEntry.builder()
                        .timestamp(fechaInicio)
                        .tipo("INFO")
                        .mensaje("Planificando rutas...")
                        .build());
                actualizarEstadoEnCache(sessionId, fechaInicio, dataset, cargaVuelo, ocupacionAeropuerto,
                        0, 0, 0, duracionHoras, false, null, logs, "PLANIFICANDO", fechaInicio, null);

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

                        // Ocupación aeropuerto (lightweight)
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
                            for (Map.Entry<String, Ruta> entry : rutasViz.entrySet()) {
                                Paquete paquete = dataset.getPaquetePorId(entry.getKey());
                                int cantidad = paquete != null ? paquete.getCantidad() : 1;
                                Ruta ruta = entry.getValue();
                                if (!ruta.getVuelos().isEmpty()) {
                                    Vuelo ultimo = ruta.getVuelos().get(ruta.getVuelos().size() - 1);
                                    if (simTime.isAfter(ultimo.getLlegadaUtc())) {
                                        vizEntregadas += cantidad;
                                        rutasEntregadasViz.add(entry.getKey());
                                    } else {
                                        vizEnTransito += cantidad;
                                    }
                                } else {
                                    vizEnTransito += cantidad;
                                }
                            }
                        }

                        if (hora > 0 && hora < duracionHoras && hora % 12 == 0) {
                            vizLogs.add(LogEntry.builder()
                                    .timestamp(simTime)
                                    .tipo("INFO")
                                    .mensaje(String.format("Planificación en curso... Hora simulada %d/%d", hora, duracionHoras))
                                    .build());
                        }

                        Map<String, Ruta> vizRutas = sol != null ? sol.getRutasAsignadas() : new HashMap<>();
                        actualizarEstadoEnCache(sessionId, simTime, dataset, cargaVuelo, ocupacionAeropuerto,
                                vizEntregadas, vizEnTransito, hora, duracionHoras, false, null, vizLogs, "PLANIFICANDO", fechaInicio, vizRutas);

                        long sleepMs = (long) (15000.0 / Math.max(0.5, velocidad));
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
                maletasEnTransito = 0;
                for (Map.Entry<String, Ruta> entry : rutas.entrySet()) {
                    Paquete paquete = dataset.getPaquetePorId(entry.getKey());
                    int cantidad = paquete != null ? paquete.getCantidad() : 1;
                    maletasEnTransito += cantidad;
                }

                // Construir EstadoOperacional de referencia con las rutas asignadas
                // Esto es la fuente de verdad para carga de vuelos y ocupacion de aeropuertos
                EstadoOperacional estadoRef = PlanificacionUtils.construirEstadoConAsignaciones(rutas, dataset, config);

                // Poblar cargaVuelo desde el estado operacional (fuente de verdad)
                cargaVuelo.clear();
                for (Vuelo v : dataset.getVuelos()) {
                    int carga = estadoRef.getCargaVuelo(v.getId());
                    if (carga > 0) {
                        cargaVuelo.put(v.getId(), carga);
                    }
                }
                System.out.println("[DIAG] cargaVuelo size=" + cargaVuelo.size());
                cargaVuelo.entrySet().stream().limit(5).forEach(e ->
                    System.out.println("[DIAG]   " + e.getKey() + " -> " + e.getValue())
                );

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

                maletasEntregadas = 0;
                maletasEnTransito = 0;
                for (Map.Entry<String, Ruta> entry : rutas.entrySet()) {
                    Paquete paquete = dataset.getPaquetePorId(entry.getKey());
                    int cantidad = paquete != null ? paquete.getCantidad() : 1;
                    Ruta ruta = entry.getValue();
                    if (!ruta.getVuelos().isEmpty()) {
                        Vuelo ultimo = ruta.getVuelos().get(ruta.getVuelos().size() - 1);
                        if (simTimeActual.isAfter(ultimo.getLlegadaUtc())) {
                            maletasEntregadas += cantidad;
                            rutasEntregadas.add(entry.getKey());
                        } else {
                            maletasEnTransito += cantidad;
                        }
                    } else {
                        maletasEnTransito += cantidad;
                    }
                }

                // Continuar simulación desde horaActual
                for (int hora = horaActual; hora <= duracionHoras; hora++) {
                    if (cancellationFlags.getOrDefault(sessionId, false)) break;
                    esperarSiPausada(sessionId);

                    LocalDateTime simTime = fechaInicio.plusHours(hora);

                    for (Map.Entry<String, Ruta> entry : rutas.entrySet()) {
                        String rutaId = entry.getKey();
                        if (rutasEntregadas.contains(rutaId)) continue;
                        Paquete paquete = dataset.getPaquetePorId(rutaId);
                        int cantidad = paquete != null ? paquete.getCantidad() : 1;
                        Ruta ruta = entry.getValue();
                        if (!ruta.getVuelos().isEmpty()) {
                            Vuelo ultimo = ruta.getVuelos().get(ruta.getVuelos().size() - 1);
                            LocalDateTime tiempoEntrega = ultimo.getLlegadaUtc().plusMinutes(15);
                            if (simTime.isAfter(tiempoEntrega)) {
                                maletasEntregadas += cantidad;
                                maletasEnTransito -= cantidad;
                                rutasEntregadas.add(rutaId);
                            }
                        }
                    }

                    for (Aeropuerto a : dataset.getAeropuertos().values()) {
                        int ocup = estadoRef.getOcupacionHora(a.getCodigoOACI(), simTime);
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
                            maletasEntregadas, maletasEnTransito, hora, duracionHoras, false, null, logs, "EJECUTANDO", fechaInicio, rutas);

                    long sleepMs = (long) (15000.0 / Math.max(0.5, velocidad));
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
                            .vuelosCulminados(finalState.getVuelosCulminados())
                            .vuelosEnTransito(finalState.getVuelosEnTransito())
                            .vuelosCancelados(finalState.getVuelosCancelados())
                            .progreso(100)
                            .colapsada(false)
                            .logs(finalState.getLogs())
                            .envios(finalState.getEnvios())
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
                airportBaseCache.remove(sessionId);
                flightCoordCache.remove(sessionId);
                flightDurationCache.remove(sessionId);
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
        airportBaseCache.remove(sessionId);
        flightCoordCache.remove(sessionId);
        flightDurationCache.remove(sessionId);
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

    private void precalcularCaches(String sessionId, Dataset dataset) {
        Map<String, List<String>> entrantesMap = new HashMap<>();
        Map<String, List<String>> salientesMap = new HashMap<>();
        for (Vuelo v : dataset.getVuelos()) {
            String origen = v.getOrigen().getCodigoOACI();
            String destino = v.getDestino().getCodigoOACI();
            entrantesMap.computeIfAbsent(destino, k -> new ArrayList<>()).add(v.getId());
            salientesMap.computeIfAbsent(origen, k -> new ArrayList<>()).add(v.getId());
        }

        List<AeropuertoDTO> airportBase = new ArrayList<>();
        for (Aeropuerto a : dataset.getAeropuertos().values()) {
            double[] coord = AeropuertoCoordenadas.get(a.getCodigoOACI());
            airportBase.add(AeropuertoDTO.builder()
                    .codigoOACI(a.getCodigoOACI())
                    .latitud(coord[0]).longitud(coord[1])
                    .capacidadMaxima(a.getCapacidadMaxima())
                    .ocupacionActual(0)
                    .vuelosEntrantes(entrantesMap.getOrDefault(a.getCodigoOACI(), new ArrayList<>()))
                    .vuelosSalientes(salientesMap.getOrDefault(a.getCodigoOACI(), new ArrayList<>()))
                    .build());
        }
        airportBaseCache.put(sessionId, airportBase);

        Map<String, double[]> flightCoords = new HashMap<>();
        Map<String, Long> flightDurations = new HashMap<>();
        for (Vuelo v : dataset.getVuelos()) {
            double[] orig = AeropuertoCoordenadas.get(v.getOrigen().getCodigoOACI());
            double[] dest = AeropuertoCoordenadas.get(v.getDestino().getCodigoOACI());
            flightCoords.put(v.getId(), new double[]{orig[0], orig[1], dest[0], dest[1]});
            if (v.getSalidaUtc() != null && v.getLlegadaUtc() != null) {
                flightDurations.put(v.getId(), ChronoUnit.MINUTES.between(v.getSalidaUtc(), v.getLlegadaUtc()));
            }
        }
        flightCoordCache.put(sessionId, flightCoords);
        flightDurationCache.put(sessionId, flightDurations);
    }

    private void actualizarEstadoEnCache(String sessionId, LocalDateTime simTime, Dataset dataset,
                                          Map<String, Integer> cargaVuelo, Map<String, Integer> ocupacionAeropuerto,
                                          int maletasEntregadas, int maletasEnTransito,
                                          int hora, int totalHoras, boolean colapsada,
                                          String motivo, List<LogEntry> logs, String status,
                                          LocalDateTime fechaInicio,
                                          Map<String, Ruta> rutasAsignadas) {
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

        int vuelosCulminados = 0;
        int vuelosEnTransito = 0;
        int vuelosCancelados = 0;

        Set<String> vuelosCanceladosSet = cargaArchivosService.obtenerVuelosCancelados();

        List<VueloDTO> vuelosDTO = new ArrayList<>();
        Map<String, double[]> flightCoords = flightCoordCache.get(sessionId);
        Map<String, Long> flightDurations = flightDurationCache.get(sessionId);
        for (Vuelo v : dataset.getVuelos()) {
            if (v.getSalidaUtc() != null && v.getSalidaUtc().isBefore(fechaInicio)) continue;

            boolean isCancelled = vuelosCanceladosSet.contains(v.getId());
            double progreso = 0.0;
            Long totalMins = (flightDurations != null) ? flightDurations.get(v.getId()) : null;
            if (simTime != null && v.getSalidaUtc() != null && v.getLlegadaUtc() != null && totalMins != null && totalMins > 0) {
                long transcurrido = ChronoUnit.MINUTES.between(v.getSalidaUtc(), simTime);
                progreso = Math.min(100.0, Math.max(0.0, (double) transcurrido / totalMins * 100));
                if (simTime.isAfter(v.getLlegadaUtc())) progreso = 100.0;
                if (simTime.isBefore(v.getSalidaUtc())) progreso = 0.0;
            } else if (simTime != null && v.getSalidaUtc() != null && v.getLlegadaUtc() != null) {
                if (simTime.isAfter(v.getLlegadaUtc())) progreso = 100.0;
                if (simTime.isBefore(v.getSalidaUtc())) progreso = 0.0;
            }

            String estado;
            if (isCancelled) {
                estado = "CANCELADO";
                vuelosCancelados++;
            } else if (progreso >= 100.0) {
                estado = "CULMINADO";
                vuelosCulminados++;
            } else if (progreso > 0.0) {
                estado = "ACTIVO";
                vuelosEnTransito++;
            } else {
                estado = "PROGRAMADO";
            }

            if (flightCoords != null) {
                double[] coords = flightCoords.get(v.getId());
                if (coords != null) {
                    vuelosDTO.add(VueloDTO.builder()
                            .id(v.getId())
                            .origen(v.getOrigen().getCodigoOACI())
                            .destino(v.getDestino().getCodigoOACI())
                            .latOrigen(coords[0]).lonOrigen(coords[1])
                            .latDestino(coords[2]).lonDestino(coords[3])
                            .salidaUtc(v.getSalidaUtc())
                            .llegadaUtc(v.getLlegadaUtc())
                            .capacidad(v.getCapacidadCarga())
                            .cargaActual(cargaVuelo.getOrDefault(v.getId(), 0))
                            .progresoVuelo(progreso)
                            .estado(estado)
                            .build());
                }
            }
        }

        // Pre-filter active flight IDs for current simTime
        Set<String> activeFlightIds = new HashSet<>();
        for (Vuelo v : dataset.getVuelos()) {
            if (v.getSalidaUtc() != null && v.getSalidaUtc().isBefore(fechaInicio)) continue;
            if (simTime != null && v.getSalidaUtc() != null && v.getLlegadaUtc() != null) {
                if (simTime.isAfter(v.getSalidaUtc()) && simTime.isBefore(v.getLlegadaUtc())) {
                    activeFlightIds.add(v.getId());
                }
            }
        }

        // Pre-calculate cancelled flights by origin airport
        Map<String, List<String>> canceladosPorOrigen = new HashMap<>();
        for (Vuelo v : dataset.getVuelos()) {
            if (vuelosCanceladosSet.contains(v.getId())) {
                String origen = v.getOrigen().getCodigoOACI();
                canceladosPorOrigen.computeIfAbsent(origen, k -> new ArrayList<>()).add(v.getId());
            }
        }

        List<AeropuertoDTO> aeropuertosDTO = new ArrayList<>();
        List<AeropuertoDTO> airportBase = airportBaseCache.get(sessionId);
        if (airportBase != null) {
            for (AeropuertoDTO base : airportBase) {
                int ocup = ocupacionAeropuerto.getOrDefault(base.getCodigoOACI(), 0);
                List<String> entrantes = base.getVuelosEntrantes().stream()
                        .filter(activeFlightIds::contains)
                        .collect(Collectors.toList());
                List<String> salientes = base.getVuelosSalientes().stream()
                        .filter(activeFlightIds::contains)
                        .collect(Collectors.toList());
                List<String> canceladosSalientes = canceladosPorOrigen.getOrDefault(base.getCodigoOACI(), new ArrayList<>());
                aeropuertosDTO.add(AeropuertoDTO.builder()
                        .codigoOACI(base.getCodigoOACI())
                        .latitud(base.getLatitud()).longitud(base.getLongitud())
                        .capacidadMaxima(base.getCapacidadMaxima())
                        .ocupacionActual(ocup)
                        .vuelosEntrantes(entrantes)
                        .vuelosSalientes(salientes)
                        .vuelosCanceladosSalientes(canceladosSalientes)
                        .build());
            }
        }

        List<EnvioSimulacionDTO> enviosDTO = new ArrayList<>();
        if (rutasAsignadas != null && simTime != null) {
            for (Map.Entry<String, Ruta> entry : rutasAsignadas.entrySet()) {
                Paquete paquete = dataset.getPaquetePorId(entry.getKey());
                if (paquete == null) continue;
                Ruta ruta = entry.getValue();
                String estado;
                String aeropuertoActual = paquete.getOrigenOACI();
                String vueloActual = null;
                String vueloEsperado = null;
                if (ruta == null || ruta.getVuelos().isEmpty()) {
                    estado = "EN_ESPERA";
                } else {
                    List<Vuelo> vuelosRuta = ruta.getVuelos();
                    Vuelo vueloEnCurso = null;
                    Vuelo proximoVuelo = null;
                    for (Vuelo v : vuelosRuta) {
                        if (!simTime.isBefore(v.getSalidaUtc()) && simTime.isBefore(v.getLlegadaUtc())) {
                            vueloEnCurso = v;
                            break;
                        }
                        if (simTime.isBefore(v.getSalidaUtc()) && proximoVuelo == null) {
                            proximoVuelo = v;
                        }
                    }
                    if (vueloEnCurso != null) {
                        estado = "EN_VUELO";
                        vueloActual = vueloEnCurso.getId();
                        aeropuertoActual = vueloEnCurso.getOrigen().getCodigoOACI();
                    } else if (simTime.isAfter(vuelosRuta.get(vuelosRuta.size() - 1).getLlegadaUtc())) {
                        estado = "ENTREGADO";
                        aeropuertoActual = paquete.getDestinoOACI();
                    } else if (proximoVuelo != null) {
                        estado = "EMBARCADO";
                        vueloEsperado = proximoVuelo.getId();
                        aeropuertoActual = proximoVuelo.getOrigen().getCodigoOACI();
                    } else {
                        estado = "EN_ESPERA";
                    }
                }
                enviosDTO.add(EnvioSimulacionDTO.builder()
                        .id(paquete.getId())
                        .origen(paquete.getOrigenOACI())
                        .destino(paquete.getDestinoOACI())
                        .estado(estado)
                        .aeropuertoActual(aeropuertoActual)
                        .vueloActual(vueloActual)
                        .vueloEsperado(vueloEsperado)
                        .cantidad(paquete.getCantidad())
                        .build());
            }
        }

        SimulationState state = SimulationState.builder()
                .sessionId(sessionId)
                .status(status)
                .simulationTime(simTime)
                .vuelos(vuelosDTO)
                .aeropuertos(aeropuertosDTO)
                .maletasEntregadas(maletasEntregadas)
                .maletasEnTransito(maletasEnTransito)
                .vuelosCulminados(vuelosCulminados)
                .vuelosEnTransito(vuelosEnTransito)
                .vuelosCancelados(vuelosCancelados)
                .progreso(progresoSim)
                .colapsada(colapsada)
                .motivoColapso(motivo)
                .logs(new ArrayList<>(logs))
                .envios(enviosDTO)
                .build();

        simulationCache.put(sessionId, state);
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
                .envios(new ArrayList<>())
                .build();
        simulationCache.put(sessionId, updated);
    }
}
