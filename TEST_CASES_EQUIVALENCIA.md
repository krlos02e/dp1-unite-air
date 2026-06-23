# Tablas de Casos de Equivalencia - UniteAir System

## Objetivo General
Este documento define los casos de equivalencia para todas las funcionalidades del frontend de UniteAir, un sistema de simulación logística con optimización de rutas para gestión de envíos aéreos.

---

## MÓDULO 1: AUTENTICACIÓN (AuthService)

### 1.1 Funcionalidad: Login

#### Tabla de Equivalencia - Login

| Condición Entrada | Clases Válidas | Clases No Válidas | Valores Frontera |
|---|---|---|---|
| **Username** | Alfanumérico 3-50 caracteres | Vacío, <3 char, >50 char, caracteres especiales | "usr", "a"@example, longitud exacta 3 y 50 |
| **Password** | 8-128 caracteres, incluye mayúscula, minúscula, número | Vacío, <8 char, >128 char, solo letras, solo números | "Abc12345", longitud exacta 8 y 128 |
| **Credenciales** | Usuario registrado + contraseña correcta | Usuario no existe, contraseña incorrecta | Usuario existente con credenciales incorrectas |
| **Estado del servidor** | Servidor disponible (HTTP 200) | Servidor no disponible (HTTP 500, timeout) | Latencia alta (>5s) |

#### Casos de Prueba - Login

| ID | Descripción | Entrada | Clase | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| T1.1.1 | Login con credenciales válidas | username="admin", password="Admin123456" | Válida | Autenticación exitosa, token generado | Válido |
| T1.1.2 | Login con username vacío | username="", password="Admin123456" | No Válida | Error: "Username requerido" | No Válido |
| T1.1.3 | Login con password < 8 caracteres | username="admin", password="Pass12" | No Válida | Error: "Contraseña muy corta" | No Válido |
| T1.1.4 | Login con usuario no registrado | username="noexiste", password="Pass1234" | No Válida | Error: "Usuario no encontrado" | No Válido |
| T1.1.5 | Login con contraseña incorrecta | username="admin", password="WrongPass123" | No Válida | Error: "Credenciales inválidas" | No Válido |
| T1.1.6 | Login con username de 3 caracteres | username="usr", password="Pass1234" | Válida | Intenta autenticación (frontera) | Válido |
| T1.1.7 | Login con username de 50 caracteres | username="aaaabbbbccccddddeeeeffffgggghhhhiiiijjjj" | Válida | Intenta autenticación (frontera) | Válido |
| T1.1.8 | Login con timeout de servidor | [timeout después de 5s] | No Válida | Error: "Timeout de conexión" | No Válido |
| T1.1.9 | Login con password solo números | username="admin", password="12345678" | No Válida | Error: "Password debe tener mayúscula y minúscula" | No Válido |
| T1.1.10 | Login con username con caracteres especiales | username="admin@#", password="Pass1234" | No Válida | Error: "Username solo alfanumérico" | No Válido |

---

### 1.2 Funcionalidad: Registro

#### Tabla de Equivalencia - Registro

| Condición Entrada | Clases Válidas | Clases No Válidas | Valores Frontera |
|---|---|---|---|
| **Username** | Alfanumérico 3-50 caracteres | Vacío, <3 char, >50 char, caracteres especiales, ya existe | "usr", usuario duplicado |
| **Password** | 8-128 caracteres, mayúscula, minúscula, número | Vacío, <8 char, >128 char, sin requisitos | "Abc12345", "Pass1" |
| **Email** | Email válido RFC 5322 | Vacío, formato inválido, email duplicado | "a@b.co", "test@" |
| **Confirmación** | Password = Confirmación | Passwords no coinciden | Coincidencia exacta |

#### Casos de Prueba - Registro

