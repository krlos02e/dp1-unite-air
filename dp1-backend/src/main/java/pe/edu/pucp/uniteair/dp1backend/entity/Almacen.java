package pe.edu.pucp.uniteair.dp1backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "almacenes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Almacen {
    @Id
    private String codigoOACI;
    private String ciudad;
    private String pais;
    private String continente;
    private int gmtOffsetMinutos;
    private int capacidadMaxima;
    private double latitud;
    private double longitud;
}
