package pe.edu.pucp.uniteair.dp1backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pe.edu.pucp.uniteair.dp1backend.service.CargaArchivosService;
import tasf.config.Config_Simulacion;
import tasf.core.Dataset;
import tasf.core.PlanificacionUtils;
import tasf.core.Solucion;
import tasf.model.Aeropuerto;
import tasf.model.Paquete;
import tasf.model.Ruta;
import tasf.model.Vuelo;
import tasf.strategy.TwoPhaseOrchestrator;
import tasf.strategy.alns.ALNS_RutasPlanner;

import java.time.Duration;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@SpringBootTest
class PlanificacionDiagnosticoTest {

    @Autowired
    private CargaArchivosService cargaArchivosService;

    @Test
    void diagnosticarNoAsignados() {
        System.out.println("\n=== DIAGNÓSTICO: Analizando paquetes no asignados ===");

        cargaArchivosService.cargarDatasetConFechas(LocalDate.of(2026, 5, 12), 5);
        Dataset dataset = cargaArchivosService.obtenerUltimoDataset();

        PlanificacionUtils.limpiarCacheGlobal();
        TwoPhaseOrchestrator orchestrator = new TwoPhaseOrchestrator(new ALNS_RutasPlanner());

        Config_Simulacion config = new Config_Simulacion();
        config.setAeropuertoHub("SKBO");
        config.setMinimaConexion(Duration.ofMinutes(30));
        config.setIteracionesALNS(20);
        config.setMaxRutasPorPaquete(4);
        config.setMaxEscalas(2);
        config.setVentanaActualizacionPesos(5);
        config.setEvaporacionFeromona(0.4);

        Solucion solucion = orchestrator.ejecutarFlujoCompleto(dataset, config);
        Set<String> noAsignados = solucion.getPaquetesNoAsignados();
        Map<String, Ruta> asignadas = solucion.getRutasAsignadas();

        System.out.println("Total paquetes: " + dataset.getPaquetes().size());
        System.out.println("Asignados: " + asignadas.size());
        System.out.println("No asignados: " + noAsignados.size());

        System.out.println("\n--- Paquetes no asignados ---");
        Map<String, Integer> porOrigen = new HashMap<>();
        Map<String, Integer> porDestino = new HashMap<>();
        int sinConexion = 0;

        for (Paquete p : dataset.getPaquetes()) {
            if (!noAsignados.contains(p.getId())) continue;
            String origen = p.getOrigenOACI();
            String destino = p.getDestinoOACI();
            porOrigen.merge(origen, 1, Integer::sum);
            porDestino.merge(destino, 1, Integer::sum);

            int saltosMin = dataset.distanciaEnSaltos(origen, destino);
            if (saltosMin == Integer.MAX_VALUE) sinConexion++;

            System.out.printf("  %s | %s\u2192%s | cant=%d | saltos_min=%s%n",
                    p.getId(), origen, destino, p.getCantidad(),
                    saltosMin == Integer.MAX_VALUE ? "SIN RUTA" : saltosMin);
        }

        System.out.println("\n--- Por aeropuerto origen ---");
        porOrigen.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .forEach(e -> System.out.printf("  %s: %d%n", e.getKey(), e.getValue()));

        System.out.println("\n--- Por aeropuerto destino ---");
        porDestino.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .forEach(e -> System.out.printf("  %s: %d%n", e.getKey(), e.getValue()));

        System.out.println("\n--- Aeropuertos en el dataset ---");
        for (Aeropuerto a : dataset.getAeropuertos().values()) {
            long vuelosSalientes = dataset.getVuelos().stream()
                    .filter(v -> v.getOrigen().getCodigoOACI().equals(a.getCodigoOACI()))
                    .count();
            long vuelosEntrantes = dataset.getVuelos().stream()
                    .filter(v -> v.getDestino().getCodigoOACI().equals(a.getCodigoOACI()))
                    .count();
            System.out.printf("  %s | capacidad=%d | vuelos sal=%d ent=%d%n",
                    a.getCodigoOACI(), a.getCapacidadMaxima(), vuelosSalientes, vuelosEntrantes);
        }

        System.out.println("\nPaquetes sin conexión posible: " + sinConexion + " de " + noAsignados.size());
    }
}
