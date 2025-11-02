#!/bin/bash
# Script de desinstalación para Btrfs Visual Manager

set -e

echo "=== Desinstalador de Btrfs Visual Manager ==="
echo

INSTALL_DIR="/opt/btrfs-visual-manager"
BIN_LINK="/usr/local/bin/btrfs-visual-manager"
DESKTOP_FILE="/usr/share/applications/btrfs-visual-manager.desktop"
ICON_FILE="/usr/share/icons/hicolor/256x256/apps/btrfs-visual-manager.png"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "Btrfs Visual Manager no parece estar instalado"
    exit 1
fi

echo "Eliminando archivos..."

# Eliminar directorio de instalación
sudo rm -rf "$INSTALL_DIR"

# Eliminar symlink
[ -L "$BIN_LINK" ] && sudo rm "$BIN_LINK"

# Eliminar archivo .desktop
[ -f "$DESKTOP_FILE" ] && sudo rm "$DESKTOP_FILE"

# Eliminar ícono
[ -f "$ICON_FILE" ] && sudo rm "$ICON_FILE"

# Actualizar base de datos de aplicaciones
which update-desktop-database > /dev/null 2>&1 && sudo update-desktop-database /usr/share/applications || true

echo
echo "✓ Desinstalación completada!"
echo
echo "Nota: Los archivos de configuración y logs en tu directorio home no se eliminaron:"
echo "  ~/.config/btrfs-visual-manager/"
echo "  ~/.local/share/btrfs-visual-manager/"
echo
echo "Si deseas eliminarlos también:"
echo "  rm -rf ~/.config/btrfs-visual-manager"
echo "  rm -rf ~/.local/share/btrfs-visual-manager"
