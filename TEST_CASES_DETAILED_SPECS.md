# ESPECIFICACIONES DETALLADAS DE PRUEBAS - UniteAir System

## Tabla 1: Validación de Autenticación - Casos Extendidos

### 1.1 Validación de Login - Casos de Frontera Extendidos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CASO DE PRUEBA: T1.1.1 - Login exitoso con credenciales válidas            │
├─────────────────────────────────────────────────────────────────────────────┤
│ PRE-CONDICIONES:                                                             │
│  • Usuario "admin" registrado en el sistema                                  │
│  • Sesión anterior cerrada                                                   │
│  • Servidor disponible                                                       │
│                                                                               │
│ DATOS DE ENTRADA:                                                            │
│  • Username: "admin"                                                         │
│  • Password: "Admin@1234"                                                    │
│                                                                               │
│ PASOS DE EJECUCIÓN:                                                          │
│  1. Navegar a página de login                                               │
│  2. Ingresar username "admin"                                               │
│  3. Ingresar password "Admin@1234"                                          │
│  4. Hacer clic en botón "Iniciar Sesión"                                   │
│  5. Esperar respuesta del servidor                                          │
│                                                                               │
│ RESULTADO ESPERADO:                                                          │
│  • HTTP 200 - Exitoso                                                        │
│  • Token JWT almacenado en localStorage                                     │
│  • Redirección a página principal/dashboard                                 │
│  • Usuario mostrado en navbar: "admin"                                      │
│  • Rol mostrado: "ADMIN" (si aplica)                                        │
│                                                                               │
│ VALIDACIÓN:                                                                   │
│  ✓ authService.login() devuelve AuthResponse con success=true               │
│  ✓ Token guardado en localStorage                                           │
│  ✓ Navegación automática exitosa                                            │
│  ✓ No hay errores en consola                                                │
│                                                                               │
│ CLASE: VÁLIDA - Entrada dentro de especificación                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Validación de Campos de Password

| Entrado | Reglas | Válido | Razón |
|---------|--------|--------|--------|
| "Abc12345" | 8+ chars, mayúscula, minúscula, número | ✅ | Cumple todos requisitos |
| "abcdefgh" | Solo minúsculas | ❌ | Falta mayúscula |
| "ABCDEFGH" | Solo mayúsculas | ❌ | Falta minúscula |
| "Abcdefgh" | Mayúscula y minúscula, sin número | ❌ | Falta número |
| "Pass1" | <8 caracteres | ❌ | Muy corto |
| "Pass123456789...128x" | 128+ caracteres | ❌ | Excede límite |
| "Pass@123!" | Caracteres especiales | ✅ | Permitido |
| "Пароль1" | Unicode/Caracteres especiales | ⚠️ | Depende validación backend |
| "" | Vacío | ❌ | Requerido |
| " " | Solo espacios | ❌ | No válido |

---

## Tabla 2: Validación de Carga de Archivos - Formatos y Tamaños

### 2.1 Validación de Archivos por Tipo

```
ARCHIVO: Planes de Vuelo (planes_vuelo.txt)
┌────────────────────────────────────────────────────────────────┐
│ Límite de tamaño: 500 MB                                       │
│ Formato esperado: TXT delimitado por |                         │
│ Estructura mínima: 9 campos por línea                           │
├────────────────────────────────────────────────────────────────┤
│ Campos esperados:                                               │
│ 1. ID_VUELO       | Alfanumérico único                          │
│ 2. ORIGEN         | Código OACI (4 caracteres)                 │
│ 3. DESTINO        | Código OACI (4 caracteres)                 │
│ 4. LAT_ORIGEN     | Float (-90 a 90)                           │
│ 5. LON_ORIGEN     | Float (-180 a 180)                         │
│ 6. LAT_DESTINO    | Float (-90 a 90)                           │
│ 7. LON_DESTINO    | Float (-180 a 180)                         │
│ 8. FECHA_SALIDA   | ISO 8601 (YYYY-MM-DD HH:MM:SS)            │
│ 9. FECHA_LLEGADA  | ISO 8601 (YYYY-MM-DD HH:MM:SS)            │
│ 10. CAPACIDAD     | Integer (1 a 1000)                         │
├────────────────────────────────────────────────────────────────┤
│ Ejemplo línea válida:                                           │
│ IBE1234|LEMD|CDGR|40.4637|-3.6954|48.8566|2.5522|...           │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Matriz de Tamaños de Archivo

| Archivo | 0 bytes | 1 KB | 100 MB | 500 MB | 500.1 MB | Estado |
|---------|---------|------|--------|--------|----------|--------|
| planes_vuelo | ❌ | ✅ | ✅ | ✅ | ❌ | OK |
| aeropuertos | ❌ | ✅ | ✅ | ❌ | ❌ | Límite 100 MB |
| envios | ❌ | ✅ | ✅ | ❌ | ❌ | Límite 100 MB |

### 2.3 Validación de Correlatividad Entre Archivos

```
CONDICIÓN: Los códigos OACI en planes_vuelo DEBEN existir en aeropuertos.txt

