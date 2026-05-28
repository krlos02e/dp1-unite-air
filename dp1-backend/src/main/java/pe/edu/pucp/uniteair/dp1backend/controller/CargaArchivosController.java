package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.uniteair.dp1backend.config.AeropuertoCoordenadas;
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

    @GetMapping("/aeropuertos")
    public ResponseEntity<List<AeropuertoDTO>> obtenerAeropuertos() {
        Dataset dataset = cargaArchivosService.obtenerUltimoDataset();
        if (dataset == null) {
            return ResponseEntity.ok(List.of());
        }
        List<AeropuertoDTO> aeropuertos = dataset.getAeropuertos().values().stream()
                .map(a -> {
                    double[] coord = AeropuertoCoordenadas.get(a.getCodigoOACI());
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
