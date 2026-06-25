package pe.edu.pucp.uniteair.dp1backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.uniteair.dp1backend.entity.AlmacenConfiguracion;
import pe.edu.pucp.uniteair.dp1backend.entity.AlmacenContexto;

import java.util.List;
import java.util.Optional;

public interface AlmacenConfiguracionRepository extends JpaRepository<AlmacenConfiguracion, Long> {
    List<AlmacenConfiguracion> findAllByContexto(AlmacenContexto contexto);

    Optional<AlmacenConfiguracion> findByContextoAndCodigoOACI(AlmacenContexto contexto, String codigoOACI);

    boolean existsByContextoAndCodigoOACI(AlmacenContexto contexto, String codigoOACI);

    void deleteByContextoAndCodigoOACI(AlmacenContexto contexto, String codigoOACI);

    void deleteAllByContexto(AlmacenContexto contexto);
}
