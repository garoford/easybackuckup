%global debug_package %{nil}
%global _build_id_links none

Name:           btrfs-visual-manager
Version:        1.0.0
Release:        1%{?dist}
Summary:        Aplicación visual para gestionar snapshots y restauraciones de Btrfs

License:        MIT
URL:            https://github.com/garoford/easybackuckup
Source0:        %{name}-%{version}.tar.gz

Requires:       btrfs-progs
Requires:       polkit

%description
Btrfs Visual Manager es una aplicación de escritorio para gestionar
snapshots y restauraciones de Btrfs en Fedora de forma visual y sencilla.

Características:
- Crear snapshots de solo lectura de / y /home con un solo clic
- Restaurar snapshots de root con btrfs subvolume set-default
- Gestión de timers automáticos con systemd
- Configuración persistente de rutas, prefijos y exclusiones
- Interfaz oscura, minimalista y accesible

%prep
%setup -q

%build
# No build needed - precompiled Electron app

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT/opt/%{name}
mkdir -p $RPM_BUILD_ROOT/usr/bin
mkdir -p $RPM_BUILD_ROOT/usr/share/applications
mkdir -p $RPM_BUILD_ROOT/usr/share/icons/hicolor/256x256/apps

# Copy application files
cp -r * $RPM_BUILD_ROOT/opt/%{name}/

# Create symlink
ln -s /opt/%{name}/%{name} $RPM_BUILD_ROOT/usr/bin/%{name}

# Install desktop file
cat > $RPM_BUILD_ROOT/usr/share/applications/%{name}.desktop << EOF
[Desktop Entry]
Name=Btrfs Visual Manager
Comment=Gestión visual de snapshots Btrfs
Exec=/usr/bin/btrfs-visual-manager
Icon=btrfs-visual-manager
Terminal=false
Type=Application
Categories=Utility;System;
Keywords=btrfs;snapshot;backup;
EOF

%files
/opt/%{name}
/usr/bin/%{name}
/usr/share/applications/%{name}.desktop

%changelog
* Sat Nov 02 2024 Alvaro Huaroc <alvarohuaroc@outlook.es> - 1.0.0-1
- Initial release
- Snapshots automáticos y restauración rápida
- UI con botones claros
- Configuración persistente
- Timers automáticos con systemd
