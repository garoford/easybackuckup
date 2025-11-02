import './index.css';
import type { AppConfig, SystemCheckResult } from './types';

// Estado global de la aplicación
let currentConfig: AppConfig | null = null;
let currentSystemCheck: SystemCheckResult | null = null;
let currentView: 'dashboard' | 'snapshots' | 'restore' | 'config' | 'logs' = 'dashboard';

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await checkSystem();
  setupNavigation();
  showView('dashboard');
});

// Navegación
function setupNavigation() {
  document.getElementById('nav-dashboard')?.addEventListener('click', () => showView('dashboard'));
  document.getElementById('nav-snapshots')?.addEventListener('click', () => showView('snapshots'));
  document.getElementById('nav-restore')?.addEventListener('click', () => showView('restore'));
  document.getElementById('nav-config')?.addEventListener('click', () => showView('config'));
  document.getElementById('nav-logs')?.addEventListener('click', () => showView('logs'));
}

function showView(view: typeof currentView) {
  currentView = view;
  
  // Ocultar todas las vistas
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  
  // Mostrar vista actual
  document.getElementById(`view-${view}`)?.classList.add('active');
  document.getElementById(`nav-${view}`)?.classList.add('active');
  
  // Cargar contenido según la vista
  switch (view) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'snapshots':
      loadSnapshotsList();
      break;
    case 'restore':
      loadRestoreView();
      break;
    case 'config':
      loadConfigView();
      break;
    case 'logs':
      loadLogs();
      break;
  }
}

// Configuración
async function loadConfig() {
  try {
    currentConfig = await window.electronAPI.configGet();
  } catch (error) {
    showError('Error cargando configuración: ' + error);
  }
}

async function checkSystem() {
  try {
    currentSystemCheck = await window.electronAPI.systemCheck();
  } catch (error) {
    showError('Error verificando sistema: ' + error);
  }
}

// DASHBOARD
async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  await checkSystem();

  const html = `
    <div class="dashboard-grid">
      <div class="card">
        <h2>Estado del Sistema</h2>
        <div class="status-grid">
          <div class="status-item ${currentSystemCheck?.btrfsOk ? 'success' : 'error'}">
            <span class="icon">${currentSystemCheck?.btrfsOk ? '✓' : '✗'}</span>
            <span>Btrfs</span>
          </div>
          <div class="status-item ${currentSystemCheck?.subvols.root ? 'success' : 'error'}">
            <span class="icon">${currentSystemCheck?.subvols.root ? '✓' : '✗'}</span>
            <span>Root</span>
          </div>
          <div class="status-item ${currentSystemCheck?.subvols.home ? 'success' : 'error'}">
            <span class="icon">${currentSystemCheck?.subvols.home ? '✓' : '✗'}</span>
            <span>Home</span>
          </div>
        </div>
        <div class="space-info">
          <p><strong>Espacio:</strong> ${currentSystemCheck?.space.used} / ${currentSystemCheck?.space.total} usado</p>
          <p><strong>Libre:</strong> ${currentSystemCheck?.space.free}</p>
        </div>
      </div>

      <div class="card">
        <h2>Timer Automático</h2>
        <div class="timer-status">
          <p><strong>Estado:</strong> ${currentSystemCheck?.timers?.enabled ? '✓ Habilitado' : '✗ Deshabilitado'}</p>
          <p><strong>Activo:</strong> ${currentSystemCheck?.timers?.active ? 'Sí' : 'No'}</p>
          ${currentSystemCheck?.timers?.nextRun ? `<p><strong>Próxima ejecución:</strong> ${currentSystemCheck.timers.nextRun}</p>` : ''}
          ${currentSystemCheck?.timers?.lastRun ? `<p><strong>Última ejecución:</strong> ${currentSystemCheck.timers.lastRun}</p>` : ''}
        </div>
      </div>

      <div class="card actions-card">
        <h2>Acciones Rápidas</h2>
        <button class="btn btn-primary btn-large" id="btn-create-snapshot">
          📸 Crear Snapshot
        </button>
        <button class="btn btn-warning btn-large" id="btn-restore-snapshot">
          ⚠️ Restaurar Snapshot
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;

  document.getElementById('btn-create-snapshot')?.addEventListener('click', createSnapshot);
  document.getElementById('btn-restore-snapshot')?.addEventListener('click', () => showView('restore'));
}

async function createSnapshot() {
  if (!currentConfig) {
    showError('Configuración no cargada');
    return;
  }

  const btn = document.getElementById('btn-create-snapshot') as HTMLButtonElement;
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = '⏳ Creando snapshots...';

  try {
    const result = await window.electronAPI.snapshotsCreate(
      currentConfig.rootTarget,
      currentConfig.homeTarget,
      currentConfig.prefix
    );

    if (result.ok) {
      showSuccess(`Snapshots creados exitosamente:\n- Root: ${result.rootName}\n- Home: ${result.homeName}`);
      await checkSystem();
      loadDashboard();
    } else {
      showError('Error creando snapshots: ' + (result.error || 'Error desconocido'));
    }
  } catch (error) {
    showError('Error: ' + error);
  } finally {
    btn.disabled = false;
    btn.textContent = '📸 Crear Snapshot';
  }
}

// SNAPSHOTS LIST
async function loadSnapshotsList() {
  const container = document.getElementById('snapshots-content');
  if (!container || !currentConfig) return;

  container.innerHTML = '<div class="loading">Cargando snapshots...</div>';

  try {
    const snapshots = await window.electronAPI.snapshotsList(currentConfig.rootTarget);
    
    if (snapshots.length === 0) {
      container.innerHTML = '<div class="empty-state">No hay snapshots disponibles</div>';
      return;
    }

    const html = `
      <div class="snapshots-list">
        <h2>Snapshots Disponibles (${snapshots.length})</h2>
        <div class="snapshots-grid">
          ${snapshots.map(snap => `
            <div class="snapshot-card ${snap.type}">
              <div class="snapshot-header">
                <h3>${snap.name}</h3>
                <span class="badge badge-${snap.type}">${snap.type.toUpperCase()}</span>
              </div>
              <div class="snapshot-info">
                <p><strong>Ruta:</strong> <code>${snap.path}</code></p>
                <p><strong>Fecha:</strong> ${new Date(snap.timestamp).toLocaleString('es-ES')}</p>
                <p><strong>Solo lectura:</strong> ${snap.readonly ? 'Sí' : 'No'}</p>
              </div>
              <div class="snapshot-actions">
                <button class="btn btn-sm btn-secondary" onclick="copyToClipboard('${snap.path}')">
                  📋 Copiar ruta
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSnapshot('${snap.path}')">
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="error">Error cargando snapshots: ${error}</div>`;
  }
}

