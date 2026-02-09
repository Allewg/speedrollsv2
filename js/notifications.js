// ========== SISTEMA DE NOTIFICACIONES NATIVO ==========
// Reemplaza alert() y confirm() con UI/UX nativa del sistema

// ========== TOAST NOTIFICATIONS ==========

// Cola de toasts activos
let activeToasts = [];
let toastContainer = null;

// Inicializar contenedor de toasts
function initToastContainer() {
  if (toastContainer) return toastContainer;

  toastContainer = document.createElement('div');
  toastContainer.id = 'toastContainer';
  toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full';
  toastContainer.style.cssText = 'max-height: 100vh; overflow: hidden;';
  document.body.appendChild(toastContainer);

  return toastContainer;
}

/**
 * Muestra una notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - Duración en ms (default 3500)
 */
function showToast(message, type = 'info', duration = 3500) {
  initToastContainer();

  const toast = document.createElement('div');
  const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  toast.id = id;
  toast.className = 'pointer-events-auto';

  // Configuración por tipo
  const config = {
    success: {
      icon: 'check_circle',
      bg: 'bg-white dark:bg-zinc-900',
      border: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-500',
      accent: 'bg-green-500',
      shadow: 'shadow-lg shadow-green-500/10'
    },
    error: {
      icon: 'error',
      bg: 'bg-white dark:bg-zinc-900',
      border: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-500',
      accent: 'bg-red-500',
      shadow: 'shadow-lg shadow-red-500/10'
    },
    warning: {
      icon: 'warning',
      bg: 'bg-white dark:bg-zinc-900',
      border: 'border-amber-200 dark:border-amber-800',
      iconColor: 'text-amber-500',
      accent: 'bg-amber-500',
      shadow: 'shadow-lg shadow-amber-500/10'
    },
    info: {
      icon: 'info',
      bg: 'bg-white dark:bg-zinc-900',
      border: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-500',
      accent: 'bg-blue-500',
      shadow: 'shadow-lg shadow-blue-500/10'
    }
  };

  const c = config[type] || config.info;

  toast.innerHTML = `
    <div class="relative ${c.bg} ${c.shadow} border ${c.border} rounded-xl overflow-hidden toast-enter">
      <div class="absolute top-0 left-0 w-1 h-full ${c.accent}"></div>
      <div class="flex items-start gap-3 px-4 py-3.5 pl-5">
        <span class="material-symbols-outlined ${c.iconColor} text-xl mt-0.5 shrink-0" style="font-variation-settings: 'FILL' 1;">${c.icon}</span>
        <p class="text-sm font-medium text-[#171212] dark:text-white leading-snug flex-1">${escapeHtmlNotif(message)}</p>
        <button onclick="dismissToast('${id}')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      <div class="toast-progress h-0.5 ${c.accent} opacity-30" style="animation: toastProgress ${duration}ms linear forwards;"></div>
    </div>
  `;

  toastContainer.appendChild(toast);
  activeToasts.push(id);

  // Auto-dismiss
  const timer = setTimeout(() => {
    dismissToast(id);
  }, duration);

  toast._timer = timer;

  return id;
}

// Cerrar un toast
function dismissToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;

  if (toast._timer) clearTimeout(toast._timer);

  const inner = toast.querySelector('.toast-enter');
  if (inner) {
    inner.classList.remove('toast-enter');
    inner.classList.add('toast-exit');
  }

  setTimeout(() => {
    toast.remove();
    activeToasts = activeToasts.filter(t => t !== id);
  }, 250);
}

// ========== CONFIRM DIALOGS ==========

/**
 * Muestra un diálogo de confirmación nativo
 * @param {string} message - Mensaje de confirmación
 * @param {Object} options - Opciones del diálogo
 * @param {string} options.title - Título (default: 'Confirmar')
 * @param {string} options.confirmText - Texto del botón confirmar (default: 'Confirmar')
 * @param {string} options.cancelText - Texto del botón cancelar (default: 'Cancelar')
 * @param {string} options.type - Tipo: 'danger' | 'warning' | 'info' (default: 'info')
 * @param {string} options.icon - Icono Material Symbols (default según type)
 * @returns {Promise<boolean>} - true si confirmó, false si canceló
 */
