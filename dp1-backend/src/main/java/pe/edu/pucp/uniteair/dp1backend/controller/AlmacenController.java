package pe.edu.pucp.uniteair.dp1backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.uniteair.dp1backend.entity.Almacen;
import pe.edu.pucp.uniteair.dp1backend.service.AlmacenService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/almacenes")
public class AlmacenController {

    private final AlmacenService almacenService;

    public AlmacenController(AlmacenService almacenService) {
        this.almacenService = almacenService;
    }

    @GetMapping
    public ResponseEntity<List<Almacen>> listar() {
        return ResponseEntity.ok(almacenService.listar());
    }

    @GetMapping("/{codigo}")
    public ResponseEntity<Almacen> obtener(@PathVariable String codigo) {
        return almacenService.obtenerPorId(codigo)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Almacen almacen) {
        try {
            Almacen creado = almacenService.crear(almacen);
            return ResponseEntity.ok(creado);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{codigo}")
    public ResponseEntity<?> actualizar(@PathVariable String codigo, @RequestBody Almacen datos) {
        try {
            Almacen actualizado = almacenService.actualizar(codigo, datos);
            return ResponseEntity.ok(actualizado);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{codigo}")
    public ResponseEntity<?> eliminar(@PathVariable String codigo) {
        try {
            almacenService.eliminar(codigo);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
