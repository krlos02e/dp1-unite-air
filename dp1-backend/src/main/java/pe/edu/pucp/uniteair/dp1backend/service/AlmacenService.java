package pe.edu.pucp.uniteair.dp1backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.uniteair.dp1backend.config.AeropuertoCoordenadas;
import pe.edu.pucp.uniteair.dp1backend.entity.Almacen;
import pe.edu.pucp.uniteair.dp1backend.repository.AlmacenRepository;
import tasf.core.Dataset;
import tasf.model.Aeropuerto;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class AlmacenService {

    private final AlmacenRepository almacenRepository;
    private final CargaArchivosService cargaArchivosService;

    public AlmacenService(AlmacenRepository almacenRepository, CargaArchivosService cargaArchivosService) {
        this.almacenRepository = almacenRepository;
        this.cargaArchivosService = cargaArchivosService;
    }

    @PostConstruct
    public void inicializar() {
        if (almacenRepository.count() > 0) return;
        seedDesdeArchivo();
    }

    private void seedDesdeArchivo() {
        Set<String> codigosSeed = new HashSet<>();

        // First try parsing from text file (has ciudad/pais)
        try (InputStream is = getClass().getClassLoader().getResourceAsStream(
                "default-data/input/aeropuertos/c.1inf54.26.1.v1.Aeropuerto.husos.v1.20250818__estudiantes.txt")) {
            if (is != null) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_16))) {
                    String linea;
                    while ((linea = reader.readLine()) != null) {
                        if (linea.length() < 60) continue;
                        try {
                            String codigo = linea.substring(2, 8).trim();
                            String ciudad = linea.substring(8, 24).trim();
                            String pais = linea.substring(24, 40).trim();
                            String gmtStr = linea.substring(40, 48).trim();
                            int gmtOffset = parseGmtOffset(gmtStr);
                            String capStr = linea.substring(48, 60).trim();
                            int capacidad = Integer.parseInt(capStr);
                            double[] coord = AeropuertoCoordenadas.get(codigo);
                            String continente = determinarContinente(codigo);

                            Almacen almacen = Almacen.builder()
                                    .codigoOACI(codigo)
                                    .ciudad(ciudad)
                                    .pais(pais)
                                    .continente(continente)
                                    .gmtOffsetMinutos(gmtOffset)
                                    .capacidadMaxima(capacidad)
                                    .latitud(coord[0])
                                    .longitud(coord[1])
                                    .build();
                            almacenRepository.save(almacen);
                            codigosSeed.add(codigo);
                        } catch (Exception ignored) {
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[AlmacenService] Error seeding desde archivo: " + e.getMessage());
        }

        // Fallback: seed remaining from Dataset (no ciudad/pais available)
        try {
            Dataset dataset = cargaArchivosService.obtenerUltimoDataset();
            if (dataset != null && !dataset.getAeropuertos().isEmpty()) {
                for (Aeropuerto a : dataset.getAeropuertos().values()) {
                    if (codigosSeed.contains(a.getCodigoOACI())) continue;
                    if (almacenRepository.existsById(a.getCodigoOACI())) continue;
                    double[] coord = AeropuertoCoordenadas.get(a.getCodigoOACI());
                    Almacen almacen = Almacen.builder()
                            .codigoOACI(a.getCodigoOACI())
                            .continente(a.getContinente().name())
                            .gmtOffsetMinutos(a.getGmtOffsetMinutos())
                            .capacidadMaxima(a.getCapacidadMaxima())
                            .latitud(coord[0])
                            .longitud(coord[1])
                            .build();
                    almacenRepository.save(almacen);
                }
            }
        } catch (Exception e) {
            System.err.println("[AlmacenService] No se pudo seed desde dataset: " + e.getMessage());
        }
    }

    private int parseGmtOffset(String gmtStr) {
        try {
            gmtStr = gmtStr.trim();
            if (gmtStr.isEmpty()) return 0;
            boolean negativo = gmtStr.startsWith("-");
            String num = gmtStr.replaceAll("[^\\d]", "");
            if (num.isEmpty()) return 0;
            int val = Integer.parseInt(num);
            return negativo ? -val : val;
        } catch (Exception e) {
            return 0;
        }
    }

    private String determinarContinente(String codigoOACI) {
        char first = codigoOACI.charAt(0);
        if (first == 'K' || first == 'C' || first == 'S' || first == 'M' || first == 'T' || first == 'P') {
            return "AMERICA";
        } else if (first == 'E' || first == 'L' || first == 'U' || first == 'B') {
            return "EUROPA";
        } else if (first == 'O' || first == 'V' || first == 'R' || first == 'Z' || first == 'D' || first == 'F' || first == 'H') {
            return "ASIA";
        }
        return "AMERICA";
    }

    public List<Almacen> listar() {
        return almacenRepository.findAll();
    }

    public Optional<Almacen> obtenerPorId(String codigoOACI) {
        return almacenRepository.findById(codigoOACI);
    }

    @Transactional
    public Almacen crear(Almacen almacen) {
        if (almacenRepository.existsById(almacen.getCodigoOACI())) {
            throw new IllegalArgumentException("Ya existe un almacén con código " + almacen.getCodigoOACI());
        }
        return almacenRepository.save(almacen);
    }

    @Transactional
    public Almacen actualizar(String codigoOACI, Almacen datos) {
        Almacen existente = almacenRepository.findById(codigoOACI)
                .orElseThrow(() -> new IllegalArgumentException("No existe almacén " + codigoOACI));
        existente.setCiudad(datos.getCiudad());
        existente.setPais(datos.getPais());
        existente.setContinente(datos.getContinente());
        existente.setGmtOffsetMinutos(datos.getGmtOffsetMinutos());
        existente.setCapacidadMaxima(datos.getCapacidadMaxima());
        existente.setLatitud(datos.getLatitud());
        existente.setLongitud(datos.getLongitud());
        return almacenRepository.save(existente);
    }

    @Transactional
    public void eliminar(String codigoOACI) {
        if (!almacenRepository.existsById(codigoOACI)) {
            throw new IllegalArgumentException("No existe almacén " + codigoOACI);
        }
        almacenRepository.deleteById(codigoOACI);
    }

    public Map<String, Almacen> getMapaAlmacenes() {
        Map<String, Almacen> mapa = new HashMap<>();
        for (Almacen a : almacenRepository.findAll()) {
            mapa.put(a.getCodigoOACI(), a);
        }
        return mapa;
    }
}
