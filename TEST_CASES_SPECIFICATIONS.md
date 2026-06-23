# ESPECIFICACIONES DE CASOS DE PRUEBA POR MÓDULO - UniteAir System

## MÓDULO 1: AUTENTICACIÓN

---

### **Prueba UNT-0101**

**Objetivo**

Validar que un usuario registrado puede iniciar sesión exitosamente con credenciales válidas.

**Precondición**

- Usuario "admin" registrado en el sistema con contraseña "Admin@1234"
- Navegador actualizado (Chrome 90+, Firefox 88+, Safari 14+)
- Servidor disponible y respondiendo
- Sesión anterior cerrada/limpiada

**Descripción de la Prueba**

En la pantalla de Login:

- Username: admin
- Password: Admin@1234
- Hacer clic en botón "Iniciar Sesión"

**Resultados Esperados**

- HTTP 200 - Respuesta exitosa del servidor
- Token JWT generado y almacenado en localStorage
- Navegación automática a página principal/dashboard
- Navbar muestra "admin" como usuario actual
- No hay errores en consola del navegador
- Respuesta contiene: success=true, username="admin"

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Autenticación

---

### **Prueba UNT-0102**

**Objetivo**

Validar que el sistema rechaza login con credenciales inválidas (usuario no existe).

**Precondición**

- Usuario "noexiste" NO registrado en el sistema
- Servidor disponible
- Sesión anterior cerrada

**Descripción de la Prueba**

En la pantalla de Login:

- Username: noexiste
- Password: Pass@1234
- Hacer clic en botón "Iniciar Sesión"

**Resultados Esperados**

- HTTP 401/404 - Error de autenticación
- Modal de error visible: "Usuario no encontrado"
- Campo password se limpia automáticamente
- Focus vuelve al campo username
- Sesión NO se crea
- localStorage vacío de tokens

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Autenticación

---

### **Prueba UNT-0103**

**Objetivo**

Validar que el sistema rechaza login con password incorrecto.

**Precondición**

- Usuario "admin" existe en el sistema
- Contraseña correcta es "Admin@1234"
- Servidor disponible

**Descripción de la Prueba**

En la pantalla de Login:

- Username: admin
- Password: WrongPassword123
- Hacer clic en botón "Iniciar Sesión"

**Resultados Esperados**

- HTTP 401 - Unauthorized
- Modal de error: "Credenciales inválidas"
- Sesión NO se crea
- Usuario NO es redirigido a dashboard
- Campo password se selecciona automáticamente para permitir reintento

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Autenticación

---

### **Prueba UNT-0104**

**Objetivo**

Validar que un nuevo usuario puede registrarse exitosamente.

**Precondición**

- Username "newuser" NO existe en la base de datos
- Email "newuser@mail.com" NO existe previamente
- Servidor disponible
- En página de registro

**Descripción de la Prueba**

En la pantalla de Registrar Nuevo Usuario:

- Username: newuser
- Password: SecurePass123
- Confirmar Password: SecurePass123
- Email: newuser@mail.com
- Hacer clic en botón "Registrarse"

**Resultados Esperados**

- HTTP 200 - Registro exitoso
- Mensaje de éxito: "Usuario registrado con éxito"
- Usuario es redirigido a página de login
- Los datos ingresados se guardan en base de datos
- Nuevo usuario puede iniciar sesión con las credenciales registradas

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Autenticación

---

### **Prueba UNT-0105**

**Objetivo**

Validar que el sistema rechaza registro con username duplicado.

**Precondición**

- Username "admin" ya existe en la base de datos
- En página de registro

**Descripción de la Prueba**

En la pantalla de Registrar Nuevo Usuario:

- Username: admin
- Password: SecurePass123
- Confirmar Password: SecurePass123
- Email: newemail@mail.com
- Hacer clic en botón "Registrarse"

**Resultados Esperados**

- HTTP 409 - Conflict
- Mensaje de error: "Username ya existe en el sistema"
- Campo username se resalta en rojo
- Registro NO se completa
- Usuario permanece en página de registro

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Autenticación

---

## MÓDULO 2: GESTIÓN DE ARCHIVOS

---

### **Prueba UNT-0201**

**Objetivo**

