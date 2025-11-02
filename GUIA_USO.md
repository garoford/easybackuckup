# Guía de Uso - Btrfs Visual Manager

## Instalación y Primera Configuración

### 1. Verificar Requisitos Previos

Antes de instalar la aplicación, verifica que tu sistema tenga:

```bash
# Verificar que tienes Btrfs instalado
which btrfs

# Verificar que tus particiones son Btrfs
df -T | grep btrfs

# Deberías ver algo como:
# /dev/nvme0n1p3  btrfs      ...  /
# /dev/nvme0n1p3  btrfs      ...  /home
```

### 2. Instalar la Aplicación

```bash
# Instalar desde RPM
sudo dnf install ./btrfs-visual-manager-1.0.0-1.x86_64.rpm

# O compilar desde código fuente
npm install
npm run make
sudo dnf install ./out/make/rpm/x64/btrfs-visual-manager-*.rpm
```

### 3. Primera Ejecución

Al ejecutar la aplicación por primera vez:

```bash
btrfs-visual-manager
```

La aplicación:
1. Creará su directorio de configuración en `~/.config/btrfs-visual-manager/`
2. Verificará el estado del sistema
3. Mostrará el Dashboard con información del sistema

## Operaciones Básicas

### Crear un Snapshot Manual

1. **Dashboard** → Botón **"📸 Crear Snapshot"**
2. PolicyKit solicitará tu contraseña (solo la primera vez)
3. Espera a que se complete (verás los logs en tiempo real)
4. Los snapshots se guardan en:
   - `/root/.snapshots/snap_root_YYYY-MM-DD_HH-mm-ss`
   - `/root/.snapshots/snap_home_YYYY-MM-DD_HH-mm-ss`

### Ver Snapshots Existentes

1. **Menú lateral** → **"📋 Snapshots"**
2. Verás todos los snapshots disponibles con:
   - Nombre
   - Tipo (ROOT o HOME)
   - Fecha de creación
   - Ruta completa
3. Acciones disponibles:
   - **📋 Copiar ruta**: Copia la ruta al portapapeles
   - **🗑️ Eliminar**: Elimina el snapshot (requiere confirmación)

### Restaurar un Snapshot

⚠️ **ADVERTENCIA**: Esta operación es crítica. Lee cuidadosamente.

1. **Menú lateral** → **"⚠️ Restaurar"**
2. Selecciona el snapshot de root que quieres restaurar
3. Lee la advertencia cuidadosamente
4. Haz clic en **"⚠️ Restaurar y Reiniciar"**
5. Confirma la operación dos veces
6. **GUARDA TODO TU TRABAJO**
7. Ejecuta: `sudo systemctl reboot`
8. Al reiniciar, el sistema usará el snapshot restaurado

#### ¿Qué hace la restauración?

La restauración ejecuta:
```bash
pkexec btrfs subvolume set-default /ruta/al/snapshot /
```

Esto cambia el subvolumen que se monta por defecto al arrancar. No borra nada, solo cambia cuál subvolumen se usa como root.

#### Recuperación si algo sale mal

Si el sistema no arranca:

1. Arranca desde Live USB
2. Monta tu partición:
   ```bash
   sudo mkdir /mnt/btrfs
   sudo mount /dev/sdXY /mnt/btrfs
   ```
3. Lista los subvolúmenes:
   ```bash
   sudo btrfs subvolume list /mnt/btrfs
   ```
4. Restaura al subvolumen original (generalmente ID 5):
   ```bash
   sudo btrfs subvolume set-default 5 /mnt/btrfs
   ```
5. Reinicia

## Configuración Avanzada

### Cambiar Destinos de Snapshots

1. **Menú lateral** → **"⚙️ Configuración"**
2. Modifica:
   - **Destino de snapshots de Root**: Dónde guardar snapshots de `/`
   - **Destino de snapshots de Home**: Dónde guardar snapshots de `/home`
   - **Prefijo de nombres**: Cambia "snap" por tu prefijo preferido

### Configurar Exclusiones

Las exclusiones son carpetas que idealmente deberían estar en subvolúmenes separados para no incluirse en los snapshots:

```
Downloads
Cache
.cache
.npm/_cacache
.mozilla/firefox/*/cache2
.config/google-chrome/*/Cache
```

**Mejor práctica**: Convertir estas carpetas en subvolúmenes:

```bash
# Ejemplo para Downloads
cd ~
mv Downloads Downloads.bak
btrfs subvolume create Downloads
mv Downloads.bak/* Downloads/
rmdir Downloads.bak
```

### Configurar Timers Automáticos

1. **Configuración** → **Timer Automático**
2. Marca **"Habilitar snapshots automáticos"**
3. Configura:
   - **Frecuencia**: 
     - Cada hora (para desarrollo/testing)
     - Diariamente (recomendado para usuarios)
     - Semanalmente (para uso ligero)
   - **Tipo de retención**:
     - **Por cantidad**: Mantiene los últimos N snapshots
     - **Por edad**: Elimina snapshots mayores a N días
   - **Valor**: Número de snapshots o días

4. Haz clic en **"💾 Guardar Configuración"**

