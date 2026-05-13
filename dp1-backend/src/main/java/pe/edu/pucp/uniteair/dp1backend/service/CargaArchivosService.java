package pe.edu.pucp.uniteair.dp1backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tasf.core.Dataset;
import tasf.io.DatasetTextoLoader;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class CargaArchivosService {

    private Dataset lastDataset;

    public record CargaResult(boolean success, String message, int aeropuertosCount, int vuelosCount,
                              int paquetesCount, String datasetId) {}

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

            Dataset dataset = DatasetTextoLoader.cargarDataset(tempDir, LocalDate.now(), 3, 50000);

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
                    .sorted(java.util.Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
        } catch (IOException ignored) {
        }
    }
}