CASO VÁLIDO:
  aeropuertos.txt: LEMD, CDGR, EHAM, ...
  planes_vuelo.txt: Contiene vuelos LEMD→CDGR, EHAM→LEMD, ...
  Resultado: ✅ VÁLIDO

CASO NO VÁLIDO:
  aeropuertos.txt: LEMD, CDGR, EHAM
  planes_vuelo.txt: Contiene vuelo LEMD→XXXX (XXXX no existe)
  Resultado: ❌ ERROR - "Aeropuerto de destino no existe"
```

---

## Tabla 3: Configuración de Simulación - Árboles de Decisión

### 3.1 Árbol de Decisión: Inicio de Simulación

```
┌─── ¿Archivos cargados?
│   ├─ NO → ❌ ERROR: "Cargue archivos primero"
│   └─ SÍ → ¿Fecha válida?
│       ├─ NO → ❌ ERROR: "Fecha inválida o pasada"
│       └─ SÍ → ¿Hora válida?
│           ├─ NO → ❌ ERROR: "Hora fuera de rango"
│           └─ SÍ → ¿Duración válida?
│               ├─ NO → ❌ ERROR: "Duración entre 3 y 7 días"
│               └─ SÍ → ¿Servidor disponible?
│                   ├─ NO → ❌ ERROR: "Servidor no disponible"
│                   └─ SÍ → ✅ SIMULACIÓN INICIADA
```

### 3.2 Validación de Combinaciones de Parámetros

| Duración | Fecha | Hora | Algoritmo | Válida | Motivo |
|----------|-------|------|-----------|--------|--------|
| 3 | 2025-12-20 | 09:00 | ALNS | ✅ | Todas válidas |
| 5 | 2025-12-20 | 09:00 | ALNS | ✅ | Todas válidas |
| 7 | 2025-12-20 | 09:00 | ALNS | ✅ | Todas válidas |
| 2 | 2025-12-20 | 09:00 | ALNS | ❌ | Duración < 3 |
| 8 | 2025-12-20 | 09:00 | ALNS | ❌ | Duración > 7 |
| 5 | 2020-12-20 | 09:00 | ALNS | ❌ | Fecha pasada |
| 5 | (vacío) | 09:00 | ALNS | ❌ | Fecha requerida |
| 5 | 2025-12-20 | (vacío) | ALNS | ❌ | Hora requerida |
| 5 | 2025-12-20 | 09:00 | OTRO | ❌ | Algoritmo no soportado |

---

## Tabla 4: Control de Simulación - Máquina de Estados

### 4.1 Diagrama de Transiciones de Estado

```
┌──────────────┐
│   INICIAL    │  (No iniciada)
│   (AWAIT)    │
└────────┬─────┘
         │ iniciar()
         ▼
┌──────────────────────┐
│   EN_PROGRESO        │ ◄──┐
│                      │   │ reanudar()
└────┬──────────┬──────┘   │
     │          │          │
 pausar() │      │ detener()│
     │   │      │          │
     ▼   │      │  ┌───────┘
   ┌───────────┐ │  │
   │  PAUSADA  ├─┘  │
   └───────────┘    │
                    ▼
             ┌─────────────┐
             │  DETENIDA   │
             └─────────────┘

┌──────────────────────┐
│    COMPLETADA        │  (Progreso = 100%)
│  (Simulación lista)  │
└──────────────────────┘
```

### 4.2 Matriz de Transiciones Válidas

| Estado Actual | pausar() | reanudar() | detener() | poll() | Resultado |
|---------------|----------|-----------|-----------|--------|-----------|
| EN_PROGRESO | ✅ | ❌ | ✅ | ✅ | Válida |
| PAUSADA | ❌ | ✅ | ✅ | ✅ | Válida |
| DETENIDA | ❌ | ❌ | ❌ | ❌ | No permitida |
| COMPLETADA | ❌ | ❌ | ❌ | ❌ | No permitida |

---

## Tabla 5: Dashboard - Métricas y Rangos

### 5.1 Validación de Valores de Dashboard

```
MÉTRICA: Maletas Entregadas Hoy

