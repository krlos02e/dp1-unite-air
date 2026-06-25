package pe.edu.pucp.uniteair.dp1backend.service;

import org.springframework.stereotype.Service;
import pe.edu.pucp.uniteair.dp1backend.entity.Almacen;
import pe.edu.pucp.uniteair.dp1backend.entity.AlmacenContexto;
import tasf.core.Dataset;
import tasf.model.Aeropuerto;
import tasf.model.Continente;
import tasf.model.Vuelo;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DatasetContextService {

    private final AlmacenService almacenService;
    private final ProgramacionVueloService programacionVueloService;

    public DatasetContextService(AlmacenService almacenService,
                                 ProgramacionVueloService programacionVueloService) {
        this.almacenService = almacenService;
        this.programacionVueloService = programacionVueloService;
    }

    public Dataset construirDatasetEfectivo(AlmacenContexto contexto, Dataset base) {
        Ventana ventana = inferirVentana(base);
        return construirDatasetEfectivo(contexto, base, ventana.fechaInicio(), ventana.dias());
    }

    public Dataset construirDatasetEfectivo(
            AlmacenContexto contexto,
            Dataset base,
            LocalDate fechaInicio,
            int dias
    ) {
        if (base == null) {
            return new Dataset(Map.of(), List.of(), List.of());
        }

        Map<String, Aeropuerto> aeropuertos = construirAeropuertosEfectivos(contexto, base);
        List<Vuelo> vuelos = new ArrayList<>(base.getVuelos());
        vuelos.addAll(programacionVueloService.generarVuelosRecurrentes(contexto, aeropuertos, fechaInicio, dias));
        return new Dataset(aeropuertos, vuelos, base.getPaquetes());
    }

    private Map<String, Aeropuerto> construirAeropuertosEfectivos(AlmacenContexto contexto, Dataset base) {
        Map<String, Aeropuerto> aeropuertos = new HashMap<>(base.getAeropuertos());
        for (Almacen almacen : almacenService.getMapaAlmacenes(contexto).values()) {
            aeropuertos.put(almacen.getCodigoOACI(), toAeropuerto(almacen, aeropuertos.get(almacen.getCodigoOACI())));
        }
        return aeropuertos;
    }

    private Aeropuerto toAeropuerto(Almacen almacen, Aeropuerto fallback) {
        Continente continente = fallback != null ? fallback.getContinente() : Continente.AMERICA;
        if (almacen.getContinente() != null && !almacen.getContinente().isBlank()) {
            try {
                continente = Continente.valueOf(almacen.getContinente().trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }
        int gmtOffset = almacen.getGmtOffsetMinutos();
        int capacidad = almacen.getCapacidadMaxima();
        return new Aeropuerto(almacen.getCodigoOACI(), continente, gmtOffset, capacidad);
    }

    private Ventana inferirVentana(Dataset base) {
        if (base == null || base.getVuelos().isEmpty()) {
            return new Ventana(LocalDate.now(), 3);
        }

        LocalDate fechaInicio = base.getVuelos().stream()
                .map(v -> v.getSalidaUtc().toLocalDate())
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now());
        LocalDate fechaFin = base.getVuelos().stream()
                .map(v -> v.getSalidaUtc().toLocalDate())
                .max(LocalDate::compareTo)
                .orElse(fechaInicio);
        int dias = (int) ChronoUnit.DAYS.between(fechaInicio, fechaFin) + 1;
        return new Ventana(fechaInicio, Math.max(dias, 1));
    }

    private record Ventana(LocalDate fechaInicio, int dias) {}
}
