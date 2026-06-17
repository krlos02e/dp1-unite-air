package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.uniteair.dp1backend.config.AeropuertoCoordenadas;
import pe.edu.pucp.uniteair.dp1backend.dto.AeropuertoDTO;
import pe.edu.pucp.uniteair.dp1backend.dto.VueloDTO;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;
import tasf.core.Dataset;
import tasf.model.Vuelo;

import java.time.LocalDateTime;
import java.util.ArrayList;
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
        LocalDateTime ahora = LocalDateTime.now();
        List<AeropuertoDTO> aeropuertos = dataset.getAeropuertos().values().stream()
                .map(a -> {
                    double[] coord = AeropuertoCoordenadas.get(a.getCodigoOACI());
                    int ocup = cargaArchivosService.getOcupacionAeropuerto(a.getCodigoOACI(), ahora);
                    return AeropuertoDTO.builder()
                            .codigoOACI(a.getCodigoOACI())
                            .latitud(coord[0])
                            .longitud(coord[1])
                            .capacidadMaxima(a.getCapacidadMaxima())
                            .ocupacionActual(ocup)
                            .vuelosEntrantes(List.of())
                            .vuelosSalientes(List.of())
                            .build();
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(aeropuertos);
    }

    @GetMapping("/vuelos")
    public ResponseEntity<List<VueloDTO>> obtenerVuelos() {
        Dataset dataset = cargaArchivosService.obtenerUltimoDataset();
        if (dataset == null) {
            return ResponseEntity.ok(List.of());
        }
        List<VueloDTO> vuelos = new ArrayList<>();
        for (Vuelo v : dataset.getVuelos()) {
            double[] orig = AeropuertoCoordenadas.get(v.getOrigen().getCodigoOACI());
            double[] dest = AeropuertoCoordenadas.get(v.getDestino().getCodigoOACI());
            int carga = cargaArchivosService.getCargaVuelo(v.getId());
            vuelos.add(VueloDTO.builder()
                    .id(v.getId())
                    .origen(v.getOrigen().getCodigoOACI())
                    .destino(v.getDestino().getCodigoOACI())
                    .latOrigen(orig[0])
                    .lonOrigen(orig[1])
                    .latDestino(dest[0])
                    .lonDestino(dest[1])
                    .salidaUtc(v.getSalidaUtc())
                    .llegadaUtc(v.getLlegadaUtc())
                    .capacidad(v.getCapacidadCarga())
                    .cargaActual(carga)
                    .progresoVuelo(0)
                    .build());
        }
        return ResponseEntity.ok(vuelos);
    }
}
