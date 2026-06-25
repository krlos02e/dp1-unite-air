package pe.edu.pucp.uniteair.dp1backend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
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
    @Transient
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Boolean editable;
}
