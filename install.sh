#!/bin/bash
# Script de instalación manual para Btrfs Visual Manager

set -e

echo "=== Instalador de Btrfs Visual Manager ==="
echo

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "Error: Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar dependencias
echo "Verificando dependencias del sistema..."
which btrfs > /dev/null 2>&1 || {
    echo "Error: btrfs-progs no está instalado"
    echo "Instala con: sudo dnf install btrfs-progs"
    exit 1
}

which pkexec > /dev/null 2>&1 || {
    echo "Error: polkit no está instalado"
    echo "Instala con: sudo dnf install polkit"
    exit 1
}

# Empaquetar la aplicación
echo "Empaquetando aplicación..."
npm run package

# Crear directorios de instalación
INSTALL_DIR="/opt/btrfs-visual-manager"
BIN_DIR="/usr/local/bin"
DESKTOP_DIR="/usr/share/applications"
ICON_DIR="/usr/share/icons/hicolor/256x256/apps"

echo "Instalando en $INSTALL_DIR..."
sudo mkdir -p "$INSTALL_DIR"
sudo mkdir -p "$BIN_DIR"
sudo mkdir -p "$DESKTOP_DIR"
sudo mkdir -p "$ICON_DIR"

# Copiar archivos
sudo cp -r out/btrfs-visual-manager-linux-x64/* "$INSTALL_DIR/"

# Crear symlink en /usr/local/bin
sudo ln -sf "$INSTALL_DIR/btrfs-visual-manager" "$BIN_DIR/btrfs-visual-manager"

# Crear archivo .desktop
cat << EOF | sudo tee "$DESKTOP_DIR/btrfs-visual-manager.desktop" > /dev/null
[Desktop Entry]
Name=Btrfs Visual Manager
Comment=Gestión visual de snapshots Btrfs
Exec=/usr/local/bin/btrfs-visual-manager
Icon=btrfs-visual-manager
Terminal=false
Type=Application
Categories=Utility;System;
Keywords=btrfs;snapshot;backup;
EOF

# Dar permisos de ejecución
sudo chmod +x "$INSTALL_DIR/btrfs-visual-manager"
sudo chmod 644 "$DESKTOP_DIR/btrfs-visual-manager.desktop"

# Actualizar base de datos de aplicaciones
which update-desktop-database > /dev/null 2>&1 && sudo update-desktop-database "$DESKTOP_DIR" || true

echo
echo "✓ Instalación completada!"
echo
echo "Puedes ejecutar la aplicación con:"
echo "  btrfs-visual-manager"
echo
echo "O buscarla en el menú de aplicaciones como 'Btrfs Visual Manager'"
echo
echo "Para desinstalar, ejecuta: sudo ./uninstall.sh"
