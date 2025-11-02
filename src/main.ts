import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { ConfigManager } from './backend/ConfigManager';
import { Logger } from './backend/Logger';
import { BtrfsManager } from './backend/BtrfsManager';
import { TimersManager } from './backend/TimersManager';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Inicializar managers
const logger = new Logger();
const configManager = new ConfigManager();
const btrfsManager = new BtrfsManager(logger);
const timersManager = new TimersManager(logger);

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// IPC Handlers
ipcMain.handle('system:check', async () => {
  logger.info('Verificando sistema...');
  const result = await btrfsManager.checkSystem();
  const timerStatus = await timersManager.getStatus();
  return {
    ...result,
    timers: timerStatus,
  };
});

ipcMain.handle('snapshots:list', async (_, { target }) => {
  logger.info('Listando snapshots', { target });
  return await btrfsManager.listSnapshots(target);
});

ipcMain.handle('snapshots:create', async (_, { rootTarget, homeTarget, prefix }) => {
  logger.info('Creando snapshots', { rootTarget, homeTarget, prefix });
  return await btrfsManager.createSnapshot(rootTarget, homeTarget, prefix);
});

ipcMain.handle('snapshots:restore', async (_, { rootSnapshotPath }) => {
  logger.info('Restaurando snapshot', { rootSnapshotPath });
  return await btrfsManager.restoreSnapshot(rootSnapshotPath);
});

ipcMain.handle('snapshots:delete', async (_, { snapshotPath }) => {
  logger.info('Eliminando snapshot', { snapshotPath });
  return await btrfsManager.deleteSnapshot(snapshotPath);
});

ipcMain.handle('config:get', async () => {
  return configManager.getConfig();
});

ipcMain.handle('config:set', async (_, config) => {
  logger.info('Guardando configuración', config);
  return configManager.setConfig(config);
});

ipcMain.handle('config:reset', async () => {
  logger.info('Reseteando configuración');
  return configManager.resetConfig();
});

ipcMain.handle('timers:enable', async (_, { schedule, retention, rootTarget, homeTarget, prefix }) => {
  logger.info('Habilitando timer', { schedule, retention });
  return await timersManager.enable({ schedule, retention }, rootTarget, homeTarget, prefix);
});

ipcMain.handle('timers:disable', async () => {
  logger.info('Deshabilitando timer');
  return await timersManager.disable();
});

ipcMain.handle('timers:status', async () => {
  return await timersManager.getStatus();
});

ipcMain.handle('logs:get', async () => {
  return logger.getLogs();
});

ipcMain.handle('logs:clear', async () => {
  logger.clearLogs();
  return true;
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