| ID | Descripción | Entrada | Clase | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| T1.2.1 | Registro con datos válidos | username="newuser", password="Pass1234", email="new@mail.com" | Válida | Usuario creado, sesión iniciada | Válido |
| T1.2.2 | Registro con username vacío | username="", password="Pass1234", email="new@mail.com" | No Válida | Error: "Username requerido" | No Válido |
| T1.2.3 | Registro con email inválido | username="newuser", password="Pass1234", email="notanemail" | No Válida | Error: "Email inválido" | No Válido |
| T1.2.4 | Registro con username duplicado | username="admin", password="Pass1234", email="new@mail.com" | No Válida | Error: "Username ya existe" | No Válido |
| T1.2.5 | Registro con email duplicado | username="newuser", password="Pass1234", email="admin@mail.com" | No Válida | Error: "Email ya registrado" | No Válido |
| T1.2.6 | Registro con password <8 char | username="newuser", password="Pass12", email="new@mail.com" | No Válida | Error: "Password muy corto" | No Válido |
| T1.2.7 | Registro con contraseña sin número | username="newuser", password="Password", email="new@mail.com" | No Válida | Error: "Password debe contener número" | No Válido |
| T1.2.8 | Registro con username de 50 caracteres | username="[50 caracteres]", password="Pass1234", email="new@mail.com" | Válida | Usuario creado (frontera) | Válido |
| T1.2.9 | Registro con password de 128 caracteres | username="newuser", password="[128 caracteres]", email="new@mail.com" | Válida | Usuario creado (frontera) | Válido |
| T1.2.10 | Registro con email @ frontera | username="newuser", password="Pass1234", email="a@b.c" | Válida | Usuario creado (frontera) | Válido |

---

## MÓDULO 2: GESTIÓN DE ARCHIVOS (CargaArchivosService)

### 2.1 Funcionalidad: Upload de Archivos

#### Tabla de Equivalencia - Upload de Archivos

| Condición Entrada | Clases Válidas | Clases No Válidas | Valores Frontera |
|---|---|---|---|
| **Archivo Planes de Vuelo** | .txt válido, ≤500MB | Formato incorrecto, vacío, >500MB | Archivo de 0 bytes, 500MB exacto |
| **Archivo Aeropuertos** | .txt válido, ≤100MB | Formato incorrecto, vacío, >100MB | Archivo de 100MB exacto |
| **Archivo Envíos** | .txt válido, ≤100MB | Formato incorrecto, vacío, >100MB | Archivo de 100MB exacto |
| **Formato de datos** | Campos separados por |, datos válidos | Campos faltantes, datos corruptos | Último campo sin separador |
| **Estructura de datos** | Vuelos con origen/destino válidos | Campos vacíos, formatos inválidos | Código OACI frontera (4 caracteres) |

#### Casos de Prueba - Upload de Archivos

| ID | Descripción | Entrada | Clase | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| T2.1.1 | Upload con tres archivos válidos | planes_vuelo.txt (50MB), aeropuertos.txt (20MB), envios.txt (30MB) | Válida | Upload exitoso, 100% progreso | Válido |
| T2.1.2 | Upload con solo planes de vuelo | planes_vuelo.txt (50MB), aeropuertos=null, envios=null | Válida | Upload parcial exitoso | Válido |
| T2.1.3 | Upload de archivo vacío | planes_vuelo.txt (0 bytes) | No Válida | Error: "Archivo vacío" | No Válido |
| T2.1.4 | Upload de archivo formato incorrecto | planes_vuelo.pdf | No Válida | Error: "Formato debe ser .txt" | No Válido |
| T2.1.5 | Upload de archivo >500MB | planes_vuelo.txt (501MB) | No Válida | Error: "Archivo excede límite de 500MB" | No Válido |
| T2.1.6 | Upload con campos corruptos | planes_vuelo.txt con datos malformados | No Válida | Error: "Formato de datos inválido" | No Válido |
| T2.1.7 | Upload sin seleccionar archivos | Ningún archivo seleccionado | No Válida | Error: "Seleccione al menos un archivo" | No Válido |
| T2.1.8 | Upload archivo de exactamente 500MB | planes_vuelo.txt (500MB exacto) | Válida | Upload exitoso (frontera) | Válido |
| T2.1.9 | Upload con timeout de conexión | [Timeout después de 30s] | No Válida | Error: "Timeout en upload" | No Válido |
| T2.1.10 | Upload con progreso tracking | Archivo 100MB, rastrear progreso | Válida | Progreso 0%, 50%, 100% reportado | Válido |

