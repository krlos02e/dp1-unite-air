# RESUMEN EJECUTIVO - Tablas de Prueba Rápidas

## QUICK REFERENCE: Casos de Prueba por Módulo

### 📋 MÓDULO 1: AUTENTICACIÓN

#### Login - Resumen Rápido
| Caso | Entrada | Esperado | ✅/❌ |
|------|---------|----------|-------|
| T1.1.1 | admin / Admin1234 | Login OK | ✅ |
| T1.1.2 | "" / Admin1234 | Error username | ❌ |
| T1.1.3 | admin / Pass12 | Error password corto | ❌ |
| T1.1.4 | noexiste / Pass1234 | Error usuario no existe | ❌ |
| T1.1.5 | admin / WrongPass | Error credenciales | ❌ |
| T1.1.6 | usr / Pass1234 | Login OK (frontera) | ✅ |
| T1.1.7 | [50 chars] / Pass1234 | Login OK (frontera) | ✅ |
| T1.1.8 | [timeout] | Timeout error | ❌ |
| T1.1.9 | admin / 12345678 | Error sin letras | ❌ |
| T1.1.10 | admin@# / Pass1234 | Error caracteres | ❌ |

#### Registro - Resumen Rápido
| Caso | Entrada | Esperado | ✅/❌ |
|------|---------|----------|-------|
| T1.2.1 | newuser/Pass1234/new@mail | Registro OK | ✅ |
| T1.2.2 | ""/Pass1234/new@mail | Error username vacío | ❌ |
| T1.2.3 | newuser/Pass1234/invalid | Error email | ❌ |
| T1.2.4 | admin/Pass1234/new@mail | Error username existe | ❌ |
| T1.2.5 | newuser/Pass1234/admin@mail | Error email existe | ❌ |
| T1.2.6 | newuser/Pass12/new@mail | Error password corto | ❌ |
| T1.2.7 | newuser/Password/new@mail | Error sin número | ❌ |
| T1.2.8 | [50chars]/Pass1234/new@mail | Registro OK (frontera) | ✅ |
| T1.2.9 | newuser/[128chars]/new@mail | Registro OK (frontera) | ✅ |
| T1.2.10 | newuser/Pass1234/a@b.c | Registro OK (frontera) | ✅ |

---

### 📁 MÓDULO 2: GESTIÓN DE ARCHIVOS

#### Upload de Archivos - Resumen Rápido
| Caso | Archivos | Resultado | ✅/❌ |
|------|----------|-----------|-------|
| T2.1.1 | 3 válidos (50+20+30 MB) | Upload OK, 100% | ✅ |
| T2.1.2 | Solo planes_vuelo | Upload parcial OK | ✅ |
| T2.1.3 | Archivo 0 bytes | Error vacío | ❌ |
| T2.1.4 | planes_vuelo.pdf | Error formato | ❌ |
| T2.1.5 | planes_vuelo 501 MB | Error tamaño | ❌ |
| T2.1.6 | Datos malformados | Error formato datos | ❌ |
| T2.1.7 | Sin archivos | Error sin selección | ❌ |
| T2.1.8 | planes_vuelo 500 MB exacto | Upload OK (frontera) | ✅ |
| T2.1.9 | [Timeout 30s] | Timeout error | ❌ |
| T2.1.10 | Rastrear progreso | 0% → 50% → 100% | ✅ |

#### Validación de Formato
| Campo | Válido | Inválido | Frontera |
|-------|--------|----------|----------|
| ID | "IBE1234" | "" | 1 carácter |
| OACI | "LEMD" | "LED", "LEMDD" | Exacto 4 |
| Lat | 40.4637 | 91.0, -91.0 | ±90 |
| Lon | -3.6954 | 181.0, -181.0 | ±180 |
| Capacidad | 250 | 0, -100 | 1, 1000 |

---

### ⚙️ MÓDULO 3: CONFIGURACIÓN DE SIMULACIÓN