El timer se activará automáticamente. Verifica con:
```bash
systemctl --user status btrfs-snap.timer
```

#### Desactivar Timer

1. **Configuración** → Desmarca **"Habilitar snapshots automáticos"**
2. **Guardar Configuración**

O manualmente:
```bash
systemctl --user stop btrfs-snap.timer
systemctl --user disable btrfs-snap.timer
```

## Monitoreo y Logs

### Ver Logs de la Aplicación

1. **Menú lateral** → **"📄 Logs"**
2. Verás todos los logs de operaciones
3. Acciones disponibles:
   - **📋 Copiar**: Copia logs al portapapeles
   - **🔄 Actualizar**: Recarga los logs
   - **🗑️ Limpiar**: Borra todos los logs

### Logs de Sistema

Ver logs del timer automático:
```bash
journalctl --user -u btrfs-snap.service
```

Ver próximas ejecuciones:
```bash
systemctl --user list-timers
```

### Ubicación de Archivos de Log

```
~/.local/share/btrfs-visual-manager/logs/app.log
~/.local/share/btrfs-visual-manager/logs/app.log.old  # Backup rotado
```

## Casos de Uso Comunes

### Backup Antes de Actualización del Sistema

```bash
# 1. Ejecuta la app
btrfs-visual-manager

# 2. Crea un snapshot
Dashboard → "📸 Crear Snapshot"

# 3. Actualiza el sistema
sudo dnf update -y

# 4. Si algo sale mal, restaura el snapshot
Restaurar → Selecciona el snapshot reciente → Restaurar
```

### Snapshots Diarios Automáticos

```bash
# Configuración recomendada:
Frecuencia: Diariamente
Retención: Por cantidad, valor 7 (mantiene última semana)
```

### Testing de Software

```bash
# 1. Crea snapshot antes de instalar
Dashboard → "📸 Crear Snapshot"

# 2. Instala y prueba el software
sudo dnf install paquete-de-prueba

# 3. Si no te gusta, restaura
Restaurar → Snapshot anterior → Reiniciar
```

## Troubleshooting

### "Error: Permission denied"

Asegúrate de que PolicyKit (pkexec) esté funcionando:
```bash
pkexec echo "test"
```

### "Error: No space left on device"

Verifica el espacio:
```bash
df -h /
btrfs filesystem df /
```

Elimina snapshots antiguos:
```bash
# Manualmente
sudo btrfs subvolume delete /ruta/al/snapshot

# O desde la app: Snapshots → Eliminar
```

### Timer no ejecuta

```bash
# Verificar estado
systemctl --user status btrfs-snap.timer

# Ver errores
journalctl --user -u btrfs-snap.service -n 50

# Recargar
systemctl --user daemon-reload
systemctl --user restart btrfs-snap.timer
```

### Script no tiene permisos

```bash
chmod +x ~/.local/bin/btrfs-snap.sh
```

## Mejores Prácticas

### 1. Planificación de Espacio

- Btrfs usa copy-on-write, los snapshots no ocupan espacio hasta que cambien los datos
- Mantén al menos 20% de espacio libre en tu partición
- Monitorea: `btrfs filesystem usage /`

### 2. Frecuencia de Snapshots

- **Usuarios normales**: Diario, retener 7-14 días
- **Desarrolladores**: Cada hora o antes de cambios importantes
- **Servidores**: Cada 6-12 horas, retener 30 días

### 3. Antes de Operaciones Críticas

Siempre crea un snapshot manual antes de:
- Actualizar el sistema
- Instalar software nuevo
- Modificar configuraciones importantes
- Compilar kernels personalizados

### 4. Verificación de Snapshots

Ocasionalmente verifica que los snapshots sean válidos:
```bash
sudo btrfs subvolume show /root/.snapshots/snap_root_*
```

### 5. Limpieza Regular

- Revisa snapshots antiguos mensualmente
- Elimina los que no necesites
- Los timers automáticos hacen esto por ti

## Preguntas Frecuentes

**P: ¿Los snapshots ocupan mucho espacio?**  
R: No, solo ocupan espacio de los datos que cambian después de crear el snapshot.

**P: ¿Puedo restaurar archivos individuales?**  
R: Esta versión restaura subvolúmenes completos. Para archivos individuales, monta el snapshot manualmente y copia los archivos.

**P: ¿Afecta el rendimiento?**  
R: El impacto es mínimo. Btrfs maneja snapshots eficientemente.

**P: ¿Puedo tener snapshots de otros subvolúmenes?**  
R: Por ahora solo soporta `/` y `/home`. Para otros, usa comandos manuales de btrfs.

**P: ¿La app funciona en otras distribuciones?**  
R: Está optimizada para Fedora, pero debería funcionar en cualquier distribución con Btrfs y systemd.

## Contacto y Soporte

- **Issues**: https://github.com/garoford/easybackuckup/issues
- **Email**: alvarohuaroc@outlook.es
- **Documentación**: https://github.com/garoford/easybackuckup

---

**Recuerda**: Los snapshots NO son backups. Para backups completos, considera copiar datos a otro disco o usar `btrfs send/receive` a otro sistema.
