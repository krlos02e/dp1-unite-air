package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.uniteair.dp1backend.dto.ProgramacionVueloDTO;
import pe.edu.pucp.uniteair.dp1backend.entity.AlmacenContexto;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;
import pe.edu.pucp.uniteair.dp1backend.service.ProgramacionVueloService;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/vuelos")
public class VueloController {

    @Autowired
    private CargaArchivosService cargaArchivosService;

    @Autowired
    private ProgramacionVueloService programacionVueloService;

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

    @GetMapping("/programaciones")
    public ResponseEntity<List<ProgramacionVueloDTO>> listarProgramaciones(
            @RequestParam(defaultValue = "OPERACION") AlmacenContexto contexto
    ) {
        return ResponseEntity.ok(programacionVueloService.listar(contexto));
    }

    @PostMapping("/programaciones")
    public ResponseEntity<?> crearProgramacion(
            @RequestParam(defaultValue = "OPERACION") AlmacenContexto contexto,
            @RequestBody ProgramacionVueloDTO request
    ) {
        try {
            ProgramacionVueloDTO response = programacionVueloService.crear(contexto, request);
            if (contexto == AlmacenContexto.OPERACION) {
                cargaArchivosService.replanificarOperacionActual();
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @PutMapping("/programaciones/{id}")
    public ResponseEntity<?> actualizarProgramacion(
            @PathVariable Long id,
            @RequestParam(defaultValue = "OPERACION") AlmacenContexto contexto,
            @RequestBody ProgramacionVueloDTO request
    ) {
        try {
            ProgramacionVueloDTO response = programacionVueloService.actualizar(contexto, id, request);
            if (contexto == AlmacenContexto.OPERACION) {
                cargaArchivosService.replanificarOperacionActual();
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @DeleteMapping("/programaciones/{id}")
    public ResponseEntity<?> eliminarProgramacion(
            @PathVariable Long id,
            @RequestParam(defaultValue = "OPERACION") AlmacenContexto contexto
    ) {
        try {
            programacionVueloService.eliminar(contexto, id);
            if (contexto == AlmacenContexto.OPERACION) {
                cargaArchivosService.replanificarOperacionActual();
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    public record CancelacionRequest(String origen, String destino, String horaSalidaLocal) {}
}
