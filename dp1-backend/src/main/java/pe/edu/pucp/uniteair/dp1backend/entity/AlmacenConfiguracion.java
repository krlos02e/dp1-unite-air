package pe.edu.pucp.uniteair.dp1backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "almacen_configuraciones",
        uniqueConstraints = @UniqueConstraint(columnNames = {"contexto", "codigoOACI"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlmacenConfiguracion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AlmacenContexto contexto;

    @Column(nullable = false, length = 8)
    private String codigoOACI;

    private String ciudad;
    private String pais;
    private String continente;
    private Integer gmtOffsetMinutos;
    private Integer capacidadMaxima;
    private Double latitud;
    private Double longitud;
}