Validar que el sistema carga exitosamente tres archivos válidos (planes de vuelo, aeropuertos y envíos).

**Precondición**

- Usuario autenticado en el sistema
- Tres archivos .txt válidos preparados:
  - planes_vuelo.txt (50 MB)
  - aeropuertos.txt (20 MB)
  - envios.txt (30 MB)
- Servidor disponible
- En página "Gestión de Envíos"

**Descripción de la Prueba**

En la pantalla de Carga de Archivos:

- Seleccionar archivo "planes_vuelo.txt"
- Seleccionar archivo "aeropuertos.txt"
- Seleccionar archivo "envios.txt"
- Hacer clic en botón "Subir Archivos"
- Esperar a que la barra de progreso llegue a 100%

**Resultados Esperados**

- Barra de progreso muestra: 0% → 50% → 100%
- HTTP 200 - Carga exitosa
- Mensaje de éxito: "Archivos cargados correctamente"
- Resultado muestra:
  - Aeropuertos: 28
  - Vuelos: 245
  - Paquetes: 3500
- Los datos se almacenan en base de datos

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Gestión de Archivos

---

### **Prueba UNT-0202**

**Objetivo**

Validar que el sistema rechaza archivo vacío.

**Precondición**

- Usuario autenticado
- Archivo planes_vuelo.txt con 0 bytes (vacío)
- En página "Gestión de Envíos"

**Descripción de la Prueba**

En la pantalla de Carga de Archivos:

- Seleccionar archivo planes_vuelo.txt (0 bytes)
- Hacer clic en botón "Subir Archivos"

**Resultados Esperados**

- HTTP 400 - Bad Request
- Mensaje de error: "Archivo vacío no permitido"
- Campo de archivo se resalta en rojo
- Upload NO se ejecuta
- Usuario permanece en página de carga

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Gestión de Archivos

---

### **Prueba UNT-0203**

**Objetivo**

Validar que el sistema rechaza archivo con formato incorrecto.

**Precondición**

- Usuario autenticado
- Archivo planes_vuelo.pdf (formato PDF)
- En página "Gestión de Envíos"

**Descripción de la Prueba**

En la pantalla de Carga de Archivos:

- Intentar seleccionar archivo "planes_vuelo.pdf"
- Sistema debe rechazar la selección o mostrar error

**Resultados Esperados**

- Archivo PDF es rechazado o el input file restringe solo .txt
- Mensaje de validación: "Solo se permiten archivos .txt"
- Archivo NO se selecciona
- Input de archivo permanece vacío

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Gestión de Archivos

---

### **Prueba UNT-0204**

**Objetivo**

Validar que el sistema rechaza archivo que excede límite de tamaño.

**Precondición**

- Usuario autenticado
- Archivo planes_vuelo.txt con 501 MB
- Límite máximo para planes_vuelo es 500 MB
- En página "Gestión de Envíos"

**Descripción de la Prueba**

En la pantalla de Carga de Archivos:

- Seleccionar archivo planes_vuelo.txt (501 MB)
- Hacer clic en botón "Subir Archivos"

**Resultados Esperados**

- HTTP 413 - Payload Too Large
- Mensaje de error: "Archivo excede límite de 500 MB"
- Upload se cancela antes de comenzar
- Usuario puede reseleccionar archivo de menor tamaño

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Gestión de Archivos

---

### **Prueba UNT-0205**

**Objetivo**

Validar que el sistema detecta datos malformados en archivo de vuelos.

**Precondición**

- Usuario autenticado
- Archivo planes_vuelo.txt con estructura inválida:
  - Coordenadas no numéricas
  - Campos faltantes
  - Delimitador incorrecto
- En página "Gestión de Envíos"

**Descripción de la Prueba**

En la pantalla de Carga de Archivos:

- Seleccionar archivo planes_vuelo.txt (datos malformados)
- Hacer clic en botón "Subir Archivos"

**Resultados Esperados**

- HTTP 422 - Unprocessable Entity
- Mensaje de error: "Formato de datos inválido en línea X"
- Upload se detiene
- Los datos NO se guardan en base de datos
- Usuario puede corregir archivo y reintentar

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Gestión de Archivos

---

## MÓDULO 3: CONFIGURACIÓN DE SIMULACIÓN

---

### **Prueba UNT-0301**

