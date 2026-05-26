package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.uniteair.dp1backend.dto.AeropuertoDTO;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;
import tasf.core.Dataset;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/carga")
public class CargaArchivosController {

    private final CargaArchivosService cargaArchivosService;

    public CargaArchivosController(CargaArchivosService cargaArchivosService) {
        this.cargaArchivosService = cargaArchivosService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFiles(
            @RequestParam("planes_vuelo") MultipartFile planesVuelo,
            @RequestParam("aeropuertos") MultipartFile aeropuertos,
            @RequestParam("envios") MultipartFile envios) {

        var result = cargaArchivosService.cargarArchivos(planesVuelo, aeropuertos, envios);

        return ResponseEntity.ok(Map.of(
                "success", result.success(),
                "message", result.message(),
                "aeropuertosCount", result.aeropuertosCount(),
                "vuelosCount", result.vuelosCount(),
                "paquetesCount", result.paquetesCount(),
                "datasetId", result.datasetId()
        ));
    }

    private static final Map<String, double[]> COORDENADAS = Map.ofEntries(
            Map.entry("SKBO", new double[]{4.7016, -74.1469}),
            Map.entry("SEQM", new double[]{-0.1256, -78.3554}),
            Map.entry("SVMI", new double[]{10.6013, -66.9913}),
            Map.entry("EHAM", new double[]{52.3105, 4.7683}),
            Map.entry("OMDB", new double[]{25.2532, 55.3657}),
            Map.entry("VIDP", new double[]{28.5562, 77.1000}),
            Map.entry("SCEL", new double[]{-33.3930, -70.7858}),
            Map.entry("SBGR", new double[]{-23.4356, -46.4731}),
            Map.entry("KJFK", new double[]{40.6413, -73.7781}),
            Map.entry("KLAX", new double[]{33.9425, -118.4081}),
            Map.entry("EGLL", new double[]{51.4700, -0.4543}),
            Map.entry("LFPG", new double[]{49.0097, 2.5479}),
            Map.entry("RJTT", new double[]{35.5494, 139.7798}),
            Map.entry("RKSI", new double[]{37.4602, 126.4407}),
            Map.entry("WSSS", new double[]{1.3592, 103.9894}),
            Map.entry("FAOR", new double[]{-26.1392, 28.2460})
    );

    @GetMapping("/aeropuertos")
    public ResponseEntity<List<AeropuertoDTO>> obtenerAeropuertos() {
        Dataset dataset = cargaArchivosService.obtenerUltimoDataset();
        if (dataset == null) {
            return ResponseEntity.ok(List.of());
        }
        List<AeropuertoDTO> aeropuertos = dataset.getAeropuertos().values().stream()
                .map(a -> {
                    double[] coord = COORDENADAS.getOrDefault(a.getCodigoOACI(), new double[]{0, 0});
                    return AeropuertoDTO.builder()
                            .codigoOACI(a.getCodigoOACI())
                            .latitud(coord[0])
                            .longitud(coord[1])
                            .capacidadMaxima(a.getCapacidadMaxima())
                            .ocupacionActual(0)
                            .vuelosEntrantes(List.of())
                            .vuelosSalientes(List.of())
                            .build();
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(aeropuertos);
    }
}
