#!/bin/bash
# Script para crear RPM manualmente de Btrfs Visual Manager

set -e

echo "=== Creador de RPM para Btrfs Visual Manager ==="
echo

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
VERSION="1.0.0"
NAME="btrfs-visual-manager"
BUILD_DIR="$HOME/rpmbuild"

# Verificar dependencias
echo -e "${YELLOW}Verificando dependencias...${NC}"

if ! command -v rpmbuild &> /dev/null; then
    echo -e "${RED}Error: rpmbuild no está instalado${NC}"
    echo "Instala con: sudo dnf install rpm-build rpmdevtools"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm no está instalado${NC}"
    echo "Instala con: sudo dnf install nodejs npm"
    exit 1
fi

echo -e "${GREEN}✓ Dependencias verificadas${NC}"
echo

# Limpiar builds anteriores
echo -e "${YELLOW}Limpiando builds anteriores...${NC}"
rm -rf out/
echo -e "${GREEN}✓ Limpieza completada${NC}"
echo

# Empaquetar la aplicación con Electron Forge
echo -e "${YELLOW}Empaquetando aplicación con Electron...${NC}"
npm run package

# Buscar el directorio creado (puede tener espacios)
PACKAGED_DIR=$(find out -maxdepth 1 -type d -name "*linux-x64" | head -n 1)

if [ -z "$PACKAGED_DIR" ]; then
    echo -e "${RED}Error: No se pudo empaquetar la aplicación${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Aplicación empaquetada en: $PACKAGED_DIR${NC}"
echo

# Preparar estructura RPM
echo -e "${YELLOW}Preparando estructura RPM...${NC}"

# Crear directorios rpmbuild
rpmdev-setuptree 2>/dev/null || mkdir -p "$BUILD_DIR"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# Crear tarball
TARBALL_DIR="${NAME}-${VERSION}"
rm -rf "/tmp/$TARBALL_DIR"
mkdir -p "/tmp/$TARBALL_DIR"

# Copiar archivos empaquetados
cp -r "$PACKAGED_DIR/"* "/tmp/$TARBALL_DIR/"

# Crear tarball
cd /tmp
tar czf "${NAME}-${VERSION}.tar.gz" "$TARBALL_DIR"
mv "${NAME}-${VERSION}.tar.gz" "$BUILD_DIR/SOURCES/"
cd - > /dev/null

echo -e "${GREEN}✓ Tarball creado${NC}"
echo

# Copiar spec file
cp "${NAME}.spec" "$BUILD_DIR/SPECS/"

# Construir RPM
echo -e "${YELLOW}Construyendo RPM...${NC}"
rpmbuild -ba "$BUILD_DIR/SPECS/${NAME}.spec"

if [ $? -eq 0 ]; then
    echo
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ RPM creado exitosamente!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo
    echo -e "Ubicación del RPM:"
    echo -e "${YELLOW}$BUILD_DIR/RPMS/x86_64/${NAME}-${VERSION}-1.*.x86_64.rpm${NC}"
    echo
    echo -e "Para instalar:"
    echo -e "${GREEN}sudo dnf install $BUILD_DIR/RPMS/x86_64/${NAME}-${VERSION}-1.*.x86_64.rpm${NC}"
    echo
    
    # Copiar RPM al directorio actual para fácil acceso
    cp "$BUILD_DIR/RPMS/x86_64/${NAME}-${VERSION}"-*.x86_64.rpm .
    echo -e "RPM copiado al directorio actual: ${YELLOW}${NAME}-${VERSION}-*.x86_64.rpm${NC}"
    echo
else
    echo -e "${RED}Error: Falló la construcción del RPM${NC}"
    exit 1
fi

# Limpiar
rm -rf "/tmp/$TARBALL_DIR"

echo -e "${GREEN}¡Listo! 🎉${NC}"
