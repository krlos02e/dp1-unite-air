package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/vuelos")
public class VueloController {

    @Autowired
    private CargaArchivosService cargaArchivosService;

    @PostMapping("/cancelar")
    public ResponseEntity<Map<String, Object>> cancelarVuelo(@RequestBody CancelacionRequest request) {
        try {
            String vueloId = cargaArchivosService.cancelarVuelo(
                    request.origen(),
                    request.destino(),
                    request.horaSalidaLocal()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Vuelo cancelado correctamente",
                    "vueloId", vueloId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/cancelados")
    public ResponseEntity<Set<String>> obtenerVuelosCancelados() {
        return ResponseEntity.ok(cargaArchivosService.obtenerVuelosCancelados());
    }

    public record CancelacionRequest(String origen, String destino, String horaSalidaLocal) {}
}