(window as unknown as Record<string, unknown>).copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  showSuccess('Ruta copiada al portapapeles');
};

(window as unknown as Record<string, unknown>).deleteSnapshot = async (path: string) => {
  if (!confirm(`¿Estás seguro de eliminar el snapshot?\n\n${path}\n\nEsta acción no se puede deshacer.`)) {
    return;
  }

  try {
    const result = await window.electronAPI.snapshotsDelete(path);
    if (result.ok) {
      showSuccess('Snapshot eliminado exitosamente');
      loadSnapshotsList();
    } else {
      showError('Error eliminando snapshot: ' + result.error);
    }
  } catch (error) {
    showError('Error: ' + error);
  }
};

// RESTORE VIEW
async function loadRestoreView() {
  const container = document.getElementById('restore-content');
  if (!container || !currentConfig) return;

  container.innerHTML = '<div class="loading">Cargando snapshots...</div>';

  try {
    const snapshots = await window.electronAPI.snapshotsList(currentConfig.rootTarget);
    const rootSnapshots = snapshots.filter(s => s.type === 'root');

    if (rootSnapshots.length === 0) {
      container.innerHTML = '<div class="empty-state">No hay snapshots de root disponibles para restaurar</div>';
      return;
    }

    const html = `
      <div class="restore-container">
        <div class="card">
          <h2>⚠️ Restaurar Snapshot de Root</h2>
          <div class="warning-box">
            <p><strong>ADVERTENCIA:</strong> Esta operación cambiará el subvolumen root por defecto y requerirá reiniciar el sistema.</p>
            <p>Asegúrate de guardar todo tu trabajo antes de continuar.</p>
          </div>
          
          <div class="form-group">
            <label for="restore-select">Selecciona el snapshot a restaurar:</label>
            <select id="restore-select" class="form-control">
              <option value="">-- Selecciona un snapshot --</option>
              ${rootSnapshots.map(snap => `
                <option value="${snap.path}">
                  ${snap.name} - ${new Date(snap.timestamp).toLocaleString('es-ES')}
                </option>
              `).join('')}
            </select>
          </div>

          <button class="btn btn-warning btn-large" id="btn-restore" disabled>
            ⚠️ Restaurar y Reiniciar
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    const select = document.getElementById('restore-select') as HTMLSelectElement;
    const btn = document.getElementById('btn-restore') as HTMLButtonElement;

    select?.addEventListener('change', () => {
      if (btn) btn.disabled = !select.value;
    });

    btn?.addEventListener('click', () => restoreSnapshot(select?.value));
  } catch (error) {
    container.innerHTML = `<div class="error">Error cargando snapshots: ${error}</div>`;
  }
}

async function restoreSnapshot(path: string) {
  if (!path) return;

  const confirmed = confirm(
    `¿Estás ABSOLUTAMENTE SEGURO de restaurar este snapshot?\n\n${path}\n\n` +
    `Esto cambiará el subvolumen root por defecto y requerirá reiniciar.\n\n` +
    `Asegúrate de haber guardado todo tu trabajo.`
  );

  if (!confirmed) return;

  const btn = document.getElementById('btn-restore') as HTMLButtonElement;
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Restaurando...';
  }

  try {
    const result = await window.electronAPI.snapshotsRestore(path);

    if (result.ok) {
      alert(`✓ Snapshot restaurado exitosamente\n\n${result.note}`);
      showSuccess('Snapshot restaurado. Reinicia el sistema para aplicar los cambios.');
    } else {
      showError('Error restaurando snapshot: ' + result.error);
    }
  } catch (error) {
    showError('Error: ' + error);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚠️ Restaurar y Reiniciar';
    }
  }
}

// CONFIG VIEW
async function loadConfigView() {
  const container = document.getElementById('config-content');
  if (!container || !currentConfig) return;

  const html = `
    <div class="config-container">
      <div class="card">
        <h2>Configuración de Snapshots</h2>
        
        <div class="form-group">
          <label for="config-root-target">Destino de snapshots de Root:</label>
          <input type="text" id="config-root-target" class="form-control" value="${currentConfig.rootTarget}" />
        </div>

        <div class="form-group">
          <label for="config-home-target">Destino de snapshots de Home:</label>
          <input type="text" id="config-home-target" class="form-control" value="${currentConfig.homeTarget}" />
        </div>

        <div class="form-group">
          <label for="config-prefix">Prefijo de nombres:</label>
          <input type="text" id="config-prefix" class="form-control" value="${currentConfig.prefix}" />
        </div>

        <div class="form-group">
          <label for="config-exclusions">Exclusiones (una por línea):</label>
          <textarea id="config-exclusions" class="form-control" rows="6">${currentConfig.exclusions.join('\n')}</textarea>
          <small>Carpetas a excluir de snapshots (idealmente como subvolúmenes separados)</small>
        </div>
      </div>

      <div class="card">
        <h2>Timer Automático</h2>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="config-timer-enabled" ${currentConfig.timer.enabled ? 'checked' : ''} />
            Habilitar snapshots automáticos
          </label>
        </div>

        <div class="form-group">
          <label for="config-timer-schedule">Frecuencia:</label>
          <select id="config-timer-schedule" class="form-control">
            <option value="hourly" ${currentConfig.timer.schedule === 'hourly' ? 'selected' : ''}>Cada hora</option>
            <option value="daily" ${currentConfig.timer.schedule === 'daily' ? 'selected' : ''}>Diariamente</option>
            <option value="weekly" ${currentConfig.timer.schedule === 'weekly' ? 'selected' : ''}>Semanalmente</option>
          </select>
        </div>

        <div class="form-group">
          <label for="config-retention-type">Tipo de retención:</label>
          <select id="config-retention-type" class="form-control">
            <option value="count" ${currentConfig.timer.retention.type === 'count' ? 'selected' : ''}>Por cantidad</option>
            <option value="age" ${currentConfig.timer.retention.type === 'age' ? 'selected' : ''}>Por edad (días)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="config-retention-value">Valor de retención:</label>
          <input type="number" id="config-retention-value" class="form-control" value="${currentConfig.timer.retention.value}" min="1" />
          <small id="retention-help">Mantener los últimos ${currentConfig.timer.retention.value} snapshots</small>
        </div>
      </div>

      <div class="config-actions">
        <button class="btn btn-primary" id="btn-save-config">💾 Guardar Configuración</button>
        <button class="btn btn-secondary" id="btn-reset-config">🔄 Restablecer por Defecto</button>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Event listeners
  document.getElementById('config-retention-type')?.addEventListener('change', (e) => {
    const type = (e.target as HTMLSelectElement).value;
    const help = document.getElementById('retention-help');
    const value = (document.getElementById('config-retention-value') as HTMLInputElement)?.value || '7';
    if (help) {
      help.textContent = type === 'count' 
        ? `Mantener los últimos ${value} snapshots`
        : `Eliminar snapshots mayores a ${value} días`;
    }
  });

  document.getElementById('config-retention-value')?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    const type = (document.getElementById('config-retention-type') as HTMLSelectElement)?.value;
    const help = document.getElementById('retention-help');
    if (help) {
      help.textContent = type === 'count'
        ? `Mantener los últimos ${value} snapshots`
        : `Eliminar snapshots mayores a ${value} días`;
    }
  });

  document.getElementById('btn-save-config')?.addEventListener('click', saveConfig);
  document.getElementById('btn-reset-config')?.addEventListener('click', resetConfig);
}

