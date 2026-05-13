package pe.edu.pucp.uniteair.dp1backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;
import tasf.config.Config_Simulacion;
import tasf.core.Dataset;
import tasf.core.PlanificacionUtils;
import tasf.core.Solucion;
import tasf.model.Ruta;
import tasf.strategy.TwoPhaseOrchestrator;
import tasf.strategy.PlanificadorRutasStrategy;
import tasf.strategy.alns.ALNS_RutasPlanner;
import tasf.strategy.aco.ACO_RutasPlanner;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class PlanificacionIntegrationTest {

    @Autowired
    private CargaArchivosService cargaArchivosService;

    private Config_Simulacion crearConfig() {
        Config_Simulacion config = new Config_Simulacion();
        config.setAeropuertoHub("SKBO");
        config.setMinimaConexion(Duration.ofMinutes(30));
        config.setIteracionesALNS(20);
        config.setIteracionesACO(10);
        config.setHormigasACO(4);
        config.setMaxRutasPorPaquete(4);
        config.setTopRutasACO(2);
        config.setHormigasEliteACO(1);
        config.setMaxEscalas(2);
        config.setVentanaActualizacionPesos(5);
        config.setEvaporacionFeromona(0.4);
        return config;
    }

    private void testPlanificar(String algoritmo, PlanificadorRutasStrategy planner) {
        LocalDate fechaPrueba = LocalDate.of(2026, 5, 12); // (año, mes, día)
        cargaArchivosService.cargarDatasetConFechas(fechaPrueba, 5);
        Dataset dataset = cargaArchivosService.obtenerUltimoDataset();
        assertNotNull(dataset, "Dataset no se cargó");
        assertFalse(dataset.getPaquetes().isEmpty(), "No hay paquetes en el dataset");
        assertFalse(dataset.getVuelos().isEmpty(), "No hay vuelos en el dataset");
        assertFalse(dataset.getAeropuertos().isEmpty(), "No hay aeropuertos en el dataset");

        System.out.println("\n=== TEST " + algoritmo + " ===");
        System.out.println("Paquetes: " + dataset.getPaquetes().size());
        System.out.println("Vuelos: " + dataset.getVuelos().size());
        System.out.println("Aeropuertos: " + dataset.getAeropuertos().size());

        PlanificacionUtils.limpiarCacheGlobal();
        TwoPhaseOrchestrator orchestrator = new TwoPhaseOrchestrator(planner);
        Config_Simulacion config = crearConfig();

        long t0 = System.nanoTime();
        Solucion solucion = orchestrator.ejecutarFlujoCompleto(dataset, config);
        long t1 = System.nanoTime();

        Map<String, Ruta> asignadas = solucion.getRutasAsignadas();
        Set<String> noAsignados = solucion.getPaquetesNoAsignados();

        boolean colapso = !noAsignados.isEmpty();
        System.out.println("Rutas asignadas: " + asignadas.size());
        System.out.println("No asignados: " + noAsignados.size());
        System.out.println("Colapso: " + (colapso ? "SI" : "NO"));
        System.out.println("Costo total: " + (long) solucion.getCostoTotal());
        System.out.println("Duración: " + (t1 - t0) / 1_000_000 + " ms");

        assertNotNull(asignadas);
        assertNotNull(noAsignados);
        assertEquals(0, noAsignados.size(),
                "COLAPSO: " + noAsignados.size() + " paquetes sin asignar con " + algoritmo);
    }

    @Test
    void testPlanificacionConALNS() {
        testPlanificar("ALNS", new ALNS_RutasPlanner());
    }

    @Test
    void testPlanificacionConACO() {
        testPlanificar("ACO", new ACO_RutasPlanner());
    }

    @Test
    void testDatasetCargadoConFechasCorrectas() {
        LocalDate fecha = LocalDate.of(2026, 5, 12);
        cargaArchivosService.cargarDatasetConFechas(fecha, 3);
        Dataset dataset = cargaArchivosService.obtenerUltimoDataset();
        assertNotNull(dataset);
        assertTrue(dataset.getPaquetes().size() > 0,
                "Debe haber paquetes para la fecha " + fecha + " (encontrados: " + dataset.getPaquetes().size() + ")");
        System.out.println("Paquetes cargados para " + fecha + ": " + dataset.getPaquetes().size());
    }
}
