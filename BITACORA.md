# Bitácora de Desarrollo

> **Instrucción Principal:** Esta bitácora deve ser actualizada diariamente con la fecha y las acciones realizadas. Su propósito es mantener el hilo del trabajo para no tener que repetir instrucciones y poder continuar exactamente desde el punto anterior.

## Registro

### 2026-02-03 (Actual)
- **Configuración de Bitácora:** Se ha creado este archivo `BITACORA.md` para iniciar el registro de actividades.
- **Contexto Anterior:** Se revisó el último commit en git para recuperar el contexto del trabajo previo.
- **Acción:** Se inicia el servidor de desarrollo (`npm run dev`) para verificar el funcionamiento de la aplicación y retomar la tarea anterior (auth fix).
- **Verificación:** Se abrió la aplicación en el navegador (`http://localhost:3000`). La página de login carga correctamente. Al hacer clic en el botón de Google, se inicia el flujo de autenticación (`signInWithPopup`), redirigiendo correctamente a la pantalla de inicio de sesión de Google.
- **Correcciones:**
    - **Hydration Error:** Se agregó `suppressHydrationWarning={true}` al `<body>` en `app/layout.js` para silenciar advertencias de atributos que no coinciden (posiblemente por extensiones o clases inyectadas).
    - **Auth Error:** Se implementó el manejo del error `auth/cancelled-popup-request` en `app/login/page.js` para evitar que se muestre como un fallo crítico cuando el usuario cierra la ventana de login.
    - **Offline Error:** Se modificó `lib/firebase.js` para usar `initializeFirestore` con `experimentalForceLongPolling: true`. Esto suele corregir errores de "client is offline" causados por restricciones de red o problemas con WebSockets.
        - *Nota:* El usuario confirma estar en una **red pública**, lo que valida el uso de long polling ya que estas redes suelen bloquear WebSockets.
    - **Debug (Intento 2):** El error persistió incluso con datos móviles.
        - Se **revertió** `experimentalForceLongPolling` para probar si la conexión móvil maneja mejor los WebSockets estándar.
        - Se mejoró `lib/firebase.js` con un patrón `try/catch` para evitar choques en Hot Module Reload (HMR).
        - Se agregaron logs explícitos en `app/login/page.js` para verificar que el objeto `user` llegue correctamente antes de llamar a Firestore.
    - **Auth Popup Error:** Se detectó el error `Cross-Origin-Opener-Policy policy would block the window.closed call`.
        - **Solución (Intento 2):** Se relajaron las políticas a `Cross-Origin-Opener-Policy: unsafe-none` y `Cross-Origin-Embedder-Policy: unsafe-none` en `next.config.ts`. Si bien `same-origin-allow-popups` es más seguro, en desarrollo local y algunos navegadores estrictos, es necesario desactivar el aislamiento para que el popup funcione correctamente.
            - *Corrección (Intento 3):* El popup abría pero quedaba en blanco.
                - Se **restauró** `experimentalForceLongPolling: true` en `lib/firebase.js` ya que el usuario está en red pública y WebSockets fallan.
                - Se **eliminó** el header `Cross-Origin-Embedder-Policy` de `next.config.ts` dejando solo COOP `unsafe-none`. COEP puede bloquear la carga de recursos externos (como los scripts de Google/Firebase) dentro del popup o iframe si no están configurados con CORP explícito.
        - **Reinicio Manual:** Se inició el servidor nuevamente (`npm run dev`) tras haberlo detenido accidentalmente, lo que causaba el error `ERR_CONNECTION_REFUSED`.
    - **Incognito Hang:** La aplicación se quedaba "Cargando..." en modo incógnito.
        - **Causa:** Las ventanas de incógnito a menudo bloquean `IndexedDB`, lo que hace fallar la persistencia por defecto de Firestore.
        - **Solución:** Se configuró explícitamente `localCache: memoryLocalCache()` en `lib/firebase.js`. Esto evita el uso de disco y forza el uso de memoria RAM, compatible con incógnito y redes restrictivas.
        - **Logs:** Se agregaron logs detallados en `app/login/page.js` para rastrear paso a paso (`Starting login`, `Initialization`, etc.) dónde se detiene el proceso si vuelve a fallar.
    - **Auth IndexedDB Error:** En incógnito, el servicio de autenticación también fallaba al intentar acceder a IndexedDB (`Failed to execute 'transaction' ...`).
        - **Solución Final:** Se configuró `setPersistence(auth, browserSessionPersistence)` en `lib/firebase.js`. Esto le indica a Firebase Auth que guarde la sesión en `sessionStorage` (temporal, solo dura mientras la pestaña está abierta) en lugar de intentar usar IndexedDB, eliminando así el error fatal.
    - **Conflicto de Puertos:** Se detectó que el usuario tiene el servidor corriendo en su propia terminal.
        - **Acción:** Se solicita al usuario reiniciar su proceso manual para aplicar los cambios de configuración (`lib/firebase.js` y `next.config.ts`).
    - **Persistencia del Problema:** Los intentos de configurar persistencia y caché fallaron debido a bloqueos estrictos del navegador en Incógnito/Red Pública.
        - **Solución Alternativa (Developer Bypass):** Se implementó un botón "Entrar como Desarrollador" en `app/login/page.js`. Este botón simula un login exitoso (`localStorage`) y permite acceder al Dashboard sin pasar por Firebase Auth, desbloqueando así el desarrollo de otras funcionalidades.
        - **Limpieza:** Se simplificó `lib/firebase.js` manteniendo solo `experimentalForceLongPolling` para estabilidad, eliminando configuraciones complejas de caché y persistencia que causaban errores.
    - **Dashboard Hang:** Aún con el bypass, la pantalla de inicio (`app/(main)/page.js`) se quedaba en "Cargando...".
        - **Causa:** El `useEffect` principal seguía esperando a `onAuthStateChanged` de Firebase, que nunca respondía.
        - **Solución:** Se modificó `app/(main)/page.js` para detectar primero el flag de modo desarrollado (`localStorage`) e inyectar datos de prueba inmediatamente, evitando la espera de red.
    - **Trading Hang & Label:** La pantalla de Trading también se quedaba cargando y tenía la etiqueta incorrecta "Perfil".
        - **Solución:** Se renombró el ítem de navegación a "Trading" (`components/BottomNav.js`) y se aplicó el mismo bypass de desarrollador en `app/(main)/screen3/page.js`. Se corrigió un duplicado accidental del ítem "MP".
    - **Lógica de Trading:** Se solicitó cambiar la lógica de un simulador de apalancamiento a un sistema de Ratios Fijos (Quiz Style) y luego se reincorporó el apalancamiento.
        - **Implementación:** 
            - **Ratios TP:SL:** 2:1, 3:1, 3:2, 5:2.
            - **Apalancamiento:** x1, x5, x10.
            - **Timer:** Cuenta regresiva de 30s, ubicada debajo de los botones de acción con el título "CONFIRMAR EN".
            - **Fórmula:** Riesgo = $1,000 (Fijo) | Recompensa = $1,000 * Ratio * Apalancamiento.

### 2026-01-29 (Contexto Previo)
- **Commit:** `fix(auth): switch to signInWithPopup to resolve 404 error on localhost` (6f76feb)
- **Descripción:** Se ajustó la autenticación para usar `signInWithPopup` y resolver errores en entorno local.

### 2026-02-10
- **Trading Screen**: Se completó la lógica de trading con Ratios (2:1, 3:1, etc.), Apalancamiento (x1, x5, x10) y Timer de 30s.
- **Liquidación**: Se implementaron botones para retirar capital de LP y MP (Vender Todo) hacia el balance de Trading.
- **Historial**: Se agregó el registro de operaciones y una modal para visualizar el historial en la pantalla de Trading.
- **Admin Panel**: Se creó una pantalla `/admin` protegida para agregar proyectos LP y actualizar datos económicos.
- **Market Data**: Se creó una pantalla `/data` pública que muestra el índice Fear & Greed y datos económicos controlados desde el Admin.
- **Navegación**: Se actualizó el BottomNav para incluir la pantalla de Data.
- **Git**: Se realizó push de todos los cambios al repositorio.
