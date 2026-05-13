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
import tasf.strategy.aco.ACO_RutasPlanner;

import java.time.Duration;
import java.time.LocalDate;

@SpringBootTest
class PlanificacionTuningTest {

    @Autowired
    private CargaArchivosService cargaArchivosService;

    record ConfigACO(int iter, int hormigas, int maxRutas, int escalas, double evaporacion, double alpha, double beta, int horizonteHoras) {}

    @Test
    void tunearACO() {
        cargaArchivosService.cargarDatasetConFechas(LocalDate.of(2026, 5, 12), 5);
        Dataset dataset = cargaArchivosService.obtenerUltimoDataset();
        int totalPaquetes = dataset.getPaquetes().size();

        System.out.println("\n=== TUNEANDO ACO ===");
        System.out.println("Total paquetes: " + totalPaquetes + "\n");
        System.out.printf("%-55s | %10s | %10s | %10s | %10s%n",
                "Config", "Asignados", "NA", "Costo", "Duración");
        System.out.println("-".repeat(110));

        ConfigACO[] configs = {
                new ConfigACO(10, 4,  4, 2, 0.4, 0.9, 3.2,  72),
                new ConfigACO(10, 4,  4, 3, 0.4, 0.9, 3.2, 120),
                new ConfigACO(10, 4,  4, 3, 0.4, 0.9, 3.2, 168),
                new ConfigACO(50, 8, 10, 3, 0.3, 0.8, 2.8, 120),
                new ConfigACO(50, 8, 10, 3, 0.3, 0.8, 2.8, 168),
        };

        for (ConfigACO cfg : configs) {
            PlanificacionUtils.limpiarCacheGlobal();
            TwoPhaseOrchestrator orchestrator = new TwoPhaseOrchestrator(new ACO_RutasPlanner());

            Config_Simulacion config = new Config_Simulacion();
            config.setAeropuertoHub("SKBO");
            config.setMinimaConexion(Duration.ofMinutes(30));
            config.setIteracionesACO(cfg.iter);
            config.setHormigasACO(cfg.hormigas);
            config.setMaxRutasPorPaquete(cfg.maxRutas);
            config.setMaxEscalas(cfg.escalas);
            config.setEvaporacionFeromona(cfg.evaporacion);
            config.setAlphaACO(cfg.alpha);
            config.setBetaACO(cfg.beta);
            config.setTopRutasACO(Math.max(2, cfg.hormigas / 2));
            config.setHormigasEliteACO(Math.max(1, cfg.hormigas / 3));
            config.setVentanaActualizacionPesos(5);
            config.setHorizonteBusqueda(Duration.ofHours(cfg.horizonteHoras));

            long t0 = System.nanoTime();
            Solucion solucion = orchestrator.ejecutarFlujoCompleto(dataset, config);
            long t1 = System.nanoTime();

            int asignados = solucion.getRutasAsignadas().size();
            int na = solucion.getPaquetesNoAsignados().size();
            long costo = (long) solucion.getCostoTotal();
            long dur = (t1 - t0) / 1_000_000;

            String label = String.format("iter=%d horm=%d maxR=%d esc=%d evap=%.1f α=%.1f β=%.1f h=%dh",
                    cfg.iter, cfg.hormigas, cfg.maxRutas, cfg.escalas, cfg.evaporacion, cfg.alpha, cfg.beta, cfg.horizonteHoras);
            System.out.printf("%-55s | %6d/%d | %4d %s | %8d | %3ds%n",
                    label, asignados, totalPaquetes, na, na == 0 ? " " : "⚠",
                    costo, dur / 1000);
        }
    }
}