**Objetivo**

Validar que se inicia correctamente una simulación con parámetros válidos.

**Precondición**

- Usuario autenticado
- Archivos cargados (planes_vuelo, aeropuertos, envios)
- Servidor disponible
- En página "Simulación"

**Descripción de la Prueba**

En la pantalla de Configuración de Simulación:

- Duración: 5 días (seleccionar del dropdown)
- Fecha inicio: 2025-12-20
- Hora inicio: 09:00
- Algoritmo: ALNS (seleccionado por defecto)
- Hacer clic en botón "Iniciar Simulación"

**Resultados Esperados**

- HTTP 200 - Simulación iniciada exitosamente
- sessionId generado y único
- Estado de simulación: EN_PROGRESO
- Mensaje confirmación: "Simulación iniciada"
- Redirección automática a página de ejecución de simulación
- Polling de estado inicia cada 3 segundos
- Mapa y dashboard comienzan a actualizarse

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Configuración de Simulación

---

### **Prueba UNT-0302**

**Objetivo**

Validar que el sistema rechaza simulación con duración menor a 3 días.

**Precondición**

- Usuario autenticado
- Archivos cargados
- En página "Simulación"

**Descripción de la Prueba**

En la pantalla de Configuración de Simulación:

- Duración: 2 días
- Fecha inicio: 2025-12-20
- Hora inicio: 09:00
- Algoritmo: ALNS
- Hacer clic en botón "Iniciar Simulación"

**Resultados Esperados**

- HTTP 400 - Bad Request
- Mensaje de error: "Duración mínima es 3 días"
- Campo duración se resalta en rojo
- Simulación NO se inicia
- Usuario permanece en página de configuración

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Configuración de Simulación

---

### **Prueba UNT-0303**

**Objetivo**

Validar que el sistema rechaza simulación sin fecha de inicio.

**Precondición**

- Usuario autenticado
- Archivos cargados
- En página "Simulación"

**Descripción de la Prueba**

En la pantalla de Configuración de Simulación:

- Duración: 5 días
- Fecha inicio: (vacío)
- Hora inicio: 09:00
- Algoritmo: ALNS
- Hacer clic en botón "Iniciar Simulación"

**Resultados Esperados**

- HTTP 400 - Bad Request
- Mensaje de error: "Fecha de inicio es requerida"
- Campo fecha se resalta en rojo
- Simulación NO se inicia
- Focus automático en campo fecha

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Configuración de Simulación

---

### **Prueba UNT-0304**

**Objetivo**

Validar que el sistema rechaza fecha pasada en simulación.

**Precondición**

- Usuario autenticado
- Archivos cargados
- Fecha actual: 2026-06-03
- En página "Simulación"

**Descripción de la Prueba**

En la pantalla de Configuración de Simulación:

- Duración: 5 días
- Fecha inicio: 2020-12-20 (fecha pasada)
- Hora inicio: 09:00
- Algoritmo: ALNS
- Hacer clic en botón "Iniciar Simulación"

**Resultados Esperados**

- HTTP 400 - Bad Request
- Mensaje de error: "Fecha no puede ser en el pasado"
- Campo fecha se resalta en rojo
- Simulación NO se inicia
- Placeholder en campo fecha sugiere fecha mínima válida

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Configuración de Simulación

---

### **Prueba UNT-0305**

**Objetivo**

Validar que el sistema rechaza configuración sin archivos cargados.

**Precondición**

- Usuario autenticado
- NO hay archivos cargados aún
- En página "Simulación"

**Descripción de la Prueba**

En la pantalla de Configuración de Simulación:

- Todos los parámetros completos:
  - Duración: 5 días
  - Fecha inicio: 2025-12-20
  - Hora inicio: 09:00
  - Algoritmo: ALNS
- Hacer clic en botón "Iniciar Simulación"

**Resultados Esperados**

- HTTP 400 - Bad Request
- Mensaje de error: "Cargue archivos de datos antes de iniciar simulación"
- Enlace sugerido: "Ir a Gestión de Envíos"
- Simulación NO se inicia
- Botón "Iniciar Simulación" permanece deshabilitado

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🔴 CRÍTICA
- Módulo: Configuración de Simulación

---

## MÓDULO 4: CONTROL DE SIMULACIÓN