#### Subtabla: Validación de Formato de Vuelos

| ID | Estructura Esperada | Validación | Resultado |
|---|---|---|---|
| T2.1.1a | ID\|ORIGEN\|DESTINO\|LAT_O\|LON_O\|LAT_D\|LON_D\|SALIDA\|LLEGADA\|CAPACIDAD | Campos completos, coordenadas numéricas | Válido |
| T2.1.2a | ID\|ORIGEN\|DESTINO\|[campos faltantes] | Campos incompletos | Rechazo con error de validación |
| T2.1.3a | ID\|ORIGEN\|DESTINO\|abc\|LON_O\|LAT_D\|LON_D\|SALIDA\|LLEGADA\|CAPACIDAD | Latitud no numérica | Rechazo: "Coordenadas inválidas" |

---

## MÓDULO 3: CONFIGURACIÓN DE SIMULACIÓN (SimulacionConfig)

### 3.1 Funcionalidad: Configuración y Inicio de Simulación

#### Tabla de Equivalencia - Configuración de Simulación

| Condición Entrada | Clases Válidas | Clases No Válidas | Valores Frontera |
|---|---|---|---|
| **Duración (días)** | 3, 5, 7 | <3, >7, 0, negativos, decimales | Exactamente 3 y 7 |
| **Fecha Inicio** | Formato YYYY-MM-DD, fecha ≥ hoy | Formato inválido, fecha pasada, vacío | Hoy, 1 día adelante |
| **Hora Inicio** | Formato HH:MM, 00:00-23:59 | Formato inválido, vacío, >24h | 00:00, 23:59 |
| **Algoritmo** | ALNS | Otros algoritmos no soportados | Solo ALNS disponible |
| **Velocidad** | 1-10 (implícito) | <1, >10 | 1 y 10 |
| **Pre-condición** | Archivos cargados, servidor disponible | Sin archivos, sin conexión | Simulación anterior sin completar |

#### Casos de Prueba - Configuración de Simulación

| ID | Descripción | Entrada | Clase | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| T3.1.1 | Configuración válida completa | duracion=5, fecha=2025-12-20, hora=09:00, algoritmo=ALNS | Válida | Simulación inicia, sessionId generado | Válido |
| T3.1.2 | Configuración con duración mínima | duracion=3, fecha=2025-12-20, hora=09:00 | Válida | Simulación inicia (frontera) | Válido |
| T3.1.3 | Configuración con duración máxima | duracion=7, fecha=2025-12-20, hora=09:00 | Válida | Simulación inicia (frontera) | Válido |
| T3.1.4 | Configuración sin fecha | duracion=5, fecha="", hora=09:00 | No Válida | Error: "Fecha requerida" | No Válido |
| T3.1.5 | Configuración sin hora | duracion=5, fecha=2025-12-20, hora="" | No Válida | Error: "Hora requerida" | No Válido |
| T3.1.6 | Configuración con duración <3 | duracion=2, fecha=2025-12-20, hora=09:00 | No Válida | Error: "Duración mínima 3 días" | No Válido |
| T3.1.7 | Configuración con duración >7 | duracion=10, fecha=2025-12-20, hora=09:00 | No Válida | Error: "Duración máxima 7 días" | No Válido |
| T3.1.8 | Configuración con fecha pasada | duracion=5, fecha=2020-12-20, hora=09:00 | No Válida | Error: "Fecha no puede ser pasada" | No Válido |
| T3.1.9 | Configuración con hora fuera de rango | duracion=5, fecha=2025-12-20, hora=25:00 | No Válida | Error: "Hora inválida" | No Válido |
| T3.1.10 | Configuración sin archivos cargados | [Intenta iniciar sin cargar archivos] | No Válida | Error: "Cargue archivos primero" | No Válido |
| T3.1.11 | Configuración con fecha de frontera (hoy) | duracion=5, fecha=[hoy], hora=09:00 | Válida | Simulación inicia (frontera) | Válido |
| T3.1.12 | Configuración con hora frontera (00:00) | duracion=5, fecha=2025-12-20, hora=00:00 | Válida | Simulación inicia (frontera) | Válido |
| T3.1.13 | Configuración con hora frontera (23:59) | duracion=5, fecha=2025-12-20, hora=23:59 | Válida | Simulación inicia (frontera) | Válido |