#### Parámetros - Resumen Rápido
| Caso | Duración | Fecha | Hora | Resultado | ✅/❌ |
|------|----------|-------|------|-----------|-------|
| T3.1.1 | 5 | 2025-12-20 | 09:00 | OK | ✅ |
| T3.1.2 | 3 | 2025-12-20 | 09:00 | OK (min) | ✅ |
| T3.1.3 | 7 | 2025-12-20 | 09:00 | OK (max) | ✅ |
| T3.1.4 | 5 | "" | 09:00 | Error fecha | ❌ |
| T3.1.5 | 5 | 2025-12-20 | "" | Error hora | ❌ |
| T3.1.6 | 2 | 2025-12-20 | 09:00 | Error <3 días | ❌ |
| T3.1.7 | 10 | 2025-12-20 | 09:00 | Error >7 días | ❌ |
| T3.1.8 | 5 | 2020-12-20 | 09:00 | Error fecha pasada | ❌ |
| T3.1.9 | 5 | 2025-12-20 | 25:00 | Error hora | ❌ |
| T3.1.10 | 5 | 2025-12-20 | 09:00 | Error sin archivos | ❌ |
| T3.1.11 | 5 | [hoy] | 09:00 | OK (hoy) | ✅ |
| T3.1.12 | 5 | 2025-12-20 | 00:00 | OK (min) | ✅ |
| T3.1.13 | 5 | 2025-12-20 | 23:59 | OK (max) | ✅ |

#### Validación de Campos
| Campo | Rango | Mínimo | Máximo | Frontera |
|-------|-------|--------|--------|----------|
| Duración | 3-7 días | ✅ 3 | ✅ 7 | 2❌, 8❌ |
| Fecha | YYYY-MM-DD | ≥ hoy | N/A | hoy✅, ayer❌ |
| Hora | HH:MM | 00:00 | 23:59 | ✅00:00, ✅23:59 |
| Algoritmo | ALNS | N/A | N/A | Solo ALNS |

---

### 🎮 MÓDULO 4: CONTROL DE SIMULACIÓN

#### Operaciones - Resumen Rápido
| Caso | SessionId | Estado Actual | Operación | Resultado | ✅/❌ |
|------|-----------|---------------|-----------|-----------|-------|
| T4.1.1 | Válido | EN_PROGRESO | pausar | PAUSADA | ✅ |
| T4.1.2 | Válido | PAUSADA | reanudar | EN_PROGRESO | ✅ |
| T4.1.3 | Válido | EN_PROGRESO | detener | DETENIDA | ✅ |
| T4.1.4 | Válido | EN_PROGRESO | poll | Estado OK | ✅ |
| T4.1.5 | Inválido | EN_PROGRESO | pausar | Error sesión | ❌ |
| T4.1.6 | Válido | EN_PROGRESO | reanudar | Error no pausada | ❌ |
| T4.1.7 | Válido | COMPLETADA | pausar | Error terminada | ❌ |
| T4.1.8 | Válido | EN_PROGRESO | poll (500ms) | Error interval | ❌ |
| T4.1.9 | Válido | progreso 0% | poll | OK (inicio) | ✅ |
| T4.1.10 | Válido | progreso 100% | poll | OK (fin) | ✅ |
| T4.1.11 | Válido | PAUSADA | pausar → pausar | Error 2do | ❌ |
| T4.1.12 | Sin ID | N/A | activa | activa: true/false | ✅ |

#### Máquina de Estados
```
EN_PROGRESO
    ├─ pausar() → PAUSADA
    ├─ detener() → DETENIDA
    ├─ poll() → Datos actualizados
    └─ [100% progreso] → COMPLETADA

PAUSADA
    ├─ reanudar() → EN_PROGRESO
    ├─ detener() → DETENIDA
    └─ poll() → Datos sin cambios

COMPLETADA / DETENIDA
    └─ [Sin operaciones permitidas]
```

---

### 📊 MÓDULO 5: DASHBOARD

#### Métricas - Resumen Rápido
| Caso | Métrica | Valor | Esperado | ✅/❌ |
|------|---------|-------|----------|-------|
| T5.1.1 | Todas | OK | Datos completos | ✅ |
| T5.1.2 | Maletas entregadas | 0 | Mostrado | ✅ |
| T5.1.3 | Maletas entregadas | 999999 | Mostrado | ✅ |
| T5.1.4 | SessionId | inválido | Error 404 | ❌ |
| T5.1.5 | SessionId | expirada | Error 401 | ❌ |
| T5.1.6 | Refresh | 10s | Actualizado | ✅ |
| T5.1.7 | Refresh | 500ms | Limitado | ❌ |
| T5.1.8 | Aeropuertos | 1 | Mostrado | ✅ |
| T5.1.9 | Aeropuertos | 500 | Mostrado | ✅ |
| T5.1.10 | Vuelos tránsito | 0 | Mostrado | ✅ |
| T5.1.11 | Conexión | timeout | Error conexión | ❌ |
| T5.1.12 | JSON | corrupto | Error parsing | ❌ |