---

### **Prueba UNT-0401**

**Objetivo**

Validar que se puede pausar exitosamente una simulación en progreso.

**Precondición**

- Usuario autenticado
- Simulación activa con sessionId válido
- Estado actual: EN_PROGRESO
- Progreso: 35%
- Servidor disponible

**Descripción de la Prueba**

En la página de ejecución de simulación:

- Observar simulación en ejecución
- Hacer clic en botón "Pausar"
- Esperar respuesta del servidor

**Resultados Esperados**

- HTTP 200 - Operación exitosa
- Estado cambia de EN_PROGRESO a PAUSADA
- Botón cambia de "Pausar" a "Reanudar"
- Mapa y logs dejan de actualizarse
- Progreso se mantiene en 35%
- Mensaje: "Simulación pausada"

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟠 ALTA
- Módulo: Control de Simulación

---

### **Prueba UNT-0402**

**Objetivo**

Validar que se puede reanudar exitosamente una simulación pausada.

**Precondición**

- Usuario autenticado
- Simulación pausada con sessionId válido
- Estado actual: PAUSADA
- Progreso: 35%

**Descripción de la Prueba**

En la página de ejecución de simulación:

- Observar simulación en estado PAUSADA
- Botón muestra "Reanudar"
- Hacer clic en botón "Reanudar"

**Resultados Esperados**

- HTTP 200 - Operación exitosa
- Estado cambia de PAUSADA a EN_PROGRESO
- Botón cambia de "Reanudar" a "Pausar"
- Mapa y logs vuelven a actualizarse
- Progreso continúa desde 35%
- Mensaje: "Simulación reanudada"

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟠 ALTA
- Módulo: Control de Simulación

---

### **Prueba UNT-0403**

**Objetivo**

Validar que se puede detener exitosamente una simulación activa.

**Precondición**

- Usuario autenticado
- Simulación activa (EN_PROGRESO o PAUSADA)
- sessionId válido
- Progreso: 45%

**Descripción de la Prueba**

En la página de ejecución de simulación:

- Hacer clic en botón "Detener Simulación"
- Confirmar en modal de confirmación: "Sí, detener"

**Resultados Esperados**

- HTTP 200 - Operación exitosa
- Estado cambia a DETENIDA
- Polling de estado se detiene
- Mapa deja de actualizarse
- Botones de control se deshabilitan
- Mensaje: "Simulación detenida"
- Opción para "Volver al Inicio"

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟠 ALTA
- Módulo: Control de Simulación

---

### **Prueba UNT-0404**

**Objetivo**

Validar que el sistema rechaza operación de pausa en simulación no válida.

**Precondición**

- Usuario autenticado
- SessionId inválido o inexistente
- Simulación no existe

**Descripción de la Prueba**

En la página de ejecución de simulación:

- SessionId = "invalid-uuid-123"
- Hacer clic en botón "Pausar"

**Resultados Esperados**

- HTTP 404 - Not Found
- Mensaje de error: "Sesión de simulación no encontrada"
- Operación de pausa se cancela
- Usuario es redirigido a página de configuración de simulación

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🟠 ALTA
- Módulo: Control de Simulación

---

### **Prueba UNT-0405**

**Objetivo**

Validar que el polling actualiza correctamente el estado de la simulación.

**Precondición**

- Usuario autenticado
- Simulación activa con sessionId válido
- Estado: EN_PROGRESO
- Intervalo de polling: 3000ms

**Descripción de la Prueba**

En la página de ejecución de simulación:

- Observar actualizaciones automáticas
- Esperar 10-15 segundos
- Verificar cambios en mapa, logs y progreso

**Resultados Esperados**

- Polling se ejecuta cada 3 segundos
- HTTP 200 en cada request de poll
- Progreso se actualiza (aumenta)
- Nuevos logs aparecen automáticamente
- Mapa refleja cambios (nuevos vuelos, cambios de estado)
- Sin errores en consola

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟠 ALTA
- Módulo: Control de Simulación

---

## MÓDULO 5: DASHBOARD

---

### **Prueba UNT-0501**

**Objetivo**

Validar que el dashboard muestra correctamente los datos de una simulación activa.

**Precondición**

