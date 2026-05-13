package pe.edu.pucp.uniteair.dp1backend.dto;

import java.util.List;

public record DashboardData(
    int maletasEntregadasHoy,
    int maletasEnTransito,
    int totalVuelos,
    int totalAeropuertos,
    List<AeropuertoDTO> aeropuertos,
    List<VueloDTO> vuelosActivos
) {}
