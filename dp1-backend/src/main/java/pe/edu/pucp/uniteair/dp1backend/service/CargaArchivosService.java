package pe.edu.pucp.uniteair.dp1backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tasf.config.Config_Simulacion;
import tasf.core.Dataset;
import tasf.core.EstadoOperacional;
import tasf.core.PlanificacionUtils;
import tasf.core.Solucion;
import tasf.io.DatasetTextoLoader;
import tasf.model.Aeropuerto;
import tasf.model.Paquete;
import tasf.model.Ruta;
import tasf.model.Vuelo;
import tasf.strategy.TwoPhaseOrchestrator;
import tasf.strategy.alns.ALNS_RutasPlanner;

import java.time.ZoneOffset;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class CargaArchivosService {

    private Dataset lastDataset;
    private volatile EstadoOperacional estadoOperacional;
    private volatile Map<String, Integer> cargaVueloCache;
    private volatile Map<String, Ruta> rutasAsignadas = new HashMap<>();
    private volatile boolean planificando = false;
    private volatile Set<String> vuelosCancelados = new HashSet<>();
    private volatile List<Paquete> paquetesIncrementales = new ArrayList<>();
    private int contadorPaquetesIncrementales = 0;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "planificador-bg");
        t.setDaemon(true);
        return t;
    });

    public record CargaResult(boolean success, String message, int aeropuertosCount, int vuelosCount,
                              int paquetesCount, String datasetId) {}

    @PostConstruct
    public void init() {
        cargarDatasetPorDefecto();
    }

    public synchronized void cargarDatasetPorDefecto() {
        if (this.lastDataset != null) return;
        try {
            Path tempDir = Files.createTempDirectory("default_carga_");
            copiarRecursosACarpeta(tempDir);
            Dataset dataset = cargarDatasetEnTemp(tempDir, LocalDate.now(), 3);
            this.lastDataset = dataset;
            this.estadoOperacional = null;
            this.cargaVueloCache = null;
            this.rutasAsignadas = new HashMap<>();
            this.planificando = false;
            deleteTempDir(tempDir);
            System.out.println("[CargaArchivosService] Dataset por defecto cargado. Paquetes: " + dataset.getPaquetes().size());
            lanzarPlanificacionEnBackground(dataset);
        } catch (Exception e) {
            System.err.println("No se pudo cargar dataset por defecto: " + e.getMessage());
        }
    }

    public synchronized void cargarDatasetConFechas(LocalDate fechaInicio, int dias) {
        try {
            Path tempDir = Files.createTempDirectory("simulacion_carga_");
            copiarRecursosACarpeta(tempDir);
            Dataset dataset = cargarDatasetEnTemp(tempDir, fechaInicio, dias);
            this.lastDataset = dataset;
            this.estadoOperacional = null;
            this.cargaVueloCache = null;
            this.rutasAsignadas = new HashMap<>();
            this.planificando = false;
            deleteTempDir(tempDir);
            lanzarPlanificacionEnBackground(dataset);
        } catch (Exception e) {
            System.err.println("No se pudo cargar dataset con fechas: " + e.getMessage());
        }
    }

    private void lanzarPlanificacionEnBackground(Dataset dataset) {
        if (dataset == null || dataset.getPaquetes().isEmpty()) return;
        if (planificando) return;
        planificando = true;
        executor.submit(() -> {
            try {
                planificarDataset(dataset);
            } finally {
                planificando = false;
            }
        });
    }

    private Dataset cargarDatasetEnTemp(Path tempDir, LocalDate fechaInicio, int dias) throws IOException {
        int diasVuelos = dias + 2;
        Set<LocalDate> fechasFiltro = generarFechasSimulacion(fechaInicio, dias);
        return DatasetTextoLoader.cargarDataset(tempDir, fechaInicio, diasVuelos, 50000, fechasFiltro);
    }

    private Set<LocalDate> generarFechasSimulacion(LocalDate inicio, int dias) {
        return IntStream.range(0, dias)
                .mapToObj(inicio::plusDays)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private static final String[] ICAO_ENVIOS = {
        "EBCI","EDDI","EHAM","EKCH","LATI","LBSF","LDZA","LKPR","LOWW",
        "OAKB","OERK","OJAI","OMDB","OOMS","OPKC","OSDI","OYSN",
        "SABE","SBBR","SCEL","SEQM","SGAS","SKBO",
        "SLLP","SPIM","SUAA","SVMI","UBBB","UMMS","VIDP"
    };

    private void copiarRecursosACarpeta(Path destino) throws IOException {
        copiarRecurso("default-data/input/aeropuertos/c.1inf54.26.1.v1.Aeropuerto.husos.v1.20250818__estudiantes.txt",
                destino.resolve("input/aeropuertos/c.Aeropuerto.txt"));
        copiarRecurso("default-data/input/vuelos/planes_vuelo.txt",
                destino.resolve("input/vuelos/planes_vuelo.txt"));
        for (String icao : ICAO_ENVIOS) {
            copiarRecurso("default-data/input/envios/_envios_" + icao + "_.txt",
                    destino.resolve("input/envios/_envios_" + icao + "_.txt"));
        }
    }

    private void copiarRecurso(String classpath, Path destino) throws IOException {
        Files.createDirectories(destino.getParent());
        try (InputStream is = getClass().getClassLoader().getResourceAsStream(classpath)) {
            if (is == null) {
                System.err.println("[WARN] Recurso no encontrado, se omite: " + classpath);
                return;
            }
            Files.copy(is, destino, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    public synchronized CargaResult cargarArchivos(MultipartFile planesVuelo, MultipartFile aeropuertosFile, MultipartFile envios) {
        try {
            Path tempDir = Files.createTempDirectory("carga_");
            if (planesVuelo != null && !planesVuelo.isEmpty()) {
                saveToTemp(tempDir.resolve("input").resolve("vuelos"), planesVuelo, "planes_vuelo.txt");
            }
            if (aeropuertosFile != null && !aeropuertosFile.isEmpty()) {
                saveToTemp(tempDir.resolve("input").resolve("aeropuertos"), aeropuertosFile, "aeropuerto.txt");
            }
            if (envios != null && !envios.isEmpty()) {
                saveToTemp(tempDir.resolve("input").resolve("envios"), envios, "_envios_SKBO_.txt");
            }

            LocalDate fechaInicio = LocalDate.now();
            Set<LocalDate> fechasFiltro = generarFechasSimulacion(fechaInicio, 3);
            Dataset dataset = DatasetTextoLoader.cargarDataset(tempDir, fechaInicio, 3, 50000, fechasFiltro);

            int aeropuertosCount = dataset.getAeropuertos().size();
            int vuelosCount = dataset.getVuelos().size();
            int paquetesCount = dataset.getPaquetes().size();

            String datasetId = UUID.randomUUID().toString();
            this.lastDataset = dataset;
            this.estadoOperacional = null;
            this.cargaVueloCache = null;
            this.rutasAsignadas = new HashMap<>();
            this.planificando = false;
            lanzarPlanificacionEnBackground(dataset);

            deleteTempDir(tempDir);

            return new CargaResult(true, "Archivos cargados exitosamente", aeropuertosCount, vuelosCount, paquetesCount, datasetId);
        } catch (Exception e) {
            return new CargaResult(false, "Error al cargar archivos: " + e.getMessage(), 0, 0, 0, null);
        }
    }

    public synchronized Dataset obtenerUltimoDataset() {
        return lastDataset;
    }

    public synchronized EstadoOperacional obtenerEstadoOperacional() {
        return estadoOperacional;
    }

    public synchronized boolean isPlanificando() {
        return planificando;
    }

    public int getCargaVuelo(String vueloId) {
        Map<String, Integer> cache = cargaVueloCache;
        return cache != null ? cache.getOrDefault(vueloId, 0) : 0;
    }

    public int getOcupacionAeropuerto(String codigoOACI, LocalDateTime horaUtc) {
        EstadoOperacional estado = estadoOperacional;
        return estado != null ? estado.getOcupacionHora(codigoOACI, horaUtc) : 0;
    }

    private void planificarDataset(Dataset dataset) {
        if (dataset == null || dataset.getPaquetes().isEmpty()) {
            this.estadoOperacional = new EstadoOperacional();
            this.cargaVueloCache = new HashMap<>();
            return;
        }
        try {
            Config_Simulacion config = new Config_Simulacion();
            config.setAeropuertoHub("SKBO");
            config.setMinimaConexion(java.time.Duration.ofMinutes(10));
            config.setIteracionesALNS(20);
            config.setMaxRutasPorPaquete(4);
            config.setMaxEscalas(2);
            config.setVentanaActualizacionPesos(5);
            config.setEvaporacionFeromona(0.4);

            PlanificacionUtils.limpiarCacheGlobal();
            TwoPhaseOrchestrator orchestrator = new TwoPhaseOrchestrator(new ALNS_RutasPlanner());
            var solucion = orchestrator.ejecutarFlujoCompleto(dataset, config);
            var rutas = solucion.getRutasAsignadas();

            this.rutasAsignadas = new HashMap<>(rutas);
            this.estadoOperacional = PlanificacionUtils.construirEstadoConAsignaciones(rutas, dataset, config);
            Map<String, Integer> nuevoCache = new HashMap<>();
            for (Vuelo v : dataset.getVuelos()) {
                int carga = this.estadoOperacional.getCargaVuelo(v.getId());
                if (carga > 0) {
                    nuevoCache.put(v.getId(), carga);
                }
            }
            this.cargaVueloCache = nuevoCache;
            System.out.println("[CargaArchivosService] Planificación completada. Rutas: " + rutas.size()
                    + ", CargaVuelo entries: " + nuevoCache.size());
        } catch (Exception e) {
            System.err.println("[CargaArchivosService] Error en planificación: " + e.getMessage());
            e.printStackTrace();
            this.estadoOperacional = new EstadoOperacional();
            this.cargaVueloCache = new HashMap<>();
        }
    }

    private void saveToTemp(Path dir, MultipartFile file, String filename) throws IOException {
        Files.createDirectories(dir);
        File dest = new File(dir.toFile(), filename);
        file.transferTo(dest);
    }

    private void deleteTempDir(Path tempDir) {
        try {
            Files.walk(tempDir)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
        } catch (IOException ignored) {
        }
    }

    public synchronized Set<String> obtenerPaquetesEnVuelo(LocalDateTime ahora) {
        Set<String> enVuelo = new HashSet<>();
        if (rutasAsignadas.isEmpty() || lastDataset == null) return enVuelo;

        for (Map.Entry<String, Ruta> entry : rutasAsignadas.entrySet()) {
            String paqueteId = entry.getKey();
            Ruta ruta = entry.getValue();

            for (Vuelo vuelo : ruta.getVuelos()) {
                if (!ahora.isBefore(vuelo.getSalidaUtc()) && ahora.isBefore(vuelo.getLlegadaUtc())) {
                    enVuelo.add(paqueteId);
                    break;
                }
            }
        }
        return enVuelo;
    }

    public synchronized Dataset filtrarDatasetPorVentana(
            LocalDateTime inicio,
            LocalDateTime fin,
            Set<String> excluirPaquetes
    ) {
        if (lastDataset == null) {
            return new Dataset(Map.of(), List.of(), List.of());
        }

        List<Paquete> paquetesFiltrados = new ArrayList<>();
        Set<String> aeropuertosInvolucrados = new HashSet<>();

        for (Paquete p : lastDataset.getPaquetes()) {
            if (excluirPaquetes.contains(p.getId())) continue;

            Aeropuerto aeropuertoOrigen = lastDataset.getAeropuerto(p.getOrigenOACI());
            if (aeropuertoOrigen == null) continue;

            LocalDateTime creacion = p.getInstanteCreacionUtc(aeropuertoOrigen);
            if (!creacion.isBefore(inicio) && !creacion.isAfter(fin)) {
                paquetesFiltrados.add(p);
                aeropuertosInvolucrados.add(p.getOrigenOACI());
                aeropuertosInvolucrados.add(p.getDestinoOACI());
            }
        }

        for (Paquete p : paquetesIncrementales) {
            if (excluirPaquetes.contains(p.getId())) continue;

            Aeropuerto aeropuertoOrigen = lastDataset.getAeropuerto(p.getOrigenOACI());
            if (aeropuertoOrigen == null) continue;

            LocalDateTime creacion = p.getInstanteCreacionUtc(aeropuertoOrigen);
            if (!creacion.isBefore(inicio) && !creacion.isAfter(fin)) {
                paquetesFiltrados.add(p);
                aeropuertosInvolucrados.add(p.getOrigenOACI());
                aeropuertosInvolucrados.add(p.getDestinoOACI());
            }
        }

        List<Vuelo> vuelosFiltrados = new ArrayList<>();
        for (Vuelo v : lastDataset.getVuelos()) {
            if (vuelosCancelados.contains(v.getId())) continue;

            LocalDateTime salida = v.getSalidaUtc();
            if (!salida.isBefore(inicio) && !salida.isAfter(fin)) {
                if (aeropuertosInvolucrados.contains(v.getOrigen().getCodigoOACI())
                        || aeropuertosInvolucrados.contains(v.getDestino().getCodigoOACI())) {
                    vuelosFiltrados.add(v);
                }
            }
        }

        Map<String, Aeropuerto> aeropuertosFiltrados = new HashMap<>();
        for (String codigo : aeropuertosInvolucrados) {
            Aeropuerto a = lastDataset.getAeropuerto(codigo);
            if (a != null) aeropuertosFiltrados.put(codigo, a);
        }

        return new Dataset(aeropuertosFiltrados, vuelosFiltrados, paquetesFiltrados);
    }

    public synchronized void actualizarEstadoOperacional(
            Solucion solucion,
            Dataset dataset,
            Config_Simulacion config
    ) {
        Map<String, Ruta> rutas = solucion.getRutasAsignadas();
        this.rutasAsignadas = new HashMap<>(rutas);
        this.estadoOperacional = PlanificacionUtils.construirEstadoConAsignaciones(rutas, dataset, config);

        Map<String, Integer> nuevoCache = new HashMap<>();
        for (Vuelo v : dataset.getVuelos()) {
            int carga = this.estadoOperacional.getCargaVuelo(v.getId());
            if (carga > 0) {
                nuevoCache.put(v.getId(), carga);
            }
        }
        this.cargaVueloCache = nuevoCache;
    }

    public synchronized Map<String, Ruta> obtenerRutasAsignadas() {
        return new HashMap<>(rutasAsignadas);
    }

    public synchronized String cancelarVuelo(String origen, String destino, String horaSalidaLocal) {
        if (lastDataset == null) {
            throw new IllegalStateException("No hay dataset cargado");
        }

        LocalDateTime ahoraUtc = LocalDateTime.now(ZoneOffset.UTC);
        LocalTime horaSalida = LocalTime.parse(horaSalidaLocal);
        LocalDate hoy = ahoraUtc.toLocalDate();

        Vuelo vueloHoy = buscarVuelo(origen, destino, hoy, horaSalida);

        if (vueloHoy == null) {
            throw new IllegalArgumentException(
                    "No se encontro vuelo " + origen + "-" + destino + " a las " + horaSalidaLocal + " para hoy " + hoy
            );
        }

        long minutosParaSalida = java.time.Duration.between(ahoraUtc, vueloHoy.getSalidaUtc()).toMinutes();

        Vuelo vueloACancelar;
        if (minutosParaSalida > 60) {
            vueloACancelar = vueloHoy;
        } else {
            LocalDate manana = hoy.plusDays(1);
            vueloACancelar = buscarVuelo(origen, destino, manana, horaSalida);
            if (vueloACancelar == null) {
                throw new IllegalArgumentException(
                        "No se encontro vuelo " + origen + "-" + destino + " a las " + horaSalidaLocal + " para manana " + manana
                );
            }
        }

        vuelosCancelados.add(vueloACancelar.getId());
        System.out.println("[CargaArchivosService] Vuelo cancelado: " + vueloACancelar.getId()
                + " (minutos para salida: " + minutosParaSalida + ")");
        return vueloACancelar.getId();
    }

    private Vuelo buscarVuelo(String origen, String destino, LocalDate fecha, LocalTime horaSalidaLocal) {
        if (lastDataset == null) return null;

        for (Vuelo v : lastDataset.getVuelos()) {
            if (v.getOrigen().getCodigoOACI().equals(origen)
                    && v.getDestino().getCodigoOACI().equals(destino)
                    && v.getSalidaUtc().toLocalDate().equals(fecha)
                    && v.getSalidaUtc().toLocalTime().equals(horaSalidaLocal)) {
                return v;
            }
        }
        return null;
    }

    public synchronized Set<String> obtenerVuelosCancelados() {
        return new HashSet<>(vuelosCancelados);
    }

    public synchronized List<Paquete> agregarEnvios(List<EnvioEntrada> envios) {
        if (lastDataset == null) {
            throw new IllegalStateException("No hay dataset cargado");
        }

        List<Paquete> nuevos = new ArrayList<>();
        for (EnvioEntrada e : envios) {
            Aeropuerto origenAp = lastDataset.getAeropuerto(e.origen());
            if (origenAp == null) {
                throw new IllegalArgumentException("Aeropuerto origen no encontrado: " + e.origen());
            }
            Aeropuerto destinoAp = lastDataset.getAeropuerto(e.destino());
            if (destinoAp == null) {
                throw new IllegalArgumentException("Aeropuerto destino no encontrado: " + e.destino());
            }

            Aeropuerto remitenteAp = null;
            if (e.remitente() != null && !e.remitente().isEmpty()) {
                remitenteAp = lastDataset.getAeropuerto(e.remitente());
                if (remitenteAp == null) {
                    throw new IllegalArgumentException("Aeropuerto del remitente no encontrado: " + e.remitente());
                }
            }

            LocalDateTime utc;
            if (remitenteAp != null) {
                LocalDateTime horaRemitente = LocalDateTime.of(e.fecha(), e.hora());
                LocalDateTime horaUtc = horaRemitente.minusMinutes(remitenteAp.getGmtOffsetMinutos());
                LocalDateTime horaOrigenLocal = horaUtc.plusMinutes(origenAp.getGmtOffsetMinutos());
                utc = horaOrigenLocal.minusMinutes(origenAp.getGmtOffsetMinutos());
            } else {
                utc = origenAp.convertirLocalAUTC(e.fecha(), e.hora());
            }

            contadorPaquetesIncrementales++;
            String id = "INC-" + contadorPaquetesIncrementales + "-" + e.origen() + "-" + e.destino();

            Paquete paquete = new Paquete(
                    id,
                    e.origen(),
                    utc.toLocalDate(),
                    utc.toLocalTime(),
                    e.destino(),
                    e.cantidad(),
                    "incremental"
            );
            nuevos.add(paquete);
        }

        List<Paquete> listaActualizada = new ArrayList<>(paquetesIncrementales);
        listaActualizada.addAll(nuevos);
        this.paquetesIncrementales = listaActualizada;

        System.out.println("[CargaArchivosService] Envios incrementales agregados: " + nuevos.size()
                + ". Total acumulados: " + paquetesIncrementales.size());
        return nuevos;
    }

    public synchronized List<Paquete> obtenerPaquetesIncrementales() {
        return new ArrayList<>(paquetesIncrementales);
    }

    public record EnvioEntrada(String origen, String destino, LocalDate fecha, LocalTime hora, int cantidad, String remitente) {}
}