- Usuario autenticado
- Simulación activa con sessionId válido
- Simulación ha estado corriendo ~5 minutos
- Servidor disponible

**Descripción de la Prueba**

En la página Dashboard:

- SessionId = (válido desde simulación actual)
- Sistema obtiene datos del endpoint `/dashboard/{sessionId}`
- Se muestran:
  - Maletas entregadas hoy: 12,450
  - Maletas en tránsito: 3,210
  - Mapa con aeropuertos y vuelos
  - Tabla de aeropuertos con ocupación

**Resultados Esperados**

- HTTP 200 - Datos obtenidos exitosamente
- Todos los campos se muestran correctamente:
  - Maletas formateadas con miles (12,450)
  - Mapa renderizado con markers de aeropuertos
  - Vuelos mostrados como líneas en el mapa
  - Tabla de aeropuertos visible con scroll
- Refresh automático cada 10 segundos actualiza datos
- Sin errores en consola

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟠 ALTA
- Módulo: Dashboard

---

### **Prueba UNT-0502**

**Objetivo**

Validar que dashboard muestra correctamente frontera inferior (0 maletas entregadas).

**Precondición**

- Usuario autenticado
- Simulación recién iniciada (<1 minuto)
- maletasEntregadas = 0

**Descripción de la Prueba**

En la página Dashboard:

- Simulación acaba de iniciar
- Verificar valor mostrado en card "Maletas entregadas hoy"

**Resultados Esperados**

- Valor "0" se muestra correctamente
- Formato: "0" (sin miles)
- Card es visible y clara
- Sin errores de renderizado

**Clasificación**

- Tipo: Válida (Frontera)
- Criticidad: 🟠 ALTA
- Módulo: Dashboard

---

### **Prueba UNT-0503**

**Objetivo**

Validar que dashboard rechaza sessionId inválido.

**Precondición**

- Usuario autenticado
- SessionId = "invalid-uuid-xyz"
- Sesión no existe en servidor

**Descripción de la Prueba**

En la página Dashboard:

- Intentar acceder con sessionId inválido
- Sistema intenta obtener datos del endpoint

**Resultados Esperados**

- HTTP 404 - Not Found
- Mensaje de error: "Sesión no encontrada"
- Botón: "Ir a Simulación" (para crear nueva sesión)
- Dashboard no se renderiza

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🟠 ALTA
- Módulo: Dashboard

---

### **Prueba UNT-0504**

**Objetivo**

Validar que el refresh automático de dashboard funciona correctamente.

**Precondición**

- Usuario autenticado
- Dashboard abierto con simulación activa
- Intervalo de refresh: 10 segundos

**Descripción de la Prueba**

En la página Dashboard:

- Abrir dashboard
- Esperar 20 segundos
- Observar actualizaciones de datos

**Resultados Esperados**

- Datos se actualizan automáticamente cada 10 segundos
- HTTP GET a `/dashboard/{sessionId}` cada 10s
- Valores de maletas, vuelos se incrementan/cambian
- No hay interrupciones en la UI
- Múltiples refresh consecutivos funcionan sin errores

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟠 ALTA
- Módulo: Dashboard

---

### **Prueba UNT-0505**

**Objetivo**

Validar que dashboard maneja correctamente sesión expirada.

**Precondición**

- Usuario autenticado
- SessionId válido pero expirado (>1 hora desde creación)

**Descripción de la Prueba**

En la página Dashboard:

- Sesión expirada
- Sistema intenta refrescar datos
- HTTP GET a `/dashboard/{sessionId}`

**Resultados Esperados**

- HTTP 401 - Unauthorized
- Mensaje: "Sesión expirada"
- Usuario es redirigido a configuración de simulación
- Necesita iniciar nueva simulación

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🟠 ALTA
- Módulo: Dashboard

---

## MÓDULO 6: VALIDACIÓN GLOBAL

---

### **Prueba UNT-0601**

**Objetivo**

Validar que coordenada de latitud en frontera inferior (-90) es aceptada.

**Precondición**

- Datos de aeropuerto con latitud = -90.0000
- En contexto de carga de archivo o visualización

**Descripción de la Prueba**

En los datos de entrada:

- Código OACI: ANTC
- Latitud: -90.0000
- Longitud: 0.0000
- Capacidad: 100

