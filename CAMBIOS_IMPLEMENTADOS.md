# Registro de Cambios Implementados

## 1. Planificacion Periodica (cada 1 hora)

### Objetivo
Ejecutar la planificacion ALNS cada hora en tiempo real, planificando los envios pendientes (no en vuelo) dentro de una ventana [now - 48h, now + 2h], reemplazando completamente las rutas anteriores.

### Archivos creados

| Archivo | Descripcion |
|---------|-------------|
| `dp1-backend/.../entity/PlanificacionLog.java` | Entidad JPA para registrar cada ejecucion: timestamp, duracionMs, paquetesProcesados, rutasAsignadas, paquetesNoAsignados, costoTotal, estado (EXITOSO/ERROR), mensajeError, detallesJson |
| `dp1-backend/.../repository/PlanificacionLogRepository.java` | Repositorio JPA con metodo `findTop20ByOrderByTimestampEjecucionDesc()` |
| `dp1-backend/.../service/PlanificacionPeriodicaService.java` | Servicio con `@Scheduled(fixedRate = 3600000)` que ejecuta la planificacion cada hora |
| `dp1-backend/.../controller/PlanificacionController.java` | Endpoints: `GET /planificacion/logs`, `GET /planificacion/estado`, `POST /planificacion/activar`, `POST /planificacion/desactivar` |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `Dp1BackendApplication.java` | Agregado `@EnableScheduling` |
| `CargaArchivosService.java` | Agregado campo `rutasAsignadas`, metodos `obtenerPaquetesEnVuelo()`, `filtrarDatasetPorVentana()`, `actualizarEstadoOperacional()`, `obtenerRutasAsignadas()` |
| `SecurityConfig.java` | Agregado `/planificacion/**` a `permitAll()` |
| `application.properties` | Agregadas propiedades `planificacion.periodica.enabled`, `horizonte-futuro-horas`, `horizonte-pasado-horas` |

### Configuracion

```properties
planificacion.periodica.enabled=true
planificacion.periodica.horizonte-futuro-horas=2
planificacion.periodica.horizonte-pasado-horas=48
```

### Comportamiento
- Cada 1 hora: filtra paquetes en ventana [now - 48h, now + 2h], excluye los que estan en vuelo, re-planifica desde cero
- Registra en BD: timestamp, duracion en ms, paquetes procesados, rutas asignadas, costo, estado
- Si hay error: `enabled = false`, scheduler detenido hasta reactivacion manual via `POST /planificacion/activar`
- Rutas se reemplazan completamente en cada ejecucion

---

## 2. Cancelacion de Vuelos

### Objetivo
Permitir cancelar un vuelo especifico (ruta + hora + dia). La cancelacion afecta solo al vuelo determinado por las reglas de tiempo, no a los demas vuelos de la misma ruta.

### Reglas de determinacion del vuelo afectado
- Si faltan **mas de 60 minutos** para la salida del vuelo de hoy → cancela el vuelo de **HOY**
- Si faltan **menos de 60 minutos** o ya paso → cancela el vuelo de **MANANA**
- La hora de cancelacion es **UTC**
- Los vuelos cancelados se almacenan en memoria (se pierden al reiniciar)

### Archivos creados

| Archivo | Descripcion |
|---------|-------------|
| `dp1-backend/.../controller/VueloController.java` | `POST /vuelos/cancelar` y `GET /vuelos/cancelados` |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `CargaArchivosService.java` | Agregado `Set<String> vuelosCancelados`, metodo `cancelarVuelo()` con logica hoy/manana, metodo `obtenerVuelosCancelados()`, metodo `buscarVuelo()` |
| `CargaArchivosService.filtrarDatasetPorVentana()` | Filtra vuelos cancelados del dataset que se pasa al ALNS |
| `CargaArchivosController.obtenerVuelos()` | Excluye vuelos cancelados de la vista Operacion Diaria |
| `SecurityConfig.java` | Agregado `/vuelos/**` a `permitAll()` |

### Endpoint

```
POST /api/vuelos/cancelar
Body: { "origen": "SKBO", "destino": "SCEL", "horaSalidaLocal": "18:25" }

GET /api/vuelos/cancelados
Response: ["SKBO-SCEL-2026-06-17-0", ...]
```

### Comportamiento
- La cancelacion es por vuelo especifico (fecha + ruta + hora), no afecta otros dias
- Los paquetes que tenian asignacion en el vuelo cancelado quedan "sin ruta valida"
- Son re-planificados automaticamente en la proxima ejecucion periodica
- No hay re-disparo inmediato del ALNS (se espera el ciclo horario)

---

## 3. Consumo Incremental de Envios

### Objetivo
Permitir enviar paquetes pequenos de envios (1 o mas) via JSON, que se acumulan y se consideran en la planificacion periodica junto con los envios del archivo inicial.

### Archivos creados

| Archivo | Descripcion |
|---------|-------------|
| `dp1-backend/.../controller/EnviosController.java` | `POST /envios` y `GET /envios/incrementales` |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `CargaArchivosService.java` | Agregado `List<Paquete> paquetesIncrementales`, `contadorPaquetesIncrementales`, metodo `agregarEnvios()`, metodo `obtenerPaquetesIncrementales()`, record `EnvioEntrada` |
| `CargaArchivosService.filtrarDatasetPorVentana()` | Incluye paquetes incrementales en el filtrado |
| `SecurityConfig.java` | Agregado `/envios/**` a `permitAll()` |

