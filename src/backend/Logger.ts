import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private logPath: string;
  private maxLogSize = 5 * 1024 * 1024; // 5MB

  constructor() {
    const logDir = process.env.XDG_DATA_HOME 
      ? path.join(process.env.XDG_DATA_HOME, 'btrfs-visual-manager', 'logs')
      : path.join(process.env.HOME || '', '.local', 'share', 'btrfs-visual-manager', 'logs');
    
    this.logPath = path.join(logDir, 'app.log');

    // Crear directorio si no existe
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private rotateLogIfNeeded() {
    try {
      if (fs.existsSync(this.logPath)) {
        const stats = fs.statSync(this.logPath);
        if (stats.size > this.maxLogSize) {
          const backupPath = this.logPath + '.old';
          if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
          }
          fs.renameSync(this.logPath, backupPath);
        }
      }
    } catch (error) {
      console.error('Error rotando logs:', error);
    }
  }

  log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: unknown) {
    this.rotateLogIfNeeded();
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
    
    try {
      fs.appendFileSync(this.logPath, logEntry, 'utf-8');
    } catch (error) {
      console.error('Error escribiendo log:', error);
    }
    
    console.log(logEntry);
  }

  info(message: string, data?: unknown) {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('WARN', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('ERROR', message, data);
  }

  getLogs(): string {
    try {
      if (fs.existsSync(this.logPath)) {
        return fs.readFileSync(this.logPath, 'utf-8');
      }
    } catch (error) {
      console.error('Error leyendo logs:', error);
    }
    return '';
  }

  clearLogs() {
    try {
      if (fs.existsSync(this.logPath)) {
        fs.unlinkSync(this.logPath);
      }
    } catch (error) {
      console.error('Error limpiando logs:', error);
    }
  }
}
