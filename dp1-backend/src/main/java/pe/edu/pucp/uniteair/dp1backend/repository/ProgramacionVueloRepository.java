package pe.edu.pucp.uniteair.dp1backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.uniteair.dp1backend.entity.AlmacenContexto;
import pe.edu.pucp.uniteair.dp1backend.entity.ProgramacionVuelo;

import java.util.List;

public interface ProgramacionVueloRepository extends JpaRepository<ProgramacionVuelo, Long> {
    List<ProgramacionVuelo> findAllByContextoOrderByOrigenOACIAscDestinoOACIAscHoraSalidaLocalAsc(AlmacenContexto contexto);

    void deleteAllByContexto(AlmacenContexto contexto);
}
