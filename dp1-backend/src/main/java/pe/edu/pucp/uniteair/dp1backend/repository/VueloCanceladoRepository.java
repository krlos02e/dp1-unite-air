package pe.edu.pucp.uniteair.dp1backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.uniteair.dp1backend.entity.AlmacenContexto;
import pe.edu.pucp.uniteair.dp1backend.entity.VueloCancelado;

import java.util.List;
import java.util.Optional;

public interface VueloCanceladoRepository extends JpaRepository<VueloCancelado, Long> {
    List<VueloCancelado> findAllByContextoOrderBySalidaUtcAsc(AlmacenContexto contexto);

    Optional<VueloCancelado> findByContextoAndVueloId(AlmacenContexto contexto, String vueloId);

    void deleteAllByContexto(AlmacenContexto contexto);
}