### Endpoint

```
POST /api/envios
Body: {
  "envios": [
    { "origen": "SKBO", "destino": "SCEL", "fecha": "2026-06-17", "hora": "14:30", "cantidad": 10 },
    { "origen": "SKBO", "destino": "EBCI", "fecha": "2026-06-18", "hora": "10:00", "cantidad": 5 }
  ]
}

GET /api/envios/incrementales
Response: { "total": 15, "envios": [...] }
```

### Comportamiento
- Los envios se acumulan en memoria (se pierden al reiniciar)
- Cada envio recibe un ID unico: `INC-{contador}-{origen}-{destino}`
- Se convierten a UTC usando el aeropuerto de origen
- Se incluyen en la planificacion periodica junto con los envios del dataset base
- Los envios incrementales que ya estan en vuelo se excluyen de la re-planificacion

---

## 4. Tiempos de Conexion y Recogida

### Objetivo
- Cambiar tiempo minimo de conexion de 45 min a 10 min
- Agregar tiempo de recogida de 15 min en destino final (la maleta ocupa espacio en el almacen)

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `dp1-algoritmos/.../config/Config_Simulacion.java` | Default `minimaConexion` cambiado de 45 min a **10 min**. Nuevo campo `tiempoRecogidaDestino = Duration.ofMinutes(15)` + getter/setter |
| `dp1-algoritmos/.../core/EstadoOperacional.java` | `puedeReservarRuta()`: verifica capacidad en destino final durante 15 min despues de llegada. `reservarRutaSiFactible()`: reserva espacio en destino final por 15 min. `capacidadResidualRuta()`: considera capacidad residual en destino final durante 15 min |
| `dp1-backend/.../engine/SimulationEngine.java` | Maletas se entregan 15 min despues de llegada: `ultimo.getLlegadaUtc().plusMinutes(15)` |
| `dp1-backend/.../service/CargaArchivosService.java` | `setMinimaConexion(Duration.ofMinutes(10))` |
| `dp1-backend/.../service/PlanificacionPeriodicaService.java` | `setMinimaConexion(Duration.ofMinutes(10))` |
| `dp1-backend/.../service/SimulationService.java` | `setMinimaConexion(Duration.ofMinutes(10))` |

### Impacto

| Aspecto | Efecto |
|---------|--------|
| Conexiones | Mas rutas factibles (10 min entre vuelos vs 45 min) |
| Ocupacion aeropuerto destino | Aumenta 15 min por paquete (almacen de recogida) |
| Entrega simulacion | Maletas marcadas como entregadas 15 min despues de llegar |
| Planificacion | ALNS considera la ocupacion adicional en destino final |

---

## Resumen de Endpoints Nuevos

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/planificacion/logs` | Ultimos 20 logs de ejecucion de planificacion |
| GET | `/api/planificacion/estado` | Si el scheduler esta activo |
| POST | `/api/planificacion/activar` | Reactivar scheduler |
| POST | `/api/planificacion/desactivar` | Pausar scheduler |
| POST | `/api/vuelos/cancelar` | Cancelar vuelo por ruta + hora |
| GET | `/api/vuelos/cancelados` | Lista de IDs de vuelos cancelados |
| POST | `/api/envios` | Agregar envios incrementales |
| GET | `/api/envios/incrementales` | Lista de envios incrementales acumulados |

---

## Resumen de Archivos Creados

| # | Archivo |
|---|---------|
| 1 | `dp1-backend/.../entity/PlanificacionLog.java` |
| 2 | `dp1-backend/.../repository/PlanificacionLogRepository.java` |
| 3 | `dp1-backend/.../service/PlanificacionPeriodicaService.java` |
| 4 | `dp1-backend/.../controller/PlanificacionController.java` |
| 5 | `dp1-backend/.../controller/VueloController.java` |
| 6 | `dp1-backend/.../controller/EnviosController.java` |

---

## Resumen de Archivos Modificados

| # | Archivo | Cambios |
|---|---------|---------|
| 1 | `Dp1BackendApplication.java` | `@EnableScheduling` |
| 2 | `CargaArchivosService.java` | `rutasAsignadas`, `vuelosCancelados`, `paquetesIncrementales`, metodos auxiliares, `minimaConexion` a 10 min |
| 3 | `SecurityConfig.java` | `permitAll()` para `/planificacion/**`, `/vuelos/**`, `/envios/**` |
| 4 | `application.properties` | Propiedades de planificacion periodica |
| 5 | `CargaArchivosController.java` | Filtra vuelos cancelados en `obtenerVuelos()` |
| 6 | `Config_Simulacion.java` | `minimaConexion` a 10 min, nuevo `tiempoRecogidaDestino` 15 min |
| 7 | `EstadoOperacional.java` | Reserva 15 min en destino final en `puedeReservarRuta()`, `reservarRutaSiFactible()`, `capacidadResidualRuta()` |
| 8 | `SimulationEngine.java` | Entrega 15 min despues de llegada |
| 9 | `PlanificacionPeriodicaService.java` | `minimaConexion` a 10 min |
| 10 | `SimulationService.java` | `minimaConexion` a 10 min |
