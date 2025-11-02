import * as fs from 'fs';
import * as path from 'path';

export interface AppConfig {
  rootTarget: string;
  homeTarget: string;
  prefix: string;
  exclusions: string[];
  timer: {
    enabled: boolean;
    schedule: 'hourly' | 'daily' | 'weekly';
    retention: {
      type: 'count' | 'age';
      value: number;
    };
  };
}

export class ConfigManager {
  private configPath: string;
  private defaultConfig: AppConfig = {
    rootTarget: '/root/.snapshots',
    homeTarget: '/root/.snapshots',
    prefix: 'snap',
    exclusions: [
      'Downloads',
      'Cache',
      '.cache',
      '.npm/_cacache',
      '.mozilla/firefox/*/cache2',
      '.config/google-chrome/*/Cache',
    ],
    timer: {
      enabled: false,
      schedule: 'daily',
      retention: {
        type: 'count',
        value: 7,
      },
    },
  };

  constructor() {
    const configDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '', '.config');
    const appConfigDir = path.join(configDir, 'btrfs-visual-manager');
    this.configPath = path.join(appConfigDir, 'config.json');

    // Crear directorio si no existe
    if (!fs.existsSync(appConfigDir)) {
      fs.mkdirSync(appConfigDir, { recursive: true });
    }
  }

  getConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return { ...this.defaultConfig, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error leyendo configuración:', error);
    }
    return this.defaultConfig;
  }

  setConfig(config: Partial<AppConfig>): boolean {
    try {
      const currentConfig = this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Error guardando configuración:', error);
      return false;
    }
  }

  resetConfig(): AppConfig {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.defaultConfig, null, 2), 'utf-8');
      return this.defaultConfig;
    } catch (error) {
      console.error('Error reseteando configuración:', error);
      return this.defaultConfig;
    }
  }
}
