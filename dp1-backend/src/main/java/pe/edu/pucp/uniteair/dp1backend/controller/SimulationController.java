package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.uniteair.dp1backend.cache.SimulationCache;
import pe.edu.pucp.uniteair.dp1backend.dto.SimulationState;
import pe.edu.pucp.uniteair.dp1backend.dto.SimulacionConfigRequest;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;
import pe.edu.pucp.uniteair.dp1backend.service.SimulationService;

import java.util.Map;

@RestController
@RequestMapping("/simulacion")
public class SimulationController {

    private final SimulationService simulationService;
    private final CargaArchivosService cargaArchivosService;
    private final SimulationCache simulationCache;

    public SimulationController(SimulationService simulationService,
                                CargaArchivosService cargaArchivosService,
                                SimulationCache simulationCache) {
        this.simulationService = simulationService;
        this.cargaArchivosService = cargaArchivosService;
        this.simulationCache = simulationCache;
    }

    @GetMapping("/activa")
    public ResponseEntity<Map<String, Object>> activa() {
        String sessionId = simulationCache.getActiveSessionId();
        if (sessionId == null) {
            return ResponseEntity.ok(Map.of("activa", false));
        }
        SimulationState state = simulationService.obtenerEstado(sessionId);
        if (state == null) {
            return ResponseEntity.ok(Map.of("activa", false));
        }
        return ResponseEntity.ok(Map.of(
                "activa", true,
                "sessionId", sessionId,
                "status", state.getStatus(),
                "progreso", state.getProgreso()
        ));
    }

    @PostMapping("/iniciar")
    public ResponseEntity<SimulationState> iniciar(@RequestBody SimulacionConfigRequest request) {
        var dataset = cargaArchivosService.obtenerUltimoDataset();
        if (dataset == null) {
            cargaArchivosService.cargarDatasetPorDefecto();
            dataset = cargaArchivosService.obtenerUltimoDataset();
        }
        if (dataset == null) {
            return ResponseEntity.badRequest().body(null);
        }
        return ResponseEntity.ok(simulationService.iniciarSimulacion(request, dataset));
    }

    @GetMapping("/estado/{sessionId}")
    public ResponseEntity<SimulationState> estado(@PathVariable String sessionId) {
        var state = simulationService.obtenerEstado(sessionId);
        if (state == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(state);
    }

    @PostMapping("/detener/{sessionId}")
    public ResponseEntity<SimulationState> detener(@PathVariable String sessionId) {
        var state = simulationService.detenerSimulacion(sessionId);
        if (state == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(state);
    }

    @GetMapping("/{sessionId}/poll")
    public ResponseEntity<SimulationState> poll(@PathVariable String sessionId) {
        var state = simulationService.obtenerEstado(sessionId);
        if (state == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(state);
    }
}