**Resultados Esperados**

- Coordenada es aceptada como válida
- Aeropuerto se renderiza en mapa (Polo Sur)
- No hay errores de validación
- Valor se almacena correctamente en BD

**Clasificación**

- Tipo: Válida (Frontera)
- Criticidad: 🟡 MEDIA
- Módulo: Validación Global

---

### **Prueba UNT-0602**

**Objetivo**

Validar que coordenada de latitud fuera de rango (>90) es rechazada.

**Precondición**

- Datos de aeropuerto con latitud = 91.0000
- En contexto de carga de archivo

**Descripción de la Prueba**

En los datos de entrada:

- Código OACI: INVD
- Latitud: 91.0000
- Longitud: 0.0000
- Capacidad: 100

**Resultados Esperados**

- HTTP 422 - Unprocessable Entity
- Mensaje de validación: "Latitud fuera de rango (-90 a 90)"
- Línea rechazada en archivo
- Reporte de error identifica línea problemática
- Datos NO se guardan

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🟡 MEDIA
- Módulo: Validación Global

---

### **Prueba UNT-0603**

**Objetivo**

Validar que código OACI con <4 caracteres es rechazado.

**Precondición**

- Datos de vuelo con código OACI origen = "LEI"
- En contexto de carga de archivo

**Descripción de la Prueba**

En los datos de entrada:

- ID Vuelo: IB001
- Origen: LEI (3 caracteres)
- Destino: CDGR
- Otros campos válidos

**Resultados Esperados**

- HTTP 422 - Unprocessable Entity
- Mensaje: "Código OACI debe tener exactamente 4 caracteres"
- Vuelo rechazado
- Reporte de error en línea X del archivo
- Datos NO se guardan

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🟡 MEDIA
- Módulo: Validación Global

---

### **Prueba UNT-0604**

**Objetivo**

Validar que capacidad de aeropuerto = 0 es rechazada.

**Precondición**

- Datos de aeropuerto con capacidad = 0
- En contexto de carga de archivo

**Descripción de la Prueba**

En los datos de entrada:

- Código OACI: INVD
- Latitud: 40.4637
- Longitud: -3.6954
- Capacidad: 0

**Resultados Esperados**

- HTTP 422 - Unprocessable Entity
- Mensaje: "Capacidad debe ser mayor a 0"
- Aeropuerto rechazado
- Datos NO se guardan en BD

**Clasificación**

- Tipo: No Válida (Error Path)
- Criticidad: 🟡 MEDIA
- Módulo: Validación Global

---

### **Prueba UNT-0605**

**Objetivo**

Validar que progreso de vuelo en frontera (100%) se maneja correctamente.

**Precondición**

- Vuelo con progreso = 100%
- En contexto de simulación

**Descripción de la Prueba**

En los datos de simulación:

- Vuelo IB001
- Progreso: 100%
- Sistema marca vuelo como completado

**Resultados Esperados**

- Progreso 100% es aceptado
- Vuelo desaparece de lista activa
- Se registra como "completado"
- Contador de vuelos completados se incrementa
- Sin errores de validación

**Clasificación**

- Tipo: Válida (Frontera)
- Criticidad: 🟡 MEDIA
- Módulo: Validación Global

---

## MÓDULO 7: COMPONENTES UI

---

### **Prueba UNT-0701**

**Objetivo**

Validar que modal de vuelo se abre correctamente al hacer clic en un vuelo.

**Precondición**

- Usuario autenticado
- Simulación activa con vuelos visibles en mapa
- En página de simulación con mapa visible

**Descripción de la Prueba**

En el mapa de simulación:

- Hacer clic en un vuelo (representado como línea o marker)
- Ejemplo: Vuelo IB1001

**Resultados Esperados**

- Modal VueloModal se abre inmediatamente
- Muestra detalles del vuelo:
  - ID: IB1001
  - Origen: LEMD
  - Destino: CDGR
  - Progreso: 45%
  - Carga: 245/250
  - ETA: 2025-12-20 11:30
- Modal tiene botón cerrar (X)
- Sin errores en consola

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟡 MEDIA
- Módulo: Componentes UI

---

### **Prueba UNT-0702**

**Objetivo**

Validar que modal de vuelo se cierra al hacer clic fuera del modal.