async function saveConfig() {
  const newConfig: Partial<AppConfig> = {
    rootTarget: (document.getElementById('config-root-target') as HTMLInputElement)?.value,
    homeTarget: (document.getElementById('config-home-target') as HTMLInputElement)?.value,
    prefix: (document.getElementById('config-prefix') as HTMLInputElement)?.value,
    exclusions: (document.getElementById('config-exclusions') as HTMLTextAreaElement)?.value.split('\n').filter(x => x.trim()),
    timer: {
      enabled: (document.getElementById('config-timer-enabled') as HTMLInputElement)?.checked,
      schedule: (document.getElementById('config-timer-schedule') as HTMLSelectElement)?.value as 'hourly' | 'daily' | 'weekly',
      retention: {
        type: (document.getElementById('config-retention-type') as HTMLSelectElement)?.value as 'count' | 'age',
        value: parseInt((document.getElementById('config-retention-value') as HTMLInputElement)?.value),
      },
    },
  };

  try {
    const success = await window.electronAPI.configSet(newConfig);
    
    if (success) {
      await loadConfig();
      
      // Aplicar timer si cambió
      if (newConfig.timer?.enabled && currentConfig) {
        const result = await window.electronAPI.timersEnable(
          newConfig.timer.schedule,
          newConfig.timer.retention,
          currentConfig.rootTarget,
          currentConfig.homeTarget,
          currentConfig.prefix
        );
        if (!result.ok) {
          showError('Error habilitando timer: ' + result.error);
        }
      } else if (!newConfig.timer?.enabled) {
        await window.electronAPI.timersDisable();
      }
      
      showSuccess('Configuración guardada exitosamente');
      await checkSystem();
    } else {
      showError('Error guardando configuración');
    }
  } catch (error) {
    showError('Error: ' + error);
  }
}