Rango: 0 - 999,999
Tipo: Integer
Frontera Inferior: 0 (Inicio del día)
Frontera Superior: 999,999 (Máximo)
Incremento: 1 o más (según paquetes entregados)
Visualización: Formateado con miles (ej: 1,234,567)

CASOS CRÍTICOS:
├─ T5.1.2: maletasEntregadasHoy = 0     ✅ Válido
├─ T5.1.3: maletasEntregadasHoy = 999999  ✅ Válido
├─ T5.1.x: maletasEntregadasHoy = -1     ❌ No permitido
└─ T5.1.x: maletasEntregadasHoy = 1000000 ❌ Excede rango

---

MÉTRICA: Vuelos en Tránsito

Rango: 0 - 10,000
Tipo: Integer
Frontera Inferior: 0 (Sin vuelos)
Frontera Superior: 10,000 (Máximo simultáneo)
Incremento: 1 o más

CASOS CRÍTICOS:
├─ T5.1.10: vuelosEnTransito = 0        ✅ Válido
├─ T5.1.x: vuelosEnTransito = 10000     ✅ Válido
└─ T5.1.x: vuelosEnTransito = 10001     ❌ Excede rango
```

### 5.2 Estructura JSON Completa del Dashboard

```json
{
  "success": true,
  "data": {
    "maletasEntregadasHoy": 12450,
    "maletasEnTransito": 3210,
    "totalVuelos": 245,
    "totalAeropuertos": 28,
    "aeropuertos": [
      {
        "codigoOACI": "LEMD",
        "latitud": 40.4637,
        "longitud": -3.6954,
        "ciudad": "Madrid",
        "capacidadMaxima": 450,
        "ocupacionActual": 380,
        "vuelosEntrantes": ["IB1001", "IB1002"],
        "vuelosSalientes": ["IB2001", "IB2002"]
      }
    ],
    "vuelosActivos": [
      {
        "id": "IB1001",
        "origen": "LEMD",
        "destino": "CDGR",
        "latOrigen": 40.4637,
        "lonOrigen": -3.6954,
        "latDestino": 48.8566,
        "lonDestino": 2.5522,
        "salidaUtc": "2025-12-20T09:00:00Z",
        "llegadaUtc": "2025-12-20T11:30:00Z",
        "capacidad": 250,
        "cargaActual": 245,
        "progresoVuelo": 45
      }
    ]
  }
}
```

---

## Tabla 6: Validaciones Globales - Rangos de Datos

### 6.1 Validación de Coordenadas Geográficas

```
┌─ LATITUD ──────────────────────────────┐
│ Rango: -90° a 90°                     │
│ Centro: 0° (Ecuador)                   │
│ Polo Norte: 90°                        │
│ Polo Sur: -90°                         │
├────────────────────────────────────────┤
│ CASOS DE FRONTERA:                     │
│  -90.0000 ✅ (Polo Sur - Válida)       │
│  -90.0001 ❌ (Fuera de rango)          │
│   0.0000  ✅ (Ecuador - Válida)        │
│   90.0000 ✅ (Polo Norte - Válida)     │
│   90.0001 ❌ (Fuera de rango)          │
└────────────────────────────────────────┘

┌─ LONGITUD ─────────────────────────────┐
│ Rango: -180° a 180°                   │
│ Centro: 0° (Meridiano de Greenwich)    │
│ Límite Este: 180°                      │
│ Límite Oeste: -180° (equivalente)      │
├────────────────────────────────────────┤
│ CASOS DE FRONTERA:                     │
│  -180.0000 ✅ (Límite Oeste - Válida)  │
│  -180.0001 ❌ (Fuera de rango)         │
│    0.0000  ✅ (Greenwich - Válida)     │
│   180.0000 ✅ (Límite Este - Válida)   │
│   180.0001 ❌ (Fuera de rango)         │
└────────────────────────────────────────┘
```

### 6.2 Validación de Códigos OACI

```
FORMATO: 4 caracteres alfanuméricos
ESTRUCTURA: [A-Z0-9]{4}