**Precondición**

- Usuario autenticado
- Modal VueloModal abierto

**Descripción de la Prueba**

En el modal abierto:

- Hacer clic fuera del modal (en fondo oscuro)
- O hacer clic en botón X de cerrar

**Resultados Esperados**

- Modal se cierra inmediatamente
- Fondo oscuro desaparece
- Estado se limpia (setSelectedVuelo(null))
- Mapa nuevamente interactivo
- Sin errores de renderizado

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟡 MEDIA
- Módulo: Componentes UI

---

### **Prueba UNT-0703**

**Objetivo**

Validar que mapa se renderiza correctamente con datos válidos.

**Precondición**

- Usuario autenticado
- Simulación activa con aeropuertos y vuelos
- En página de simulación

**Descripción de la Prueba**

En la página de simulación:

- Sistema carga:
  - aeropuertos = [28 objetos válidos]
  - vuelos = [245 objetos válidos]
- Componente MapaAeropuertos renderiza

**Resultados Esperados**

- Mapa Leaflet/Mapbox se renderiza
- 28 markers de aeropuertos son visibles
- 245 líneas de vuelos (rutas) son visibles
- Interactividad habilitada (click en markers)
- Sin errores de consola
- Zoom y pan funcionan correctamente

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟡 MEDIA
- Módulo: Componentes UI

---

### **Prueba UNT-0704**

**Objetivo**

Validar que mapa maneja correctamente datos vacíos.

**Precondición**

- Usuario autenticado
- Simulación sin datos aún
- aeropuertos = []
- vuelos = []

**Descripción de la Prueba**

En la página de simulación:

- Sistema intenta renderizar mapa sin datos
- Components MapaAeropuertos recibe arrays vacíos

**Resultados Esperados**

- Mapa se renderiza sin errores
- Mensaje "No hay datos disponibles" (opcional)
- Centro del mapa en coordenada por defecto
- Sin markers ni líneas
- Sin errores de consola

**Clasificación**

- Tipo: Válida (Edge Case)
- Criticidad: 🟡 MEDIA
- Módulo: Componentes UI

---

### **Prueba UNT-0705**

**Objetivo**

Validar que panel de logs muestra correctamente eventos de simulación.

**Precondición**

- Usuario autenticado
- Simulación activa con múltiples eventos registrados
- logs = [50+ entradas]

**Descripción de la Prueba**

En la página de simulación:

- Panel de logs visible
- Simulación ha estado corriendo ~5 minutos
- Se han generado múltiples eventos

**Resultados Esperados**

- Panel de logs muestra eventos:
  - Timestamps formateados
  - Tipo de evento (INFO, WARN, ERROR, COLAPSO)
  - Mensaje descriptivo
  - Módulo responsable
- Scroll habilitado si hay muchos logs
- Último evento visible automáticamente (auto-scroll)
- Sin errores de renderizado

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟡 MEDIA
- Módulo: Componentes UI

---

## MÓDULO 8: CONTEXTO GLOBAL

---

### **Prueba UNT-0801**

**Objetivo**

Validar que polling inicia correctamente con parámetros válidos.

**Precondición**

- Usuario autenticado
- Simulación activa con sessionId válido
- SimulationContext disponible

**Descripción de la Prueba**

En la página de simulación:

- Componente Simulacion.tsx monta
- startPolling(sessionId, 3000) es invocado
- sessionId = "uuid-1234-5678"
- intervalo = 3000ms

**Resultados Esperados**

- Polling inicia automáticamente
- HTTP GET a `/simulacion/{sessionId}/poll` cada 3 segundos
- simulationState se actualiza con cada respuesta
- Componentes que usan context re-renderizados
- Sin errores en consola

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟢 BAJA
- Módulo: Contexto Global

---

### **Prueba UNT-0802**

**Objetivo**

Validar que polling se detiene correctamente.

**Precondición**

- Usuario autenticado
- Polling activo en contexto
- SimulationContext disponible

**Descripción de la Prueba**

En la página de simulación:

- Usuario hace clic en "Volver al Inicio"
- O simulación se completa
- stopPolling() es invocado

**Resultados Esperados**

