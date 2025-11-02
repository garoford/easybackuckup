# Btrfs Visual Manager

Aplicación de escritorio para gestionar snapshots y restauraciones de Btrfs en Fedora de forma visual y sencilla.

## 📋 Características

- ✅ Crear snapshots de solo lectura de `/` y `/home` con un solo clic
- ✅ Restaurar snapshots de root con `btrfs subvolume set-default`
- ✅ Gestión de timers automáticos con systemd
- ✅ Configuración persistente de rutas, prefijos y exclusiones
- ✅ Interfaz oscura, minimalista y accesible
- ✅ Sistema de logs rotativo
- ✅ Uso seguro de PolicyKit (pkexec) para operaciones privilegiadas
- ✅ Sin nodeIntegration - IPC seguro con contextBridge

## 🚀 Instalación

### Desde RPM (Recomendado)

```bash
# Instalar el paquete RPM
sudo dnf install ./out/make/rpm/x64/btrfs-visual-manager-*.rpm

# Iniciar la aplicación
btrfs-visual-manager
```

### Desde Código Fuente

```bash
# Clonar el repositorio
git clone https://github.com/garoford/easybackuckup.git
cd easybackuckup

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start

# Empaquetar como RPM
npm run make
```

## 📦 Requisitos

- Fedora (u otra distribución Linux con Btrfs)
- Node.js 18 o superior
- `btrfs-progs` instalado
- `rpm-build` para empaquetar
- Particiones con sistema de archivos Btrfs

## 🎯 Uso

### Crear Snapshot

1. Abre la aplicación
2. En el Dashboard, haz clic en "📸 Crear Snapshot"
3. La aplicación creará automáticamente dos snapshots:
   - Uno de `/` (root)
   - Uno de `/home`
4. Los snapshots se guardan con timestamp: `snap_root_2025-11-02_15-30-00`

### Restaurar Snapshot

1. Ve a la sección "Restaurar"
2. Selecciona el snapshot de root que deseas restaurar
3. Confirma la operación
4. **Reinicia el sistema** para aplicar la restauración

⚠️ **IMPORTANTE**: La restauración cambia el subvolumen por defecto. Guarda todo tu trabajo antes de reiniciar.

### Configuración

En la sección "Configuración" puedes:

- **Rutas de destino**: Dónde se guardan los snapshots
- **Prefijo**: Prefijo para los nombres de snapshots (default: `snap`)
- **Exclusiones**: Carpetas a excluir (idealmente como subvolúmenes separados)
- **Timer Automático**: 
  - Frecuencia: Cada hora, diariamente o semanalmente
  - Retención: Por cantidad (últimos N) o por edad (días)

### Timers Automáticos

Cuando habilitas el timer automático:

1. Se crea un script en `~/.local/bin/btrfs-snap.sh`
2. Se crean archivos systemd en `~/.config/systemd/user/`:
   - `btrfs-snap.service`
   - `btrfs-snap.timer`
3. El timer se habilita e inicia automáticamente

Para verificar el estado manualmente:
```bash
systemctl --user status btrfs-snap.timer
systemctl --user list-timers
```

## 🔒 Seguridad

- La aplicación NO utiliza `nodeIntegration`
- Todas las operaciones privilegiadas usan `pkexec` (PolicyKit)
- IPC seguro con `contextIsolation` y `contextBridge`
- No se almacenan contraseñas
- Validación de entradas de usuario

Al ejecutar por primera vez una operación privilegiada, PolicyKit solicitará tu contraseña. La sesión se mantiene activa durante el uso de la aplicación.

## 📁 Estructura de Archivos

```
~/.config/btrfs-visual-manager/
  └── config.json                    # Configuración de la app

~/.local/share/btrfs-visual-manager/
  └── logs/
      └── app.log                    # Logs de la aplicación

~/.local/bin/
  └── btrfs-snap.sh                  # Script de snapshots automáticos

~/.config/systemd/user/
  ├── btrfs-snap.service             # Servicio systemd
  └── btrfs-snap.timer               # Timer systemd
```

## 🛠️ Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start

# Linter
npm run lint

# Empaquetar
npm run package

# Crear RPM
npm run make
```

### Estructura del Código

```
src/
├── backend/
│   ├── BtrfsManager.ts      # Operaciones btrfs
│   ├── ConfigManager.ts     # Gestión de configuración
│   ├── Logger.ts            # Sistema de logs
│   └── TimersManager.ts     # Gestión de systemd timers
├── main.ts                  # Proceso principal de Electron
├── preload.ts               # Bridge seguro IPC
├── renderer.ts              # Lógica de UI
├── index.css                # Estilos
└── types.d.ts               # Tipos TypeScript
```

## 🐛 Solución de Problemas

### Error: "btrfs: command not found"

Instala btrfs-progs:
```bash
sudo dnf install btrfs-progs
```

### Los snapshots no se crean

Verifica que:
1. Las particiones son Btrfs: `df -T`
2. Tienes permisos en el directorio de destino
3. Hay espacio disponible: `df -h`

### El timer no funciona

Verifica el estado:
```bash
systemctl --user status btrfs-snap.timer
journalctl --user -u btrfs-snap.service
```

Recarga systemd:
```bash
systemctl --user daemon-reload
systemctl --user enable btrfs-snap.timer
systemctl --user start btrfs-snap.timer
```

### Recuperación desde Live USB

Si el sistema no arranca después de una restauración:

1. Arranca desde Live USB de Fedora
2. Monta tu partición root:
   ```bash
   sudo mount /dev/sdXY /mnt
   ```
3. Restaura el subvolumen por defecto:
   ```bash
   sudo btrfs subvolume set-default 5 /mnt
   ```
4. Reinicia

## 📝 Licencia

MIT License - Álvaro Huaroc

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📧 Contacto

Álvaro Huaroc - alvarohuaroc@outlook.es

Proyecto: https://github.com/garoford/easybackuckup
