# Requerimientos: App Visual de Snapshots Btrfs (Electron)

## 1) Contexto del sistema
- **SO objetivo:** Fedora (particiones Btrfs).
- **Subvolúmenes actuales:** `root`, `home`, `root/.snapshots`, `root/var/lib/machines`.
- **Herramientas existentes:** `btrfs-assistant` (no obligatorio para la app).
- **Usuario final:** Persona sin conocimientos de programación que quiere una interfaz simple y bonita para gestionar snapshots y restauraciones.

## 2) Objetivo general
- Crear una **aplicación de escritorio** con **Electron** (UI moderna) para:
  - **Snapshots automáticos** y **restauración rápida** (estilo “un botón”).
  - Incluir **/root** y **/home** en la misma operación.
  - Realizar la **restauración desde el propio sistema** (sin live USB), utilizando `btrfs subvolume set-default` y guiando el reinicio.

## 3) Alcance
- **Incluye:**
  - UI con botones claros: Crear Snapshot, Restaurar Snapshot, Configuración, Logs.
  - Ejecución de comandos Btrfs nativos (no `rsync`).
  - Configuración persistente de rutas destino de snapshots, prefijos de nombre y exclusiones de carpetas.
  - Opcional: Programación con `systemd timers` desde la app (habilitar/deshabilitar).
  - Empaquetado como **.rpm** (electron-builder).
- **No incluye** (v1):
  - Backups remotos, envío/recepción (`btrfs send/receive`) a otro host.
  - Gestión de bootloader/grub-btrfs (solo guía/nota si aplica).
  - Restauraciones selectivas por archivo (solo a nivel subvolumen).

## 4) Requerimientos funcionales
### 4.1 Snapshots
- Crear **dos snapshots de solo lectura** (`-r`) con marca de tiempo:
  - `root` → destino configurable (p.ej., `/root/.snapshots`).
  - `home` → destino configurable (p.ej., `/root/.snapshots` o propio).
- **Nomenclatura:** `<prefijo>_{root|home}_YYYY-MM-DD_HH-mm-ss`.
- Validaciones previas:
  - Verificar existencia de subvolúmenes y destinos.
  - Espacio libre suficiente (mostrar advertencias).
- Mostrar **progreso y salida** en panel de logs.

### 4.2 Restauración
- Permitir elegir un snapshot de **root** (lista de subvolúmenes de solo lectura).
- Ejecutar `btrfs subvolume set-default <ruta_snapshot_root>`.
- Mostrar advertencia y **guía para reiniciar**.
- (Opcional) Campo para snapshot de **home** y guía adicional si el diseño requiere conmutación manual.

### 4.3 Exclusiones
- Permitir configurar **exclusiones** típicas de `home` (p.ej., `Downloads`, `Cache`, `.cache`, `~/.npm/_cacache`):
  - **Estrategia recomendada:** separar en subvolúmenes independientes para no incluirlos en el snapshot.
  - La app debe ofrecer **chequeo** y guía para convertir carpetas a subvolúmenes (si no existen), o deshabilitar exclusión si no es viable.

### 4.4 Automatización (Timers)
- Opción para generar/administrar:
  - `btrfs-snap.service` (ejecuta script que crea snapshots de `root` + `home`).
  - `btrfs-snap.timer` (programación: cada hora/día/semana; selección simple).
- Parámetros: retención por **cantidad** (p.ej., mantener N últimos) o por **edad** (días).
- Botones: **Activar/Desactivar** timer + ver **estado** (systemctl).

## 5) Requerimientos no funcionales
### 5.1 UX/UI
- Diseño **oscuro**, minimalista, accesible:
  - Botones grandes, estados claros (inactivo, en progreso, éxito, error).
  - Sección de **logs** con autoscroll y copia rápida.
  - Confirmaciones antes de operaciones destructivas.
- Idioma: **Español** (estructura preparada para i18n, futuro).

### 5.2 Seguridad
- **No** habilitar `nodeIntegration` en BrowserWindow.
- Usar **IPC** seguro (`preload.js` + `contextIsolation`) para comandos del sistema.
- Escalado de privilegios:
  - Preferente: integrar con **PolicyKit (`pkexec`)** para solicitar permisos solo cuando sea necesario.
  - Evitar almacenar contraseñas.
- Validaciones de rutas y entradas de usuario (no ejecutar comandos arbitrarios).

