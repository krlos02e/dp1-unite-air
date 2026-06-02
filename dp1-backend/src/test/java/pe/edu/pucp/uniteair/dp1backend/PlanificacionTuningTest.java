package pe.edu.pucp.uniteair.dp1backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;
import tasf.config.Config_Simulacion;
import tasf.core.Dataset;
import tasf.core.PlanificacionUtils;
import tasf.core.Solucion;
import tasf.strategy.TwoPhaseOrchestrator;
import tasf.strategy.alns.ALNS_RutasPlanner;

import java.time.Duration;
import java.time.LocalDate;

@SpringBootTest
class PlanificacionTuningTest {

    @Autowired
    private CargaArchivosService cargaArchivosService;

    record ConfigALNS(int iter, double evaporacion) {}

    @Test
    void tunearALNS() {
        cargaArchivosService.cargarDatasetConFechas(LocalDate.of(2026, 5, 12), 5);
        Dataset dataset = cargaArchivosService.obtenerUltimoDataset();
        int totalPaquetes = dataset.getPaquetes().size();

        System.out.println("\n=== TEST DE AJUSTE PARÁMETROS ALNS ===");
        System.out.println("Total paquetes: " + totalPaquetes + "\n");
        System.out.printf("%-50s | %10s | %10s | %10s | %10s%n",
                "Config", "Asignados", "NA", "Costo", "Duración");
        System.out.println("-".repeat(100));

        ConfigALNS[] configs = {
                new ConfigALNS(20, 0.4),
                new ConfigALNS(50, 0.3),
                new ConfigALNS(100, 0.2),
        };

        for (ConfigALNS cfg : configs) {
            PlanificacionUtils.limpiarCacheGlobal();
            TwoPhaseOrchestrator orchestrator = new TwoPhaseOrchestrator(new ALNS_RutasPlanner(17L));

            Config_Simulacion config = new Config_Simulacion();
            config.setAeropuertoHub("SKBO");
            config.setMinimaConexion(Duration.ofMinutes(30));
            config.setIteracionesALNS(cfg.iter);
            config.setEvaporacionFeromona(cfg.evaporacion);
            config.setMaxRutasPorPaquete(4);
            config.setMaxEscalas(2);
            config.setVentanaActualizacionPesos(5);

            long t0 = System.nanoTime();
            Solucion solucion = orchestrator.ejecutarFlujoCompleto(dataset, config);
            long t1 = System.nanoTime();

            int asignados = solucion.getRutasAsignadas().size();
            int na = solucion.getPaquetesNoAsignados().size();
            long costo = (long) solucion.getCostoTotal();
            long dur = (t1 - t0) / 1_000_000;

            String label = String.format("iter=%d evap=%.1f",
                    cfg.iter, cfg.evaporacion);
            System.out.printf("%-50s | %6d/%d | %4d %s | %8d | %3ds%n",
                    label, asignados, totalPaquetes, na, na == 0 ? " " : "⚠",
                    costo, dur / 1000);
        }
    }
}