EJEMPLOS VÁLIDOS:
├─ LEMD (Madrid-Barajas)        ✅
├─ CDGR (París-Charles de Gaulle) ✅
├─ EHAM (Ámsterdam)             ✅
├─ EGLL (Londres-Heathrow)      ✅
├─ KJFK (Nueva York-JFK)        ✅
├─ RJTT (Tokio-Haneda)          ✅
└─ A1B2 (Híbrido alfanumérico)  ✅

EJEMPLOS INVÁLIDOS:
├─ LED  ❌ (3 caracteres)
├─ LEMDD ❌ (5 caracteres)
├─ LE-D ❌ (carácter especial)
├─ lemd ❌ (minúsculas - depende backend)
├─ LEM  ❌ (3 caracteres)
├─ LLED ❌ (4 caracteres pero puede no existir)
└─ ""   ❌ (vacío)
```

### 6.3 Validación de Capacidades y Ocupación

```
CAPACIDAD DE AEROPUERTO:

Rango: 1 a 1,000,000 (teórico)
Típico: 50 a 500,000 (real)
Unidad: Número de slots/puestos simultáneos

CASOS VÁLIDOS:
├─ 1            ✅ (Aeródromo pequeño)
├─ 100          ✅ (Aeródromo regional)
├─ 50,000       ✅ (Aeropuerto grande)
├─ 500,000      ✅ (Megaaerópuerto teórico)
└─ 1,000,000    ✅ (Máximo - frontera)

CASOS INVÁLIDOS:
├─ 0            ❌ (No puede ser 0)
├─ -1           ❌ (No puede ser negativo)
├─ 1.5          ❌ (Debe ser entero)
├─ 1,000,001    ❌ (Excede máximo - frontera)
└─ "100"        ❌ (Debe ser número, no string)

VALIDACIÓN DE OCUPACIÓN vs CAPACIDAD:

ocupacionActual DEBE SER ≤ capacidadMaxima

CASOS VÁLIDOS:
├─ capacidad=100, ocupacion=0        ✅ (0% uso)
├─ capacidad=100, ocupacion=50       ✅ (50% uso)
├─ capacidad=100, ocupacion=100      ✅ (100% uso - saturado)
└─ capacidad=100, ocupacion=100      ✅ (Frontera)

CASOS INVÁLIDOS:
├─ capacidad=100, ocupacion=101      ❌ (Excede capacidad)
├─ capacidad=100, ocupacion=-1       ❌ (No puede ser negativo)
└─ capacidad=100, ocupacion=100.5    ❌ (Debe ser entero)
```

---

## Tabla 7: Componentes UI - Comportamientos Interactivos

### 7.1 VueloModal - Ciclo de Vida

```
ESTADO INICIAL: isOpen=false, vuelo=null
   │
   ├─ Usuario hace clic en vuelo en mapa
   │  ├─ onClick → setSelectedVuelo(vuelo)
   │  └─ isOpen=true, modal abierto
   │
   ├─ Modal muestra:
   │  ├─ ID del vuelo
   │  ├─ Origen/Destino
   │  ├─ Progreso (0-100%)
   │  ├─ Carga actual/Capacidad
   │  └─ ETA (Hora de llegada estimada)
   │
   ├─ Usuario hace clic en vuelo diferente
   │  └─ Contenido modal se actualiza
   │
   ├─ Usuario hace clic en X o fuera del modal
   │  └─ setSelectedVuelo(null), modal cierra
   │
   └─ Simulación completa:
      └─ Vuelo desaparece de lista activa, modal cierra automáticamente
```

### 7.2 MapaAeropuertos - Renderizado de Elementos

```
ENTRADA VALIDA:
aeropuertos: [
  { codigoOACI: "LEMD", latitud: 40.4637, longitud: -3.6954, ... },
  { codigoOACI: "CDGR", latitud: 48.8566, longitud: 2.5522, ... }
]
vuelos: [
  { id: "IB1001", origen: "LEMD", destino: "CDGR", ... }
]

RESULTADO ESPERADO:
├─ Mapa Leaflet/Mapbox renderizado
├─ Aeropuertos mostrados como markers
├─ Vuelos mostrados como líneas entre coordenadas
├─ Interactividad habilitada
└─ ✅ Éxito

ENTRADA INVALIDA:
aeropuertos: []
vuelos: []

RESULTADO ESPERADO:
├─ Mapa vacío o con mensaje "No hay datos"
├─ Centro en coordenada por defecto
├─ Sin markers ni líneas
└─ ✅ Comportamiento esperado (no es error)

ENTRADA CORRUPTA:
aeropuertos: [
  { codigoOACI: "LEMD", latitud: 200, longitud: -3.6954, ... }
]

