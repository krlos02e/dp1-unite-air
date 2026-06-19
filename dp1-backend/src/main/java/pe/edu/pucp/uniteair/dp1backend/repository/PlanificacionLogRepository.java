package pe.edu.pucp.uniteair.dp1backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.uniteair.dp1backend.entity.PlanificacionLog;

import java.util.List;

@Repository
public interface PlanificacionLogRepository extends JpaRepository<PlanificacionLog, Long> {
    List<PlanificacionLog> findTop20ByOrderByTimestampEjecucionDesc();
}