async function resetConfig() {
  if (!confirm('¿Estás seguro de restablecer la configuración por defecto?')) {
    return;
  }

  try {
    currentConfig = await window.electronAPI.configReset();
    showSuccess('Configuración restablecida');
    loadConfigView();
  } catch (error) {
    showError('Error: ' + error);
  }
}

// LOGS VIEW
async function loadLogs() {
  const container = document.getElementById('logs-content');
  if (!container) return;

  try {
    const logs = await window.electronAPI.logsGet();
    
    const html = `
      <div class="logs-container">
        <div class="logs-header">
          <h2>Logs de la Aplicación</h2>
          <div class="logs-actions">
            <button class="btn btn-sm btn-secondary" id="btn-copy-logs">📋 Copiar</button>
            <button class="btn btn-sm btn-secondary" id="btn-refresh-logs">🔄 Actualizar</button>
            <button class="btn btn-sm btn-danger" id="btn-clear-logs">🗑️ Limpiar</button>
          </div>
        </div>
        <pre class="logs-content" id="logs-text">${logs || 'No hay logs disponibles'}</pre>
      </div>
    `;

    container.innerHTML = html;

    // Auto-scroll al final
    const logsText = document.getElementById('logs-text');
    if (logsText) {
      logsText.scrollTop = logsText.scrollHeight;
    }

    document.getElementById('btn-copy-logs')?.addEventListener('click', () => {
      navigator.clipboard.writeText(logs);
      showSuccess('Logs copiados al portapapeles');
    });

    document.getElementById('btn-refresh-logs')?.addEventListener('click', loadLogs);
    
    document.getElementById('btn-clear-logs')?.addEventListener('click', async () => {
      if (confirm('¿Estás seguro de limpiar todos los logs?')) {
        await window.electronAPI.logsClear();
        loadLogs();
      }
    });
  } catch (error) {
    container.innerHTML = `<div class="error">Error cargando logs: ${error}</div>`;
  }
}

// Utilidades
function showSuccess(message: string) {
  showNotification(message, 'success');
}

function showError(message: string) {
  showNotification(message, 'error');
}

function showNotification(message: string, type: 'success' | 'error') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}