function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    const {
      title = 'Confirmar',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      type = 'info',
      icon = null
    } = options;

    const typeConfig = {
      danger: {
        icon: icon || 'warning',
        iconColor: 'text-red-500',
        iconBg: 'bg-red-50 dark:bg-red-900/20',
        confirmBtn: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
      },
      warning: {
        icon: icon || 'help_outline',
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-50 dark:bg-amber-900/20',
        confirmBtn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      },
      info: {
        icon: icon || 'help_outline',
        iconColor: 'text-primary',
        iconBg: 'bg-primary/5 dark:bg-primary/10',
        confirmBtn: 'bg-primary hover:bg-primary/90 shadow-primary/20',
      }
    };

    const c = typeConfig[type] || typeConfig.info;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm confirm-overlay-enter" onclick=""></div>
      <div class="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full confirm-dialog-enter overflow-hidden">
        <div class="p-6 pb-5 text-center">
          <div class="w-14 h-14 rounded-full ${c.iconBg} flex items-center justify-center mx-auto mb-4">
            <span class="material-symbols-outlined ${c.iconColor} text-3xl" style="font-variation-settings: 'FILL' 1;">${c.icon}</span>
          </div>
          <h3 class="text-lg font-bold text-[#171212] dark:text-white font-display mb-2">${escapeHtmlNotif(title)}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">${escapeHtmlNotif(message)}</p>
        </div>
        <div class="flex gap-3 p-4 pt-0">
          <button id="confirmDialogCancel" class="flex-1 h-11 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-[#171212] dark:text-white text-sm font-bold font-display transition-colors">
            ${escapeHtmlNotif(cancelText)}
          </button>
          <button id="confirmDialogOk" class="flex-1 h-11 rounded-xl ${c.confirmBtn} text-white text-sm font-bold font-display transition-colors shadow-lg">
            ${escapeHtmlNotif(confirmText)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Focus the confirm button
    setTimeout(() => {
      overlay.querySelector('#confirmDialogOk')?.focus();
    }, 100);

    const cleanup = (result) => {
      const dialog = overlay.querySelector('.confirm-dialog-enter');
      const bg = overlay.querySelector('.confirm-overlay-enter');
      if (dialog) {
        dialog.classList.remove('confirm-dialog-enter');
        dialog.classList.add('confirm-dialog-exit');
      }
      if (bg) {
        bg.classList.remove('confirm-overlay-enter');
        bg.classList.add('confirm-overlay-exit');
      }
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    };

    overlay.querySelector('#confirmDialogOk').addEventListener('click', () => cleanup(true));
    overlay.querySelector('#confirmDialogCancel').addEventListener('click', () => cleanup(false));

    // Cerrar con Escape
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleKeydown);
        cleanup(false);
      } else if (e.key === 'Enter') {
        document.removeEventListener('keydown', handleKeydown);
        cleanup(true);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  });
}

// ========== HELPERS ==========

// Escape HTML para notificaciones
function escapeHtmlNotif(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Atajos convenientes
function notifySuccess(message, duration) {
  return showToast(message, 'success', duration);
}

function notifyError(message, duration) {
  return showToast(message, 'error', duration || 5000);
}

function notifyWarning(message, duration) {
  return showToast(message, 'warning', duration || 4000);
}

function notifyInfo(message, duration) {
  return showToast(message, 'info', duration);
}

// ========== EXPORTAR ==========
window.showToast = showToast;
window.dismissToast = dismissToast;
window.showConfirm = showConfirm;
window.notifySuccess = notifySuccess;
window.notifyError = notifyError;
window.notifyWarning = notifyWarning;
window.notifyInfo = notifyInfo;
