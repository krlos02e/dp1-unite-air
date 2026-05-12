/******************************************************************************
* ARCHIVO 1: AGENT.MD
* Ubicación:.opencode/AGENTS.md
* Objetivo: Reglas de comportamiento y arquitectura para el agente de OpenCode.
  ******************************************************************************/

# UNITEAIR AGENT RULES & PROJECT CONTEXT

## 1. ESTRUCTURA DEL ECOSISTEMA
El sistema se divide en tres proyectos estrictamente separados:
- `dp1-frontend`: Aplicación SPA en React con Vite y Tailwind CSS.
- `dp1-backend`: API REST en Spring Boot 3.x (Java 17).
- `dp1-algoritmos`: Librería de optimización (ALNS/ACO) que ya existe.

## 2. REGLA CRÍTICA DE INMUTABILIDAD
- **PROHIBIDO MODIFICAR** la lógica interna del proyecto `dp1-algoritmos`.
- El backend solo debe configurar las clases 'Wrapper' o 'Mapper' para preparar los datos de entrada (estado del grafo, pedidos) y recibir los planes de ruta calculados.

## 3. ESTÁNDARES DEL BACKEND (dp1-backend)
- **Arquitectura**: Controller -> Service -> Repository.
- **DTOs**: Uso obligatorio para toda transferencia de datos hacia el frontend. No exponer entidades JPA.
- **Autenticación**: Basada en Cookies persistentes. Las peticiones deben incluir `withCredentials: true`.
- **Asincronía**: El motor de simulación debe correr en hilos separados usando `@Async`.
- **Estrategia de Caché**: Implementar Caffeine Cache para almacenar el estado de la simulación activa (maletas por aeropuerto, vuelos actuales). El Polling del front debe leer de esta caché, no de la DB.

## 4. ESTÁNDARES DEL FRONTEND (dp1-frontend)
- **Estructura de Carpetas**: `components`, `services`, `hooks`, `models`, `pages`, `types`, `context`.
- **HttpClient**: Basado en Axios, extendido por servicios específicos.
- **UI/UX**:
    - Dimensiones: 1440x1024 px.
    - Colores: Primario `blue-600`, Fondo `sky-300`.
    - Estados (Semáforo): Emerald-500 (Normal), Yellow-400 (Alerta), Red-500 (Crítico > 80% capacidad).
- **Mapa**: Componente central que visualiza la red mundial. Polling obligatorio cada 2 segundos.

## 5. REGLAS DE NEGOCIO (Tasf.B2B)
- **Capacidades**: Almacenes (500-800 maletas), Vuelos Intra (150-250), Vuelos Inter (150-400).
- **Tiempos**: Traslado intra-continente (0.5 días), Inter-continente (1 día).
- **Plazos**: Entrega en 24h (mismo continente) o 48h (distinto).
