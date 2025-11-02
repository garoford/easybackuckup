import { spawn } from 'child_process';
import { Logger } from './Logger';

export interface BtrfsSnapshot {
  path: string;
  name: string;
  type: 'root' | 'home';
  timestamp: Date;
  readonly: boolean;
}

export interface SystemCheck {
  btrfsOk: boolean;
  subvols: {
    root: boolean;
    home: boolean;
  };
  space: {
    free: string;
    used: string;
    total: string;
  };
  error?: string;
}

export interface SnapshotCreateResult {
  ok: boolean;
  logs: string[];
  rootName?: string;
  homeName?: string;
  error?: string;
}

export interface RestoreResult {
  ok: boolean;
  logs: string[];
  note: string;
  error?: string;
}

export class BtrfsManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private async execCommand(command: string, args: string[], usePkexec = false): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      const finalCommand = usePkexec ? 'pkexec' : command;
      const finalArgs = usePkexec ? [command, ...args] : args;

      this.logger.info(`Ejecutando comando: ${finalCommand} ${finalArgs.join(' ')}`);

      const proc = spawn(finalCommand, finalArgs);
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
        this.logger.error('Error ejecutando comando', error);
        resolve({ stdout, stderr: error.message, code: 1 });
      });
    });
  }

  async checkSystem(): Promise<SystemCheck> {
    const result: SystemCheck = {
      btrfsOk: false,
      subvols: { root: false, home: false },
      space: { free: '0', used: '0', total: '0' },
    };

    try {
      // Verificar si btrfs está disponible
      const btrfsCheck = await this.execCommand('which', ['btrfs']);
      result.btrfsOk = btrfsCheck.code === 0;

      if (!result.btrfsOk) {
        result.error = 'Btrfs no está instalado o no está disponible en el PATH';
        return result;
      }

      // Verificar subvolúmenes
      const rootCheck = await this.execCommand('btrfs', ['subvolume', 'show', '/'], true);
      result.subvols.root = rootCheck.code === 0;

      const homeCheck = await this.execCommand('btrfs', ['subvolume', 'show', '/home'], true);
      result.subvols.home = homeCheck.code === 0;

      // Obtener información de espacio
      const spaceInfo = await this.execCommand('df', ['-h', '/'], false);
      if (spaceInfo.code === 0) {
        const lines = spaceInfo.stdout.split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          if (parts.length >= 4) {
            result.space.total = parts[1];
            result.space.used = parts[2];
            result.space.free = parts[3];
          }
        }
      }
    } catch (error) {
      this.logger.error('Error verificando sistema', error);
      result.error = error instanceof Error ? error.message : 'Error desconocido';
    }

    return result;
  }

  async listSnapshots(targetDir: string): Promise<BtrfsSnapshot[]> {
    const snapshots: BtrfsSnapshot[] = [];

    try {
      const result = await this.execCommand('btrfs', ['subvolume', 'list', '-r', targetDir], true);
      
      if (result.code !== 0) {
        this.logger.error('Error listando snapshots', result.stderr);
        return snapshots;
      }

      const lines = result.stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Formato: ID 256 gen 123 top level 5 path .snapshots/snap_root_2025-11-02_10-30-00
        const match = line.match(/path\s+(.+)$/);
        if (match) {
          const fullPath = match[1];
          const name = fullPath.split('/').pop() || '';
          
          // Determinar tipo
          let type: 'root' | 'home' = 'root';
          if (name.includes('_home_')) {
            type = 'home';
          }

          // Extraer timestamp del nombre
          const timestampMatch = name.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})$/);
          let timestamp = new Date();
          if (timestampMatch) {
            const dateStr = timestampMatch[1].replace('_', 'T').replace(/-/g, ':').substring(0, 19);
            timestamp = new Date(dateStr);
          }

          snapshots.push({
            path: `${targetDir}/${fullPath}`,
            name,
            type,
            timestamp,
            readonly: true,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error listando snapshots', error);
    }

    return snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createSnapshot(rootTarget: string, homeTarget: string, prefix: string): Promise<SnapshotCreateResult> {
    const logs: string[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const rootName = `${prefix}_root_${timestamp}`;
    const homeName = `${prefix}_home_${timestamp}`;

    try {
      logs.push('Iniciando creación de snapshots...');

      // Verificar y crear directorio destino si no existe
      logs.push(`Verificando directorios de destino...`);
      const mkdirRoot = await this.execCommand('mkdir', ['-p', rootTarget], true);
      if (mkdirRoot.code !== 0 && !mkdirRoot.stderr.includes('File exists')) {
        logs.push(`Advertencia creando directorio root: ${mkdirRoot.stderr}`);
      }
      
      const mkdirHome = await this.execCommand('mkdir', ['-p', homeTarget], true);
      if (mkdirHome.code !== 0 && !mkdirHome.stderr.includes('File exists')) {
        logs.push(`Advertencia creando directorio home: ${mkdirHome.stderr}`);
      }

      // Crear snapshot de root
      logs.push(`Creando snapshot de root: ${rootName}`);
      const rootResult = await this.execCommand(
        'btrfs',
        ['subvolume', 'snapshot', '-r', '/', `${rootTarget}/${rootName}`],
        true
      );

      if (rootResult.code !== 0) {
        logs.push(`Error creando snapshot de root: ${rootResult.stderr}`);
        return {
          ok: false,
          logs,
          error: rootResult.stderr,
        };
      }

      logs.push(`✓ Snapshot de root creado: ${rootTarget}/${rootName}`);

      // Crear snapshot de home
      logs.push(`Creando snapshot de home: ${homeName}`);
      const homeResult = await this.execCommand(
        'btrfs',
        ['subvolume', 'snapshot', '-r', '/home', `${homeTarget}/${homeName}`],
        true
      );

      if (homeResult.code !== 0) {
        logs.push(`Error creando snapshot de home: ${homeResult.stderr}`);
        return {
          ok: false,
          logs,
          rootName,
          error: homeResult.stderr,
        };
      }

      logs.push(`✓ Snapshot de home creado: ${homeTarget}/${homeName}`);
      logs.push('✓ Snapshots creados exitosamente');

      this.logger.info('Snapshots creados', { rootName, homeName });

      return {
        ok: true,
        logs,
        rootName,
        homeName,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      logs.push(`Error: ${errorMsg}`);
      this.logger.error('Error creando snapshots', error);
      return {
        ok: false,
        logs,
        error: errorMsg,
      };
    }
  }

  async restoreSnapshot(snapshotPath: string): Promise<RestoreResult> {
    const logs: string[] = [];

    try {
      logs.push(`Restaurando snapshot: ${snapshotPath}`);

      // Obtener el ID del subvolumen root actual
      const rootIdResult = await this.execCommand('btrfs', ['subvolume', 'get-default', '/'], true);
      if (rootIdResult.code === 0) {
        logs.push(`Subvolumen root actual: ${rootIdResult.stdout.trim()}`);
      }

      // Establecer el snapshot como default
      const result = await this.execCommand('btrfs', ['subvolume', 'set-default', snapshotPath], true);

      if (result.code !== 0) {
        logs.push(`Error estableciendo snapshot como default: ${result.stderr}`);
        return {
          ok: false,
          logs,
          note: '',
          error: result.stderr,
        };
      }

      logs.push('✓ Snapshot establecido como subvolumen por defecto');
      
      const note = `
IMPORTANTE: Pasos para completar la restauración:

1. Guarda tu trabajo y cierra todas las aplicaciones
2. Reinicia el sistema: sudo systemctl reboot
3. Al arrancar, el sistema usará el snapshot restaurado

NOTA: Si tienes problemas, puedes arrancar desde un Live USB y ejecutar:
  btrfs subvolume set-default 5 /mnt
(donde /mnt es tu partición root montada)

Para hacer permanente el snapshot restaurado y limpiar el anterior,
considera mover los datos o eliminar el subvolumen antiguo después
de verificar que todo funciona correctamente.
      `.trim();

      this.logger.info('Snapshot restaurado, requiere reinicio', { snapshotPath });

      return {
        ok: true,
        logs,
        note,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      logs.push(`Error: ${errorMsg}`);
      this.logger.error('Error restaurando snapshot', error);
      return {
        ok: false,
        logs,
        note: '',
        error: errorMsg,
      };
    }
  }

  async deleteSnapshot(snapshotPath: string): Promise<{ ok: boolean; error?: string }> {
    try {
      this.logger.info(`Eliminando snapshot: ${snapshotPath}`);
      
      const result = await this.execCommand('btrfs', ['subvolume', 'delete', snapshotPath], true);

      if (result.code !== 0) {
        this.logger.error('Error eliminando snapshot', result.stderr);
        return { ok: false, error: result.stderr };
      }

      this.logger.info('Snapshot eliminado exitosamente', { snapshotPath });
      return { ok: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error eliminando snapshot', error);
      return { ok: false, error: errorMsg };
    }
  }
}