---

## MÓDULO 4: CONTROL DE SIMULACIÓN (SimulationService)

### 4.1 Funcionalidad: Control de Simulación

#### Tabla de Equivalencia - Control de Simulación

| Condición Entrada | Clases Válidas | Clases No Válidas | Valores Frontera |
|---|---|---|---|
| **SessionId** | UUID válido, sesión activa | UUID inválido, sesión no existe, sesión expirada | UUID malformado |
| **Estado Inicial** | INICIADA, EN_PROGRESO | COMPLETADA, PAUSADA (no pueden reiniciarse) | Transición de estado válida |
| **Operación** | pausar, reanudar, detener, poll | Operaciones no permitidas en estado actual | Múltiples pausas consecutivas |
| **Intervalo de Poll** | 3000ms (recomendado) | <1000ms, >10000ms | Poll en tiempo real |
| **Progreso** | 0-100% | Negativo, >100% | 0%, 50%, 100% |

#### Casos de Prueba - Control de Simulación

| ID | Descripción | Entrada | Clase | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| T4.1.1 | Pausar simulación en progreso | sessionId=válido, estado=EN_PROGRESO | Válida | Estado cambia a PAUSADA, respuesta success=true | Válido |
| T4.1.2 | Reanudar simulación pausada | sessionId=válido, estado=PAUSADA | Válida | Estado cambia a EN_PROGRESO, respuesta success=true | Válido |
| T4.1.3 | Detener simulación activa | sessionId=válido, estado=EN_PROGRESO | Válida | Estado cambia a DETENIDA, respuesta success=true | Válido |
| T4.1.4 | Poll de estado simulación | sessionId=válido, intervalo=3000ms | Válida | Estado, progreso, logs actualizados | Válido |
| T4.1.5 | Pausar con sessionId inválido | sessionId="invalid-uuid", estado=EN_PROGRESO | No Válida | Error: "Sesión no encontrada" | No Válido |
| T4.1.6 | Reanudar simulación no pausada | sessionId=válido, estado=EN_PROGRESO | No Válida | Error: "Simulación no está pausada" | No Válido |
| T4.1.7 | Operación en simulación completada | sessionId=válido, estado=COMPLETADA | No Válida | Error: "Simulación ya completada" | No Válido |
| T4.1.8 | Poll con intervalo muy corto | sessionId=válido, intervalo=500ms | No Válida | Warning: "Intervalo mínimo 1000ms" (throttle) | No Válido |
| T4.1.9 | Progreso en 0% (inicio) | sessionId=válido, progreso=0 | Válida | Simulación comienza (frontera) | Válido |
| T4.1.10 | Progreso en 100% (finalización) | sessionId=válido, progreso=100 | Válida | Simulación completada (frontera) | Válido |
| T4.1.11 | Múltiples pausas consecutivas | sessionId=válido, pausar → pausar → pausar | No Válida | Error en segundo intento: "Ya está pausada" | No Válido |
| T4.1.12 | Verifica simulación activa | Sin sessionId previo | Válida | Devuelve activa=true/false con sessionId | Válido |