### 5.3 Empaquetado y distribución
- `electron-builder` con objetivo **`linux: rpm`**.
- Incluir ícono, `.desktop`, categoría `Utility`.
- La app debe abrir sin conexión a internet.

### 5.4 Rendimiento y registros
- Comandos ejecutados con `spawn`, mostrando salida incremental.
- Guardar logs en archivo local rotativo (p.ej., `~/.local/share/btrfs-visual-manager/logs/app.log`).
- Manejo de errores con mensajes amigables.

## 6) Configuración y persistencia
- Archivo de configuración en `$XDG_CONFIG_HOME/btrfs-visual-manager/config.json`:
  - `rootTarget` (ruta destino snapshots de root).
  - `homeTarget` (ruta destino snapshots de home).
  - `prefix` (por defecto: `snap`).
  - `exclusions` (lista).
  - `timer` (enabled, frecuencia, retención).
- Botones: **Guardar**, **Restablecer valores por defecto**.

## 7) Flujo de usuario (alto nivel)
1. **Inicio:** La app carga config; valida subvolúmenes y destinos; muestra estado de timers.
2. **Crear Snapshot:** Usuario pulsa botón → validaciones → ejecución de 2 snapshots (`root` y `home`) → logs y resultado.
3. **Restaurar:** Usuario selecciona snapshot de root → confirmación → `set-default` → mensaje para **reiniciar**.
4. **Configurar:** Usuario ajusta destinos, prefijo, exclusiones y timers → guardar.
5. **Timers:** Usuario activa/desactiva y consulta estado; la app crea/instala service + timer.

## 8) Interfaz (módulos mínimos)
- **Dashboard:** Botones “Crear Snapshot”, “Restaurar”, tarjetas de estado, últimas ejecuciones.
- **Snapshots:** Listado de snapshots (root/home), filtros por fecha, acciones: copiar ruta, eliminar (si aplica).
- **Restauración:** Selector de snapshot de root + confirmación.
- **Configuración:** Rutas, prefijo, exclusiones (con verificación de subvolúmenes), timers (frecuencia/retención).
- **Logs:** Consola con exportar/copiar.

## 9) API interna (IPC)
- `snapshots:list({ target }) -> { items[] }` (opcional v1).
- `snapshots:create({ rootTarget, homeTarget, prefix }) -> { ok, logs, rootName, homeName }`.
- `snapshots:restore({ rootSnapshotPath }) -> { ok, logs, note }`.
- `system:check() -> { btrfsOk, subvols:{root,home}, space:{free,used}, timers:{enabled,status} }`.
- `config:get() / config:set(partial)` -> persistencia.
- `timers:enable({ schedule, retention }) / timers:disable() / timers:status()`.

## 10) Criterios de aceptación (v1)
- **CA1:** Un clic crea **dos snapshots -r** (root + home) con prefijo y timestamp, mostrando logs y resultado.
- **CA2:** Se puede **seleccionar y restaurar** un snapshot de **root** con `set-default`, y la app **informa que se requiere reinicio**.
- **CA3:** La configuración **persiste** entre ejecuciones (rutas, prefijo, exclusiones, timers).
- **CA4:** Se puede **activar/desactivar** un timer y ver su estado.
- **CA5:** App empaquetada en **.rpm**, instalable y funcional en Fedora.
- **CA6:** UI clara: estados, errores, logs visibles; sin `nodeIntegration` y con IPC seguro.

## 11) Suposiciones y restricciones
- El usuario tiene permisos para crear snapshots en los destinos configurados.
- La restauración de `/` se hará vía `set-default` + reinicio; la app **no** modifica el gestor de arranque.
- Exclusiones requieren, idealmente, diseño previo de subvolúmenes dedicados.
- No se implementan backups a otro disco/host (v1).

## 12) Entregables
- Binario **.rpm** instalable.
- Código fuente (proyecto Electron) con README.
- Archivo de configuración inicial por defecto.
- Scripts y unidades `systemd` (service + timer) generados/documentados.
- Guía de uso: crear/restaurar, configuración, timers, advertencias y recuperación.

*DEBIDO A UE TOCA ARCHIVOS CON PRIVILEGIOS OBVIAMENTE AL INCIAR LA APP TE PIDE CONTRASEÑA LA PONES Y SE QUEDA GUARDADA LA SESION*

*OJO NO USAR SUDO NO SEAS WEBON*

DOCS PARA RPM (OBLIGATORIO) : https://www.electronforge.io/config/makers/rpm