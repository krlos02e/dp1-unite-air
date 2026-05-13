package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.uniteair.dp1backend.dto.DashboardData;
import pe.edu.pucp.uniteair.dp1backend.service.DashboardService;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<DashboardData> dashboard(@PathVariable String sessionId) {
        return ResponseEntity.ok(dashboardService.obtenerDashboard(sessionId));
    }
}
