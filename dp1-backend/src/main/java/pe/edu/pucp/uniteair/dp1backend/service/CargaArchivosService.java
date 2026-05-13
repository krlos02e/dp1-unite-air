package pe.edu.pucp.uniteair.dp1backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tasf.core.Dataset;
import tasf.io.DatasetTextoLoader;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class CargaArchivosService {

    private Dataset lastDataset;

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
            deleteTempDir(tempDir);
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
            deleteTempDir(tempDir);
        } catch (Exception e) {
            System.err.println("No se pudo cargar dataset con fechas: " + e.getMessage());
        }
    }

    private Dataset cargarDatasetEnTemp(Path tempDir, LocalDate fechaInicio, int dias) throws IOException {
        Set<LocalDate> fechasFiltro = generarFechasSimulacion(fechaInicio, dias);
        return DatasetTextoLoader.cargarDataset(tempDir, fechaInicio, dias, 50000, fechasFiltro);
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

            deleteTempDir(tempDir);

            return new CargaResult(true, "Archivos cargados exitosamente", aeropuertosCount, vuelosCount, paquetesCount, datasetId);
        } catch (Exception e) {
            return new CargaResult(false, "Error al cargar archivos: " + e.getMessage(), 0, 0, 0, null);
        }
    }

    public synchronized Dataset obtenerUltimoDataset() {
        return lastDataset;
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
}