RESULTADO ESPERADO:
├─ Marker no se renderiza (lat inválida)
├─ Posible error en consola
└─ ❌ Error - pero sin crashes
```

---

## Tabla 8: Pruebas de Integración - Flujos Completos

### 8.1 Flujo Completo: Desde Login hasta Simulación Completada

```
┌─ FASE 1: AUTENTICACIÓN ──────────────────────┐
│ T1. Usuario accede a página login             │
│ T2. Ingresa username="admin", password="Pass" │
│ T3. Hace clic en "Iniciar Sesión"            │
│ T4. ✅ Sesión iniciada, token guardado       │
│ T5. ✅ Redirección a página principal         │
└──────────────────────────────────────────────┘
        │
        ▼
┌─ FASE 2: CARGA DE DATOS ─────────────────────┐
│ T6. Usuario navega a "Gestión de Envíos"     │
│ T7. Selecciona 3 archivos:                   │
│     • planes_vuelo.txt (50 MB)               │
│     • aeropuertos.txt (20 MB)                │
│     • envios.txt (30 MB)                     │
│ T8. Hace clic en "Subir Archivos"           │
│ T9. ✅ Progreso muestra: 0% → 100%          │
│ T10. ✅ Resultado: 245 vuelos, 28 aeropuertos│
└──────────────────────────────────────────────┘
        │
        ▼
┌─ FASE 3: CONFIGURACIÓN ──────────────────────┐
│ T11. Usuario navega a "Simulación"            │
│ T12. Completa formulario:                     │
│      • Duración: 5 días                       │
│      • Fecha inicio: 2025-12-20               │
│      • Hora inicio: 09:00                     │
│      • Algoritmo: ALNS                        │
│ T13. Hace clic en "Iniciar Simulación"       │
│ T14. ✅ Simulación inicia, sessionId obtenido │
└──────────────────────────────────────────────┘
        │
        ▼
┌─ FASE 4: EJECUCIÓN ──────────────────────────┐
│ T15. Polling inicia cada 3 segundos           │
│ T16. Mapa actualiza con vuelos activos        │
│ T17. Dashboard muestra progreso (0% → 100%)  │
│ T18. Logs actualizan con eventos de sistema  │
│ T19. Usuario pausa simulación:                │
│      • Estado: EN_PROGRESO → PAUSADA          │
│      • Botón cambia a "Reanudar"              │
│ T20. Usuario reanuda:                         │
│      • Estado: PAUSADA → EN_PROGRESO          │
│ T21. ✅ Simulación continúa normalmente      │
└──────────────────────────────────────────────┘
        │
        ▼
┌─ FASE 5: COMPLETACIÓN ───────────────────────┐
│ T22. Progreso llega a 100%                    │
│ T23. Estado: EN_PROGRESO → COMPLETADA        │
│ T24. ✅ Modal de resultados se abre          │
│ T25. Muestra estadísticas finales:            │
│      • Maletas entregadas: 12,450             │
│      • Vuelos completados: 245                │
│      • Duración total: 5:12:34                │
│ T26. Usuario hace clic en "Volver al Inicio" │
│ T27. ✅ Navegación exitosa                   │
└──────────────────────────────────────────────┘
```

### 8.2 Flujo Alternativo: Manejo de Errores

```
┌─ ERROR EN FASE 1 ────────────────────────────┐
│ Usuario ingresa credenciales incorrectas      │
│ ❌ Resultado: "Credenciales inválidas"       │
│ ✅ Campo de password se limpia               │
│ ✅ Focus vuelve a campo de password          │
│ ✅ Usuario puede reintentar                  │
└──────────────────────────────────────────────┘

┌─ ERROR EN FASE 2 ────────────────────────────┐
│ Archivo de envíos está corrupto               │
│ ❌ Resultado: "Formato de datos inválido"    │
│ ✅ Otros archivos se conservan seleccionados │
│ ✅ Usuario puede reseleccionar solo envíos   │
│ ✅ Reintentar upload                         │
└──────────────────────────────────────────────┘

┌─ ERROR EN FASE 3 ────────────────────────────┐
│ Fecha ingresada es en el pasado               │
│ ❌ Resultado: "Fecha no puede ser pasada"    │
│ ✅ Campo fecha se resalta en rojo             │
│ ✅ Placeholder sugiere rango válido          │
│ ✅ Usuario puede corregir                    │
└──────────────────────────────────────────────┘

