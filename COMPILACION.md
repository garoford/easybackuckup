# Instrucciones de Compilación y Empaquetado

## Requisitos del Sistema

### En Fedora (Sistema de Destino)

```bash
# Instalar Node.js y npm
sudo dnf install nodejs npm

# Instalar dependencias para empaquetar RPM
sudo dnf install rpm-build

# Verificar instalación
node --version  # Debe ser v18 o superior
npm --version
```

## Compilación Desde Código Fuente

### 1. Clonar o Descargar el Proyecto

```bash
cd ~/Development
# Si ya estás en el directorio del proyecto, salta este paso
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará todas las dependencias necesarias incluyendo:
- Electron
- Electron Forge
- TypeScript
- Y todas las dependencias de desarrollo

### 3. Desarrollo (Opcional)

Para ejecutar la app en modo desarrollo:

```bash
npm start
```

Esto abrirá la aplicación con hot-reload habilitado. Los cambios en el código se reflejarán automáticamente.

### 4. Compilar TypeScript

TypeScript se compila automáticamente al ejecutar `npm start` o `npm run package`, pero si quieres compilar manualmente:

```bash
npm run build
```

### 5. Empaquetar la Aplicación

Para crear el ejecutable sin empaquetarlo en RPM:

```bash
npm run package
```

Esto creará la aplicación empaquetada en: `out/btrfs-visual-manager-linux-x64/`

### 6. Crear el RPM

Para crear el paquete RPM instalable:

```bash
npm run make
```

El RPM se generará en:
```
out/make/rpm/x64/btrfs-visual-manager-1.0.0-1.x86_64.rpm
```

## Instalación del RPM

Una vez generado el RPM:

```bash
# Instalar
sudo dnf install ./out/make/rpm/x64/btrfs-visual-manager-1.0.0-1.x86_64.rpm

# Ejecutar
btrfs-visual-manager
```

## Desinstalación

```bash
sudo dnf remove btrfs-visual-manager
```

## Limpieza

Para limpiar archivos de compilación:

```bash
# Limpiar out/
rm -rf out/

# Limpiar node_modules (si quieres reinstalar desde cero)
rm -rf node_modules/
npm install
```

## Problemas Comunes

### Error: "Cannot find module '@electron-forge/...'"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "rpm-build not found"

```bash
sudo dnf install rpm-build
```

### Error de permisos al crear RPM

```bash
# No uses sudo para npm run make
npm run make
# Solo usa sudo para instalar el RPM resultante
```

### TypeScript errors

```bash
# Verificar que TypeScript esté instalado
npx tsc --version

# Reinstalar dependencias de desarrollo
npm install --save-dev typescript
```

## Desarrollo Avanzado

### Estructura de Scripts npm

```json
{
  "start": "electron-forge start",      // Modo desarrollo
  "package": "electron-forge package",  // Empaquetar sin distribuir
  "make": "electron-forge make",        // Crear RPM
  "publish": "electron-forge publish",  // Publicar (no configurado)
  "lint": "eslint --ext .ts,.tsx ."    // Verificar código
}
```

### Linting

Para verificar el código sin compilar:

```bash
npm run lint
```

Para auto-fix de problemas menores:

```bash
npm run lint -- --fix
```

### Debugging

La aplicación abre DevTools automáticamente en modo desarrollo. Para debug en producción, modifica `main.ts`:

```typescript
// Descomentar esta línea en createWindow():
// mainWindow.webContents.openDevTools();
```

### Variables de Entorno

Para debugging más detallado:

```bash
# Debug de Electron
DEBUG=electron* npm start

# Debug del maker RPM
DEBUG=electron-installer-redhat* npm run make
```

## Distribución

### Crear Release

1. Actualiza la versión en `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. Compila el RPM:
   ```bash
   npm run make
   ```

3. El RPM estará en `out/make/rpm/x64/`

### Subir a GitHub Releases

```bash
# Tag de versión
git tag v1.0.0
git push origin v1.0.0

# Subir el RPM a GitHub Releases manualmente
# O configurar electron-forge publish (ver documentación)
```

## Testing en Máquina Virtual

Recomendado para testing antes de distribución:

```bash
# Crear VM con Fedora
# Copiar el RPM
scp out/make/rpm/x64/btrfs-visual-manager-*.rpm user@vm:~/

# En la VM
sudo dnf install ~/btrfs-visual-manager-*.rpm
btrfs-visual-manager
```

## Próximos Pasos Después de Compilar

1. ✅ Instalar el RPM
2. ✅ Ejecutar la aplicación
3. ✅ Verificar que detecta Btrfs correctamente
4. ✅ Crear un snapshot de prueba
5. ✅ Verificar los logs
6. ✅ Probar la configuración
7. ⚠️ NO pruebes la restauración en tu sistema principal sin backup

## Recursos Adicionales

- [Electron Forge Docs](https://www.electronforge.io/)
- [Electron Docs](https://www.electronjs.org/docs)
- [Btrfs Wiki](https://btrfs.wiki.kernel.org/)
- [Systemd Timers](https://www.freedesktop.org/software/systemd/man/systemd.timer.html)

## Contacto

Si tienes problemas compilando, abre un issue en:
https://github.com/garoford/easybackuckup/issues