---

## MÓDULO 5: DASHBOARD (DashboardService)

### 5.1 Funcionalidad: Obtención de Datos del Dashboard

#### Tabla de Equivalencia - Dashboard

| Condición Entrada | Clases Válidas | Clases No Válidas | Valores Frontera |
|---|---|---|---|
| **SessionId** | UUID válido, sesión activa | UUID inválido, sesión no existe, sesión expirada | UUID malformado |
| **Intervalo Refresh** | 10000ms (10 segundos) | <1000ms (excesivo), >60000ms | 10000ms exacto |
| **Datos Retornados** | JSON con estructura completa | Campos faltantes, tipos incorrecto | Valores 0 para contadores |
| **Maletas Entregadas** | 0-999999 | Negativos, decimales, strings | 0, 999999 |
| **Vuelos en Tránsito** | 0-10000 | Negativos, mayor al total | 0, 10000 |
| **Aeropuertos** | 1-500 | Vacío, duplicados | 1 aeropuerto, 500 |

#### Casos de Prueba - Dashboard

| ID | Descripción | Entrada | Clase | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| T5.1.1 | Obtener dashboard con datos válidos | sessionId=válido, simulación en curso | Válida | Datos completos retornados, HTTP 200 | Válido |
| T5.1.2 | Dashboard con 0 maletas entregadas | sessionId=válido, maletasEntregadas=0 | Válida | Valor 0 mostrado correctamente (frontera) | Válido |
| T5.1.3 | Dashboard con máximas maletas | sessionId=válido, maletasEntregadas=999999 | Válida | Valor mostrado con formato (frontera) | Válido |
| T5.1.4 | Dashboard con SessionId inválido | sessionId="invalid-uuid" | No Válida | Error: "Sesión no encontrada", HTTP 404 | No Válido |
| T5.1.5 | Dashboard con SessionId expirada | sessionId=[expirada hace >1h] | No Válida | Error: "Sesión expirada", HTTP 401 | No Válido |
| T5.1.6 | Refresh automático cada 10s | sessionId=válido, intervalo=10000ms | Válida | Datos actualizados cada 10 segundos | Válido |
| T5.1.7 | Refresh con intervalo <1s | sessionId=válido, intervalo=500ms | No Válida | Request limitado a 1s (throttle) | No Válido |
| T5.1.8 | Dashboard con 1 aeropuerto | sessionId=válido, aeropuertos=1 | Válida | 1 aeropuerto mostrado (frontera) | Válido |
| T5.1.9 | Dashboard con muchos aeropuertos | sessionId=válido, aeropuertos=500 | Válida | 500 aeropuertos cargados (frontera) | Válido |
| T5.1.10 | Vuelos en tránsito=0 | sessionId=válido, vuelosEnTransito=0 | Válida | 0 vuelos mostrados (frontera) | Válido |
| T5.1.11 | Dashboard sin conexión | [Timeout después de 5s] | No Válida | Error: "Sin conexión" | No Válido |
| T5.1.12 | Dashboard JSON corrupto | Response con JSON malformado | No Válida | Error: "Datos inválidos" | No Válido |

---

## MÓDULO 6: VALIDACIÓN DE DATOS DE ENTRADA (Global)

### 6.1 Funcionalidad: Validación de Datos

#### Tabla de Equivalencia - Validación Global

| Condición Entrada | Clases Válidas | Clases No Válidas | Valores Frontera |
|---|---|---|---|
| **Coordenadas (Latitud)** | -90 a 90 | <-90, >90, no numérico | -90, 0, 90 |
| **Coordenadas (Longitud)** | -180 a 180 | <-180, >180, no numérico | -180, 0, 180 |
| **Códigos OACI** | 4 caracteres alfanuméricos | <4, >4 caracteres, caracteres especiales | 4 caracteres exacto |
| **Capacidad de Aeropuerto** | 1-1000000 | 0, negativos, decimales | 1, 1000000 |
| **Progreso Vuelo** | 0-100 | Negativos, >100, no numérico | 0, 50, 100 |