┌─ ERROR EN FASE 4 ────────────────────────────┐
│ Servidor timeout durante polling              │
│ ❌ Resultado: "Conexión perdida"             │
│ ✅ Mostrar retry button                      │
│ ✅ Intentar reconectar automáticamente       │
│ ✅ Mantener sesión activa en backend         │
└──────────────────────────────────────────────┘
```

---

## Tabla 9: Pruebas de Rendimiento - Umbrales

### 9.1 Métricas de Rendimiento Críticas

| Métrica | Umbral | Resultado |
|---------|--------|-----------|
| Tiempo login | <2s | ✅ Aceptable |
| Tiempo upload 100MB | <30s | ✅ Aceptable |
| Tiempo inicio simulación | <5s | ✅ Aceptable |
| Tiempo respuesta poll | <1s | ✅ Aceptable |
| Tiempo refresh dashboard | <2s | ✅ Aceptable |
| FPS en mapa (60 FPS) | 60 FPS | ✅ Suave |
| Memoria JS (inicio) | <50 MB | ✅ Aceptable |
| Memoria JS (final sim) | <200 MB | ✅ Aceptable |

### 9.2 Casos de Stress Testing

```
TEST: Cargar 1000 vuelos simultáneamente

Entrada: simulationState.vuelos = [1000 vuelos activos]

Ejecución:
1. Componente Simulacion.tsx renderiza 1000 items
2. Mapa renderiza 1000 líneas de vuelos
3. Monitorear FPS, CPU, memoria

Resultados Esperados:
├─ FPS ≥ 30 (puede ser menor a 60 pero tolerable)
├─ CPU <80% (CPU core puede llegar a este límite)
├─ Memoria <500 MB (puede aumentar)
├─ UI sigue siendo responsive
└─ ✅ Sistema tolera, sin crash
```

---

## Tabla 10: Cobertura de Pruebas por Funcionalidad

### 10.1 Matriz de Cobertura Final

```
┌────────────────────────────────────────────────────────────────┐
│ MÓDULO                  │ Casos | Cobertura | Críticas | Riesgo │
├────────────────────────────────────────────────────────────────┤
│ 1. Autenticación        │  20   │   100%    │    5     │  🔴   │
│ 2. Gestión de Archivos  │  13   │   100%    │    4     │  🔴   │
│ 3. Config Simulación    │  13   │   100%    │    2     │  🔴   │
│ 4. Control Simulación   │  12   │   100%    │    4     │  🟠   │
│ 5. Dashboard            │  12   │   100%    │    3     │  🟠   │
│ 6. Validación Global    │  16   │   100%    │    4     │  🟡   │
│ 7. Componentes UI       │  12   │   100%    │    3     │  🟡   │
│ 8. Contexto Global      │   8   │   100%    │    1     │  🟢   │
├────────────────────────────────────────────────────────────────┤
│ TOTAL                   │ 106   │   100%    │   26     │ 🔴🔴  │
└────────────────────────────────────────────────────────────────┘

Leyenda:
🔴 Crítica - Debe pasar antes de producción
🟠 Alta - Recomendado pasar antes de producción
🟡 Media - Deseable pasar
🟢 Baja - Opcional
```

---

## GUÍA DE EJECUCIÓN DE PRUEBAS

### Orden Recomendado (Por Prioridad)

1. **Día 1**: Casos Críticos (🔴) - 26 casos
   - Autenticación (5 casos)
   - Gestión de Archivos (4 casos)
   - Config Simulación (2 casos)
   - Control Simulación (4 casos)
   - Dashboard (3 casos)
   - Validación Global (4 casos)
   - Componentes (3 casos)

2. **Día 2**: Casos de Alta Prioridad (🟠) - 20 casos
   - Autenticación (7 casos)
   - Gestión de Archivos (4 casos)
   - Control Simulación (4 casos)
   - Dashboard (5 casos)

3. **Día 3**: Casos Adicionales (🟡🟢) - 60 casos
   - Todos los casos restantes

### Criterios de Aceptación Global

- ✅ 100% de casos críticos DEBEN pasar
- ✅ ≥95% de casos de alta prioridad DEBEN pasar
- ✅ ≥85% de casos media prioridad
- ✅ Sin errores críticos en consola
- ✅ Tiempos de respuesta dentro de umbral
- ✅ Sin pérdida de datos

---

**Documento versión 1.0 - Especificaciones Detalladas**  
**Última actualización: 2026-06-03**  
**Responsable: QA Team - UniteAir Project**