- Polling detiene inmediatamente
- No hay más requests HTTP a `/simulacion/.../poll`
- simulationState se congela (sin actualizaciones)
- Componentes dejan de re-renderizar por contexto
- Sin errores en consola

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟢 BAJA
- Módulo: Contexto Global

---

### **Prueba UNT-0803**

**Objetivo**

Validar que múltiples componentes reciben correctamente el mismo estado global.

**Precondición**

- Usuario autenticado
- Simulación activa
- Múltiples componentes suscritos a SimulationContext

**Descripción de la Prueba**

En la página de simulación:

- Componentes suscritos:
  - Simulacion.tsx (padre)
  - MapaAeropuertos (hijo)
  - LogPanel (hijo)
  - Dashboard (independiente)
- Polling actualiza simulationState
- Verificar que todos reciben cambios

**Resultados Esperados**

- Todos los componentes reciben las mismas actualizaciones
- Cambios en progreso se reflejan en todos
- Nuevos logs aparecen en panel
- Mapa se actualiza
- Sin desincronización entre componentes
- Sin duplicación de requests

**Clasificación**

- Tipo: Válida (Happy Path)
- Criticidad: 🟢 BAJA
- Módulo: Contexto Global

---

### **Prueba UNT-0804**

**Objetivo**

Validar que polling rechaza intervalo muy corto.

**Precondición**

- Usuario autenticado
- SimulationContext disponible

**Descripción de la Prueba**

En la página de simulación:

- startPolling(sessionId, 500) es invocado
- intervalo = 500ms (< 1000ms mínimo)

**Resultados Esperados**

- Sistema ajusta intervalo a 1000ms (mínimo)
- Warning en consola: "Intervalo mínimo es 1000ms, ajustando..."
- Polling funciona con intervalo de 1000ms
- No hay degradación de rendimiento
- Sin errores críticos

**Clasificación**

- Tipo: No Válida (Validación)
- Criticidad: 🟢 BAJA
- Módulo: Contexto Global

---

### **Prueba UNT-0805**

**Objetivo**

Validar que polling rechaza sessionId vacío.

**Precondición**

- Usuario autenticado
- SimulationContext disponible

**Descripción de la Prueba**

En la página de simulación:

- startPolling("", 3000) es invocado
- sessionId vacío

**Resultados Esperados**

- Polling NO inicia
- Error capturado: "sessionId es requerido"
- simulationState mantiene estado anterior
- Sin requests HTTP innecesarios
- Sin errores de crash

**Clasificación**

- Tipo: No Válida (Validación)
- Criticidad: 🟢 BAJA
- Módulo: Contexto Global

---

## RESUMEN DE ESPECIFICACIONES

### Distribución de Especificaciones por Módulo

| Módulo | Especificaciones | Tipo Válida | Tipo No Válida | Total |
|--------|-----------------|------------|----------------|-------|
| 1. Autenticación | 5 | 3 | 2 | 5 |
| 2. Gestión de Archivos | 5 | 2 | 3 | 5 |
| 3. Config Simulación | 5 | 2 | 3 | 5 |
| 4. Control Simulación | 5 | 3 | 2 | 5 |
| 5. Dashboard | 5 | 3 | 2 | 5 |
| 6. Validación Global | 5 | 3 | 2 | 5 |
| 7. Componentes UI | 5 | 4 | 1 | 5 |
| 8. Contexto Global | 5 | 3 | 2 | 5 |
| **TOTAL** | **40** | **23** | **17** | **40** |

### Distribución por Criticidad

```
🔴 CRÍTICA (16 especificaciones - 40%)
├─ Autenticación: 5
├─ Gestión Archivos: 5
└─ Config Simulación: 5
└─ Control Simulación: 1

🟠 ALTA (14 especificaciones - 35%)
├─ Control Simulación: 4
└─ Dashboard: 5
└─ Validación Global: 5

🟡 MEDIA (7 especificaciones - 17.5%)
├─ Validación Global: 0
└─ Componentes UI: 5
└─ Contexto: 2

🟢 BAJA (5 especificaciones - 12.5%)
└─ Contexto Global: 5
```

---

**Documento versión 1.0 - Especificaciones de Casos de Prueba por Módulo**  
**Última actualización: 2026-06-03**  
**Total de Especificaciones: 40 casos detallados**  
**Responsable: QA Team - UniteAir Project**
