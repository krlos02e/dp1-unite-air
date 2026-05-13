package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;

import java.util.Map;

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
}
