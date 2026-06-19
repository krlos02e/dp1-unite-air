package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.uniteair.dp1backend.entity.PlanificacionLog;
import pe.edu.pucp.uniteair.dp1backend.repository.PlanificacionLogRepository;
import pe.edu.pucp.uniteair.dp1backend.service.PlanificacionPeriodicaService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/planificacion")
public class PlanificacionController {

    @Autowired
    private PlanificacionLogRepository logRepository;

    @Autowired
    private PlanificacionPeriodicaService planificacionPeriodicaService;

    @GetMapping("/logs")
    public ResponseEntity<List<PlanificacionLog>> obtenerLogs() {
        return ResponseEntity.ok(logRepository.findTop20ByOrderByTimestampEjecucionDesc());
    }

    @GetMapping("/estado")
    public ResponseEntity<Map<String, Object>> obtenerEstado() {
        return ResponseEntity.ok(Map.of(
                "enabled", planificacionPeriodicaService.isEnabled()
        ));
    }

    @PostMapping("/activar")
    public ResponseEntity<Map<String, Object>> activar() {
        planificacionPeriodicaService.setEnabled(true);
        return ResponseEntity.ok(Map.of(
                "enabled", true,
                "message", "Planificacion periodica activada"
        ));
    }

    @PostMapping("/desactivar")
    public ResponseEntity<Map<String, Object>> desactivar() {
        planificacionPeriodicaService.setEnabled(false);
        return ResponseEntity.ok(Map.of(
                "enabled", false,
                "message", "Planificacion periodica desactivada"
        ));
    }
}