#### Rangos de Valores
| Métrica | Mínimo | Máximo | Tipo | Formato |
|---------|--------|--------|------|---------|
| Maletas entregadas | 0 | 999,999 | Int | Con miles |
| Maletas en tránsito | 0 | 999,999 | Int | Con miles |
| Vuelos en tránsito | 0 | 10,000 | Int | Número |
| Aeropuertos | 1 | 500 | Int | Número |
| Progreso | 0% | 100% | % | Barra |

---

### ✔️ MÓDULO 6: VALIDACIÓN GLOBAL

#### Coordenadas - Resumen Rápido
| Componente | Mínimo | Máximo | Válido | Inválido | Frontera |
|-----------|--------|--------|--------|----------|----------|
| Latitud | -90 | 90 | 0, 45.5 | 91, -91 | ±90 ✅ |
| Longitud | -180 | 180 | 0, -74.8 | 181, -181 | ±180 ✅ |
| OACI | - | - | LEMD | LED, LE-MD | 4 chars ✅ |
| Capacidad | 1 | 1M | 100, 50000 | 0, -1 | 1 ✅, 1M ✅ |
| Progreso | 0 | 100 | 50 | 101, -1 | 0 ✅, 100 ✅ |

#### Casos Críticos Validación
| Caso | Entrada | Validación | Resultado | ✅/❌ |
|------|---------|-----------|-----------|-------|
| T6.1.1 | lat=-90 | Mínimo | OK | ✅ |
| T6.1.2 | lat=90 | Máximo | OK | ✅ |
| T6.1.3 | lat=91 | Fuera rango | Error | ❌ |
| T6.1.4 | lon=-180 | Mínimo | OK | ✅ |
| T6.1.5 | lon=180 | Máximo | OK | ✅ |
| T6.1.6 | lon=181 | Fuera rango | Error | ❌ |
| T6.1.7 | OACI="LEMD" | 4 chars | OK | ✅ |
| T6.1.8 | OACI="LED" | <4 chars | Error | ❌ |
| T6.1.9 | OACI="LEMDD" | >4 chars | Error | ❌ |
| T6.1.10 | cap=1 | Mínimo | OK | ✅ |
| T6.1.11 | cap=1000000 | Máximo | OK | ✅ |
| T6.1.12 | cap=0 | Mínimo-1 | Error | ❌ |
| T6.1.13 | cap=-100 | Negativo | Error | ❌ |
| T6.1.14 | prog=0 | Mínimo | OK | ✅ |
| T6.1.15 | prog=100 | Máximo | OK | ✅ |
| T6.1.16 | prog=101 | >100% | Error | ❌ |

---

### 🎨 MÓDULO 7: COMPONENTES UI

#### Modales - Resumen Rápido
| Componente | isOpen | Datos | Esperado | ✅/❌ |
|-----------|--------|-------|----------|-------|
| VueloModal | true | Válido | Mostrado | ✅ |
| VueloModal | false | Válido | Oculto | ✅ |
| VueloModal | true | null | Vacío/Error | ❌ |
| AeropuertoModal | true | Válido | Mostrado | ✅ |
| AeropuertoModal | true | null | Vacío/Error | ❌ |
| ResultadosModal | true | Válido | Mostrado | ✅ |
| ResultadosModal | true | null | Oculto | ✅ |
| MapaAeropuertos | - | Válido | Renderizado | ✅ |
| MapaAeropuertos | - | [] | Vacío | ✅ |
| MapaAeropuertos | - | Inválido | Error/Blank | ❌ |
| LogPanel | - | [] | Vacío | ✅ |
| LogPanel | - | [100] | Scroll | ✅ |

#### Comportamiento Interactivo
| Acción | Componente | Resultado | ✅/❌ |
|--------|-----------|-----------|-------|
| Click en vuelo | Mapa | VueloModal abre | ✅ |
| Click X en modal | Modal | Cierra, estado limpia | ✅ |
| Click fuera modal | Modal | Cierra | ✅ |
| Click en aeropuerto | Mapa | AeropuertoModal abre | ✅ |
| Simulación completa | Modal | Resultados abre auto | ✅ |

