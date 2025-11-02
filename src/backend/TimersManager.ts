import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './Logger';

export interface TimerConfig {
  schedule: 'hourly' | 'daily' | 'weekly';
  retention: {
    type: 'count' | 'age';
    value: number;
  };
}

export interface TimerStatus {
  enabled: boolean;
  active: boolean;
  lastRun?: string;
  nextRun?: string;
  status: string;
}

export class TimersManager {
  private logger: Logger;
  private serviceFile = 'btrfs-snap.service';
  private timerFile = 'btrfs-snap.timer';
  private systemdUserPath: string;
  private scriptPath: string;

  constructor(logger: Logger) {
    this.logger = logger;
    this.systemdUserPath = path.join(process.env.HOME || '', '.config', 'systemd', 'user');
    this.scriptPath = path.join(process.env.HOME || '', '.local', 'bin', 'btrfs-snap.sh');
  }

  private async execCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      const proc = spawn(command, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, code: code || 0 });
      });

      proc.on('error', (error) => {
        resolve({ stdout, stderr: error.message, code: 1 });
      });
    });
  }

  private getOnCalendarValue(schedule: 'hourly' | 'daily' | 'weekly'): string {
    switch (schedule) {
      case 'hourly':
        return 'hourly';
      case 'daily':
        return 'daily';
      case 'weekly':
        return 'weekly';
      default:
        return 'daily';
    }
  }

  private generateScript(rootTarget: string, homeTarget: string, prefix: string, retention: TimerConfig['retention']): string {
    return `#!/bin/bash
# Script generado automáticamente por Btrfs Visual Manager
# No editar manualmente

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
ROOT_TARGET="${rootTarget}"
HOME_TARGET="${homeTarget}"
PREFIX="${prefix}"

echo "=== Iniciando creación de snapshots $(date) ==="

# Crear snapshot de root
echo "Creando snapshot de root..."
pkexec btrfs subvolume snapshot -r / "$ROOT_TARGET/\${PREFIX}_root_$TIMESTAMP"
if [ $? -eq 0 ]; then
    echo "✓ Snapshot de root creado"
else
    echo "✗ Error creando snapshot de root"
    exit 1
fi

# Crear snapshot de home
echo "Creando snapshot de home..."
pkexec btrfs subvolume snapshot -r /home "$HOME_TARGET/\${PREFIX}_home_$TIMESTAMP"
if [ $? -eq 0 ]; then
    echo "✓ Snapshot de home creado"
else
    echo "✗ Error creando snapshot de home"
    exit 1
fi

# Limpieza según retención
${retention.type === 'count' ? this.generateCountRetention(rootTarget, homeTarget, prefix, retention.value) : this.generateAgeRetention(rootTarget, homeTarget, prefix, retention.value)}

echo "=== Snapshots completados $(date) ==="
`;
  }

  private generateCountRetention(rootTarget: string, homeTarget: string, prefix: string, count: number): string {
    return `
echo "Aplicando retención por cantidad (mantener últimos ${count})..."

# Limpiar snapshots antiguos de root
ROOT_SNAPS=$(pkexec btrfs subvolume list -r ${rootTarget} | grep "${prefix}_root_" | sort -r | tail -n +$((${count} + 1)) | awk '{print $NF}')
for snap in $ROOT_SNAPS; do
    echo "Eliminando snapshot antiguo: ${rootTarget}/$snap"
    pkexec btrfs subvolume delete "${rootTarget}/$snap"
done

# Limpiar snapshots antiguos de home
HOME_SNAPS=$(pkexec btrfs subvolume list -r ${homeTarget} | grep "${prefix}_home_" | sort -r | tail -n +$((${count} + 1)) | awk '{print $NF}')
for snap in $HOME_SNAPS; do
    echo "Eliminando snapshot antiguo: ${homeTarget}/$snap"
    pkexec btrfs subvolume delete "${homeTarget}/$snap"
done
`;
  }

  private generateAgeRetention(rootTarget: string, homeTarget: string, prefix: string, days: number): string {
    return `
echo "Aplicando retención por edad (eliminar mayores a ${days} días)..."

# Limpiar snapshots antiguos de root
find ${rootTarget} -maxdepth 1 -name "${prefix}_root_*" -mtime +${days} -exec pkexec btrfs subvolume delete {} \\;

# Limpiar snapshots antiguos de home
find ${homeTarget} -maxdepth 1 -name "${prefix}_home_*" -mtime +${days} -exec pkexec btrfs subvolume delete {} \\;
`;
  }

  private generateServiceFile(): string {
    return `[Unit]
Description=Btrfs Snapshot Service
After=local-fs.target

[Service]
Type=oneshot
ExecStart=${this.scriptPath}
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
`;
  }

  private generateTimerFile(schedule: 'hourly' | 'daily' | 'weekly'): string {
    return `[Unit]
Description=Btrfs Snapshot Timer
Requires=btrfs-snap.service

[Timer]
OnCalendar=${this.getOnCalendarValue(schedule)}
Persistent=true

[Install]
WantedBy=timers.target
`;
  }

  async enable(config: TimerConfig, rootTarget: string, homeTarget: string, prefix: string): Promise<{ ok: boolean; error?: string }> {
    try {
      this.logger.info('Habilitando timer de snapshots', config);

      // Crear directorios si no existen
      const binDir = path.dirname(this.scriptPath);
      if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
      }
      if (!fs.existsSync(this.systemdUserPath)) {
        fs.mkdirSync(this.systemdUserPath, { recursive: true });
      }

      // Generar y escribir script
      const script = this.generateScript(rootTarget, homeTarget, prefix, config.retention);
      fs.writeFileSync(this.scriptPath, script, { mode: 0o755 });
      this.logger.info('Script de snapshot creado', { path: this.scriptPath });

      // Generar y escribir archivos de systemd
      const serviceContent = this.generateServiceFile();
      const servicePath = path.join(this.systemdUserPath, this.serviceFile);
      fs.writeFileSync(servicePath, serviceContent);
      this.logger.info('Service file creado', { path: servicePath });

      const timerContent = this.generateTimerFile(config.schedule);
      const timerPath = path.join(this.systemdUserPath, this.timerFile);
      fs.writeFileSync(timerPath, timerContent);
      this.logger.info('Timer file creado', { path: timerPath });

      // Recargar systemd
      await this.execCommand('systemctl', ['--user', 'daemon-reload']);

      // Habilitar y iniciar timer
      const enableResult = await this.execCommand('systemctl', ['--user', 'enable', this.timerFile]);
      if (enableResult.code !== 0) {
        throw new Error(`Error habilitando timer: ${enableResult.stderr}`);
      }

      const startResult = await this.execCommand('systemctl', ['--user', 'start', this.timerFile]);
      if (startResult.code !== 0) {
        throw new Error(`Error iniciando timer: ${startResult.stderr}`);
      }

      this.logger.info('Timer habilitado exitosamente');
      return { ok: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error habilitando timer', error);
      return { ok: false, error: errorMsg };
    }
  }

  async disable(): Promise<{ ok: boolean; error?: string }> {
    try {
      this.logger.info('Deshabilitando timer de snapshots');

      // Detener timer
      await this.execCommand('systemctl', ['--user', 'stop', this.timerFile]);

      // Deshabilitar timer
      const disableResult = await this.execCommand('systemctl', ['--user', 'disable', this.timerFile]);
      if (disableResult.code !== 0) {
        this.logger.warn('Error deshabilitando timer', disableResult.stderr);
      }

      this.logger.info('Timer deshabilitado exitosamente');
      return { ok: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error deshabilitando timer', error);
      return { ok: false, error: errorMsg };
    }
  }

  async getStatus(): Promise<TimerStatus> {
    const status: TimerStatus = {
      enabled: false,
      active: false,
      status: 'desconocido',
    };

    try {
      // Verificar si está habilitado
      const isEnabledResult = await this.execCommand('systemctl', ['--user', 'is-enabled', this.timerFile]);
      status.enabled = isEnabledResult.stdout.trim() === 'enabled';

      // Verificar si está activo
      const isActiveResult = await this.execCommand('systemctl', ['--user', 'is-active', this.timerFile]);
      status.active = isActiveResult.stdout.trim() === 'active';

      // Obtener información detallada
      const statusResult = await this.execCommand('systemctl', ['--user', 'status', this.timerFile]);
      status.status = statusResult.stdout;

      // Intentar obtener próxima ejecución
      const listResult = await this.execCommand('systemctl', ['--user', 'list-timers', '--all']);
      const lines = listResult.stdout.split('\n');
      for (const line of lines) {
        if (line.includes(this.timerFile)) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            status.nextRun = parts[0] + ' ' + parts[1];
          }
          if (parts.length >= 4) {
            status.lastRun = parts[2] + ' ' + parts[3];
          }
          break;
        }
      }
    } catch (error) {
      this.logger.error('Error obteniendo estado del timer', error);
    }

    return status;
  }
}