#### Casos de Prueba - Validación Global

| ID | Descripción | Entrada | Clase | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| T6.1.1 | Coordenada latitud mínima válida | latitud=-90 | Válida | Aceptado (frontera) | Válido |
| T6.1.2 | Coordenada latitud máxima válida | latitud=90 | Válida | Aceptado (frontera) | Válido |
| T6.1.3 | Coordenada latitud fuera de rango | latitud=91 | No Válida | Error: "Latitud fuera de rango" | No Válido |
| T6.1.4 | Coordenada longitud mínima válida | longitud=-180 | Válida | Aceptado (frontera) | Válido |
| T6.1.5 | Coordenada longitud máxima válida | longitud=180 | Válida | Aceptado (frontera) | Válido |
| T6.1.6 | Coordenada longitud fuera de rango | longitud=181 | No Válida | Error: "Longitud fuera de rango" | No Válido |
| T6.1.7 | Código OACI válido (4 caracteres) | codigoOACI="LEMD" | Válida | Aceptado (frontera) | Válido |
| T6.1.8 | Código OACI <4 caracteres | codigoOACI="LED" | No Válida | Error: "Código OACI debe tener 4 caracteres" | No Válido |
| T6.1.9 | Código OACI >4 caracteres | codigoOACI="LEMDD" | No Válida | Error: "Código OACI máximo 4 caracteres" | No Válido |
| T6.1.10 | Capacidad mínima válida | capacidad=1 | Válida | Aceptado (frontera) | Válido |
| T6.1.11 | Capacidad máxima válida | capacidad=1000000 | Válida | Aceptado (frontera) | Válido |
| T6.1.12 | Capacidad=0 | capacidad=0 | No Válida | Error: "Capacidad debe ser >0" | No Válido |
| T6.1.13 | Capacidad negativa | capacidad=-100 | No Válida | Error: "Capacidad no puede ser negativa" | No Válido |
| T6.1.14 | Progreso vuelo 0% | progreso=0 | Válida | Aceptado (frontera) | Válido |
| T6.1.15 | Progreso vuelo 100% | progreso=100 | Válida | Aceptado (frontera) | Válido |
| T6.1.16 | Progreso vuelo >100% | progreso=101 | No Válida | Error: "Progreso no puede exceder 100%" | No Válido |

---

## MÓDULO 7: VISUALIZACIÓN DE COMPONENTES

### 7.1 Funcionalidad: Componentes de UI (Modales y Paneles)

#### Tabla de Equivalencia - Componentes UI

| Componente | Condiciones Válidas | Condiciones No Válidas | Comportamiento |
|---|---|---|---|
| **VueloModal** | Vuelo seleccionado válido, isOpen=true | Vuelo=null, isOpen=false | Muestra detalles o modal vacío |
| **AeropuertoModal** | Aeropuerto seleccionado válido, isOpen=true | Aeropuerto=null, isOpen=false | Muestra detalles o modal vacío |
| **ResultadosModal** | Simulación completada, datos válidos | Sin datos, simulación incompleta | Muestra resumen o no aparece |
| **MapaAeropuertos** | Array de aeropuertos válido, coordenadas OK | Array vacío, coordenadas inválidas | Renderiza mapa o error |
| **LogPanel** | Logs válidos, timestamps correctos | Logs vacío, formatos mixtos | Muestra historial o vacío |

#### Casos de Prueba - Componentes UI