---

### 🔄 MÓDULO 8: CONTEXTO GLOBAL

#### Polling - Resumen Rápido
| Caso | SessionId | Intervalo | Esperado | ✅/❌ |
|------|-----------|-----------|----------|-------|
| T8.1.1 | Válido | 3000ms | Polling OK | ✅ |
| T8.1.2 | - | - | Detiene | ✅ |
| T8.1.3 | Válido | 5000ms | Cambio OK | ✅ |
| T8.1.4 | "" | 3000ms | Error | ❌ |
| T8.1.5 | Válido | 500ms | Ajusta a 1000 | ❌ |
| T8.1.6 | Válido | - | Usa default | ✅ |
| T8.1.7 | - | - | Múltiples OK | ✅ |
| T8.1.8 | Válido | Polling | Actualiza | ✅ |

#### Estado Global
| Propiedad | Tipo | Válida | Inválida |
|-----------|------|--------|----------|
| simulationState | Object | Completo | undefined, null |
| startPolling | Function | sessionId + intervalo | sessionId vacío |
| stopPolling | Function | Sin params | N/A |
| Intervalo | Number | 3000+ ms | <1000 ms |

---

## 📈 MATRIZ DE RESULTADOS ESPERADOS

### Distribución de Casos
```
TOTAL: 106 CASOS

Válidos:     64 (60%)  ✅✅✅✅✅✅
No Válidos:  42 (40%)  ❌❌❌❌

Por Módulo:
1. Autenticación:          20 casos (19%)
2. Gestión Archivos:       13 casos (12%)
3. Config Simulación:      13 casos (12%)
4. Control Simulación:     12 casos (11%)
5. Dashboard:              12 casos (11%)
6. Validación Global:      16 casos (15%)
7. Componentes UI:         12 casos (11%)
8. Contexto Global:         8 casos  (8%)
```

### Criticidad
```
CRÍTICA (🔴):  26 casos (25%) - Bloquean producción
ALTA (🟠):     20 casos (19%) - Recomendado pasar
MEDIA (🟡):    35 casos (33%) - Deseable pasar
BAJA (🟢):     25 casos (23%) - Opcional pasar
```

---

## 🚀 CHECKLIST DE EJECUCIÓN

### Pre-Test
- [ ] Ambiente staging disponible
- [ ] BD limpia/seeddata preparada
- [ ] Usuarios de prueba creados
- [ ] Archivos de prueba preparados
- [ ] Navegador actualizado (Chrome 90+)
- [ ] Console abierta para logs
- [ ] Screenshot tool listo

### Durante Test
- [ ] Ejecutar casos en orden de criticidad
- [ ] Capturar screenshot en cada error
- [ ] Anotar tiempos de respuesta
- [ ] Revisar logs del servidor
- [ ] Documentar bugs encontrados
- [ ] Estado de datos post-test

### Post-Test
- [ ] % de casos pasados
- [ ] Bugs encontrados categorizados
- [ ] Reproducibilidad verificada
- [ ] Reporte generado
- [ ] Ambiente limpiado

---

## 📋 TEMPLATE DE BUG REPORT

```
BUG ID: [Módulo-#Caso]-[Número]
SEVERIDAD: 🔴 Crítica | 🟠 Alta | 🟡 Media | 🟢 Baja
DESCRIPCIÓN: [Descripción clara del defecto]
PASOS:
  1. [Paso 1]
  2. [Paso 2]
  3. [Paso 3]
ESPERADO: [Comportamiento esperado]
ACTUAL: [Comportamiento actual]
EVIDENCIA: [Screenshot o video]
ENTORNO: [Browser, SO, versión]
REPRODUCIBILIDAD: 100% | 90% | 50% | Aleatoria
AFECTA A: [Otros casos/funcionalidades]
```

---

## 📞 CONTACTOS Y ESCALAMIENTO

| Rol | Responsable | Contacto |
|-----|-------------|----------|
| QA Lead | [Nombre] | [Email] |
| Dev Team | [Nombre] | [Email] |
| DevOps | [Nombre] | [Email] |
| Product | [Nombre] | [Email] |

---

**Quick Reference v1.0**  
**Última actualización: 2026-06-03**  
**Impreso para: Testers y QA Engineers**
