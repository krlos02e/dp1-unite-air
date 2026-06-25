package pe.edu.pucp.uniteair.dp1backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.uniteair.dp1backend.entity.AlmacenContexto;

@Service
public class SimulationContextService {

    private final AlmacenService almacenService;
    private final ProgramacionVueloService programacionVueloService;

    public SimulationContextService(AlmacenService almacenService,
                                    ProgramacionVueloService programacionVueloService) {
        this.almacenService = almacenService;
        this.programacionVueloService = programacionVueloService;
    }

    @PostConstruct
    public void limpiarContextoSimulacionAlArrancar() {
        reiniciarContextoSimulacion();
    }

    @Transactional
    public void reiniciarContextoSimulacion() {
        programacionVueloService.limpiarContexto(AlmacenContexto.SIMULACION);
        almacenService.limpiarContexto(AlmacenContexto.SIMULACION);
    }
}