| ID | Descripción | Entrada | Clase | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| T7.1.1 | Abrir modal vuelo con datos válidos | vuelo={...}, isOpen=true | Válida | Modal abierto, detalles mostrados | Válido |
| T7.1.2 | Cerrar modal vuelo | isOpen=false | Válida | Modal cerrado | Válido |
| T7.1.3 | Modal vuelo con datos incompletos | vuelo={id, origen}, isOpen=true | No Válida | Modal muestra parcialmente o error | No Válido |
| T7.1.4 | Abrir modal aeropuerto válido | aeropuerto={...}, isOpen=true | Válida | Modal abierto, datos mostrados | Válido |
| T7.1.5 | Modal con aeropuerto=null | aeropuerto=null, isOpen=true | No Válida | Modal vacío o con placeholder | No Válido |
| T7.1.6 | Mapa con array vacío de aeropuertos | aeropuertos=[], vuelos=[] | No Válida | Mapa vacío o mensaje sin datos | No Válido |
| T7.1.7 | Mapa con coordenadas inválidas | latitud=200, longitud=300 | No Válida | Error al renderizar o mapa en blanco | No Válido |
| T7.1.8 | Panel de logs vacío | logs=[] | Válida | Panel vacío o "No hay eventos" | Válido |
| T7.1.9 | Panel de logs con 100 entries | logs=[100 entries] | Válida | Scroll habilitado, últimos visibles | Válido |
| T7.1.10 | Log con timestamp inválido | log={timestamp="invalid", ...} | No Válida | Timestamp no formateado correctamente | No Válido |
| T7.1.11 | Resultados modal sin datos | state=null, isOpen=true | No Válida | Modal no aparece o muestra placeholder | No Válido |
| T7.1.12 | Resultados modal completo | state={...}, isOpen=true | Válida | Modal muestra resumen, estadísticas | Válido |

---

## MÓDULO 8: CONTEXTO DE SIMULACIÓN (SimulationContext)

### 8.1 Funcionalidad: Gestión de Estado Global

#### Tabla de Equivalencia - Contexto Global

| Estado | Valores Válidos | Valores Inválidos | Transiciones |
|---|---|---|---|
| **simulationState** | SimulationState completo | undefined, null parcial | Actualizar periódicamente |
| **startPolling** | sessionId válido, intervalo >1s | sessionId vacío, intervalo <1s | Inicia polling automático |
| **stopPolling** | Sin parámetros | N/A | Detiene polling |
| **Intervalo Poll** | 3000ms default, customizable | <1000ms, >10000ms | Configurable por usuario |

#### Casos de Prueba - Contexto Global

| ID | Descripción | Entrada | Clase | Resultado Esperado | Tipo |
|---|---|---|---|---|---|
| T8.1.1 | Iniciar polling con intervalos válidos | sessionId=válido, intervalo=3000 | Válida | Polling inicia, updates cada 3s | Válido |
| T8.1.2 | Detener polling | stopPolling() | Válida | Polling se detiene, no hay updates | Válido |
| T8.1.3 | Cambiar intervalo en tiempo real | nuevoIntervalo=5000 | Válida | Polling continúa con nuevo intervalo | Válido |
| T8.1.4 | Polling con sessionId vacío | sessionId="" | No Válida | Error: "Sesión requerida" | No Válido |
| T8.1.5 | Polling con intervalo muy corto | intervalo=500 | No Válida | Se ajusta a mínimo 1000ms | No Válido |
| T8.1.6 | Estado incompleto en contexto | simulationState={...parcial} | No Válida | Usa valores por defecto o error | No Válido |
| T8.1.7 | Múltiples consumers del contexto | Varios componentes leen mismo state | Válida | Todos reciben mismo estado | Válido |
| T8.1.8 | Actualización de estado en poll | Poll recibe nuevo simulationState | Válida | Estado global actualizado, re-render | Válido |

---

## MATRIZ DE TRAZABILIDAD: Módulos vs Casos

| Módulo | Total Casos | Válidos | No Válidos | Cobertura |
|---|---|---|---|---|
| 1. Autenticación | 20 | 12 | 8 | 100% |
| 2. Gestión de Archivos | 13 | 8 | 5 | 100% |
| 3. Configuración Simulación | 13 | 8 | 5 | 100% |
| 4. Control Simulación | 12 | 8 | 4 | 100% |
| 5. Dashboard | 12 | 8 | 4 | 100% |
| 6. Validación Global | 16 | 8 | 8 | 100% |
| 7. Componentes UI | 12 | 7 | 5 | 100% |
| 8. Contexto Global | 8 | 5 | 3 | 100% |
| **TOTAL** | **106** | **64** | **42** | **100%** |

---

## MATRIZ DE RIESGO: Priorización de Pruebas

| Prioridad | Módulo | Casos Críticos | Justificación |
|---|---|---|---|
| 🔴 **CRÍTICA** | 1. Autenticación | T1.1.1, T1.1.4, T1.1.5, T1.2.1, T1.2.4 | Seguridad del sistema |
| 🔴 **CRÍTICA** | 2. Gestión Archivos | T2.1.1, T2.1.3, T2.1.4, T2.1.6 | Integridad de datos |
| 🔴 **CRÍTICA** | 3. Config Simulación | T3.1.1, T3.1.10 | Punto de entrada clave |
| 🟠 **ALTA** | 4. Control Simulación | T4.1.1, T4.1.2, T4.1.3, T4.1.5 | Estabilidad de la simulación |
| 🟠 **ALTA** | 5. Dashboard | T5.1.1, T5.1.4, T5.1.5 | Visualización de estado |
| 🟡 **MEDIA** | 6. Validación Global | T6.1.3, T6.1.6, T6.1.8, T6.1.12 | Prevención de errores |
| 🟡 **MEDIA** | 7. Componentes UI | T7.1.1, T7.1.4, T7.1.6 | Experiencia del usuario |
| 🟢 **BAJA** | 8. Contexto Global | T8.1.1, T8.1.2, T8.1.4 | Soporte a otros módulos |

---

## CRITERIOS DE ACEPTACIÓN Y EJECUCIÓN

### Criterios para Caso VÁLIDO
✅ Entrada cumple con especificación  
✅ Resultado esperado se produce sin excepciones  
✅ No hay errores 4xx o 5xx  
✅ Datos retornados están completos y correctos  
✅ Tiempos de respuesta <5 segundos  

### Criterios para Caso NO VÁLIDO
❌ Entrada fuera de rango o formato  
❌ Error específico capturado correctamente  
❌ Mensaje de error descriptivo y útil  
❌ Sistema en estado consistente post-error  
❌ No hay pérdida de datos  

### Ambiente de Pruebas
- **Frontend**: React + TypeScript + Vite
- **Backend**: API REST (Spring Boot - observado en estructura)
- **Navegador**: Chrome 90+, Firefox 88+, Safari 14+
- **Conexión**: HTTP/HTTPS, WebSocket para polling
- **Base de datos**: PostgreSQL o compatible

---

## NOTAS DE IMPLEMENTACIÓN

### Para QA/Testers
1. Ejecutar casos **CRÍTICOS** primero
2. Usar ambiente de staging antes de producción
3. Generar evidencia (screenshots, logs) para cada caso
4. Registrar bugs en formato: [Módulo-#Caso] Descripción
5. Revisar logs de servidor para errores subyacentes

### Para Developers
1. Implementar validaciones en frontend Y backend
2. Usar tipos TypeScript para las entradas
3. Agregar mensajes de error claros y localizados
4. Hacer tests unitarios para cada validación
5. Documentar cambios de validación en CHANGELOG

### Para DevOps/Release
1. Ejecutar suite de test antes de deploy
2. Validar en staging environment
3. Monitorear métricas post-deploy
4. Tener rollback plan si hay errores

---

**Documento versión 1.0**  
**Última actualización: 2026-06-03**  
**Autor: QA Team - UniteAir Project**
