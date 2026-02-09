// ========== TRACKING DE PEDIDOS EN TIEMPO REAL ==========

let currentOrderListener = null;
let currentOrderId = null;

// Inicializar página de tracking
function initTrackingPage() {
  // Verificar si hay un ID en la URL
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  let orderId = urlParams.get('id') || window.currentOrderId;
  
  // Si no hay ID en URL, buscar en sessionStorage
  if (!orderId) {
    orderId = sessionStorage.getItem('lastOrderId');
  }
  
  if (orderId) {
    // Actualizar input
    const input = document.getElementById('trackOrderInput');
    if (input) {
      input.value = orderId;
    }
    loadOrderTracking(orderId);
  } else {
    // Si hay un ID en el input, cargarlo
    const input = document.getElementById('trackOrderInput');
    if (input && input.value) {
      loadOrderTracking(input.value.trim());
    }
  }
  
  // Configurar evento de búsqueda
  const input = document.getElementById('trackOrderInput');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchOrder();
      }
    });
  }
}

// Buscar pedido
function searchOrder() {
  const input = document.getElementById('trackOrderInput');
  if (!input) return;
  
  const orderId = input.value.trim().toUpperCase();
  if (!orderId) {
    notifyWarning('Por favor ingresa un número de pedido');
    return;
  }
  
  loadOrderTracking(orderId);
}

// Cargar tracking de pedido
function loadOrderTracking(orderId) {
  // Limpiar listener anterior
  if (currentOrderListener && window.firebaseOff) {
    window.firebaseOff(window.firebaseRef(window.firebaseDB, `orders/${currentOrderId}`), currentOrderListener);
  }
  
  currentOrderId = orderId;
  
  // Actualizar input
  const input = document.getElementById('trackOrderInput');
  if (input) {
    input.value = orderId;
  }
  
  // Limpiar contenido previo
  const trackingContent = document.getElementById('trackingContent');
  if (trackingContent) {
    trackingContent.innerHTML = '';
  }
  
  // Escuchar cambios en tiempo real
  if (window.firebaseDB && window.firebaseReady) {
    currentOrderListener = listenToOrder(orderId, (order) => {
      renderTracking(order);
    });
  } else {
    // Si Firebase no está listo, intentar cargar directamente
    setTimeout(() => {
      if (window.firebaseDB && window.firebaseReady) {
        currentOrderListener = listenToOrder(orderId, (order) => {
          renderTracking(order);
        });
      } else {
        // Fallback: cargar una vez
        getOrderById(orderId).then(order => {
          if (order) {
            renderTracking(order);
          } else {
            showOrderNotFound();
          }
        }).catch(() => {
          showOrderNotFound();
        });
      }
    }, 1000);
  }
}

// Renderizar tracking del pedido
function renderTracking(order) {
  const trackingContent = document.getElementById('trackingContent');
  if (!trackingContent) return;
  
  if (!order) {
    showOrderNotFound();
    return;
  }
  
  const statusInfo = getStatusVisualInfo(order.status);
  const estimatedTime = formatEstimatedTime(order.estimatedTime || order.createdAt + (40 * 60 * 1000));
  
  // Calcular porcentaje de progress bar
  const progressPercent = statusInfo.progress;
  
  // Mapear estados a labels del diseño
  const statusLabels = {
    'pendiente': 'Recibido',
    'confirmado': 'Preparando',
    'en_cocina': 'Preparando',
    'en_camino': 'En Camino',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado'
  };
  
  const currentStatusLabel = statusLabels[order.status] || 'Recibido';
  const statusBadge = order.status === 'cancelado' 
    ? '<div class="bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter">Cancelado</div>'
    : order.validado 
      ? '<div class="bg-primary/10 dark:bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter">En Progreso</div>'
      : '<div class="bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter">Pendiente</div>';
  
  // Generar HTML de items
  let itemsHTML = '';
  if (order.items && order.items.length > 0) {
    order.items.forEach(item => {
      itemsHTML += `
        <div class="flex items-center gap-4">
          <div class="size-14 rounded-lg bg-gray-100 dark:bg-zinc-800 p-1 flex items-center justify-center">
            <span class="material-symbols-outlined text-gray-400">restaurant</span>
          </div>
          <div class="flex-1">
            <p class="text-[#171212] dark:text-white font-bold">${escapeHtml(item.name || 'Producto')}</p>
            <p class="text-gray-500 dark:text-gray-400 text-xs">Cantidad: ${item.quantity || 1}</p>
          </div>
          <p class="text-[#171212] dark:text-white font-black">$${Math.round((item.subtotal || item.price || 0)).toLocaleString()}</p>
        </div>
      `;
    });
  }
  
  // Generar steps del progress bar
  const steps = [
    { step: 1, icon: 'receipt_long', label: 'Recibido', active: statusInfo.step >= 1 },
    { step: 2, icon: 'cooking', label: 'Preparando', active: statusInfo.step >= 2 },
    { step: 3, icon: 'moped', label: 'En Camino', active: statusInfo.step >= 3 },
    { step: 4, icon: 'check_circle', label: 'Entregado', active: statusInfo.step >= 4 }
  ];
  
  let stepsHTML = '';
  steps.forEach((step, index) => {
    const isActive = step.active;
    const isCurrent = statusInfo.step === step.step;
    
    stepsHTML += `
      <div class="relative z-10 flex flex-col items-center gap-2 flex-1 ${!isActive ? 'opacity-40' : ''}">
        <div class="size-10 rounded-full ${isActive ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'} flex items-center justify-center ${isCurrent ? 'ring-4 ring-primary/20' : ''}">
          <span class="material-symbols-outlined text-xl">${step.icon}</span>
        </div>
        <span class="text-[10px] font-bold text-center ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'} uppercase">${step.label}</span>
      </div>
    `;
  });
  
  trackingContent.innerHTML = `
    <!-- Progress Bar Section -->
    <div class="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-zinc-800 mb-4">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h3 class="text-[#171212] dark:text-white text-2xl font-black leading-tight">${currentStatusLabel}</h3>
          <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">Speed Roll Kitchen</p>
        </div>
        ${statusBadge}
      </div>
      <!-- Custom Visual Stepper -->
      <div class="relative flex justify-between mb-2">
        <!-- Progress Line Background -->
        <div class="absolute top-5 left-0 w-full h-1 bg-gray-100 dark:bg-zinc-700 z-0"></div>
        <!-- Active Progress Line -->
        <div class="absolute top-5 left-0 h-1 bg-primary z-0 transition-all duration-500" style="width: ${progressPercent}%"></div>
        ${stepsHTML}
      </div>
    </div>
    
    <!-- Order Summary Section -->
    <div class="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-zinc-800">
      <div class="p-4 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center cursor-pointer" onclick="toggleOrderDetails()">
        <h4 class="text-[#171212] dark:text-white font-bold">Detalles del Pedido</h4>
        <span id="orderDetailsIcon" class="material-symbols-outlined text-gray-400 transition-transform">expand_more</span>
      </div>
      <div id="orderDetailsContent" class="p-4 space-y-4">
        ${itemsHTML || '<p class="text-gray-500 dark:text-gray-400 text-sm">No hay items en este pedido</p>'}
        <div class="bg-gray-50 dark:bg-zinc-900/50 p-4 flex justify-between items-center">
          <span class="text-gray-500 dark:text-gray-400 text-sm font-bold">Total</span>
          <span class="text-primary text-lg font-black">$${Math.round(order.total || 0).toLocaleString()}</span>
        </div>
        ${order.cliente.direccion ? `
          <div class="pt-2 border-t border-gray-100 dark:border-zinc-700">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Dirección de entrega:</p>
            <p class="text-sm text-[#171212] dark:text-white font-medium">${escapeHtml(order.cliente.direccion)}</p>
          </div>
        ` : ''}
        ${order.observations ? `
          <div class="pt-2 border-t border-gray-100 dark:border-zinc-700">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Observaciones:</p>
            <p class="text-sm text-[#171212] dark:text-white">${escapeHtml(order.observations)}</p>
          </div>
        ` : ''}
      </div>
    </div>
    
    <!-- Footer Actions -->
    <div class="px-4 mt-8 space-y-3">
      <button onclick="shareTrackingLink()" class="w-full bg-white dark:bg-zinc-900 text-[#171212] dark:text-white font-bold h-14 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm flex items-center justify-center gap-2">
        <span class="material-symbols-outlined">share</span>
        Compartir Enlace de Seguimiento
      </button>
    </div>
  `;
}

// Mostrar mensaje de pedido no encontrado
function showOrderNotFound() {
  const trackingContent = document.getElementById('trackingContent');
  if (!trackingContent) return;
  
  trackingContent.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-zinc-800 text-center py-12">
      <span class="material-symbols-outlined text-gray-400 text-6xl mb-4">search_off</span>
      <p class="text-[#171212] dark:text-white font-bold mb-2">Pedido no encontrado</p>
      <p class="text-gray-500 dark:text-gray-400 text-sm">Verifica el número de pedido e intenta nuevamente</p>
    </div>
  `;
}

// Toggle detalles del pedido
function toggleOrderDetails() {
  const content = document.getElementById('orderDetailsContent');
  const icon = document.getElementById('orderDetailsIcon');
  
  if (content && icon) {
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
  }
}

// Compartir enlace de tracking
function shareTrackingLink() {
  if (!currentOrderId) return;
  
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
  const trackingUrl = `${baseUrl}#track?id=${currentOrderId}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Seguimiento de Pedido Speed Roll',
      text: `Sigue tu pedido ${currentOrderId} aquí:`,
      url: trackingUrl
    }).catch(() => {
      copyToClipboard(trackingUrl);
    });
  } else {
    copyToClipboard(trackingUrl);
  }
}

// Copiar al portapapeles
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      notifySuccess('Enlace copiado al portapapeles');
    });
  } else {
    // Fallback para navegadores antiguos
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    notifySuccess('Enlace copiado al portapapeles');
  }
}

// Escapar HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Ir a tracking desde confirmación
function goToTracking() {
  const orderId = window.currentOrderId || sessionStorage.getItem('lastOrderId');
  if (orderId) {
    router.navigate('track');
    window.currentOrderId = orderId;
    setTimeout(() => {
      initTrackingPage();
    }, 200);
  } else {
    router.navigate('track');
  }
}

// Exportar funciones
window.initTrackingPage = initTrackingPage;
window.searchOrder = searchOrder;
window.loadOrderTracking = loadOrderTracking;
window.toggleOrderDetails = toggleOrderDetails;
window.shareTrackingLink = shareTrackingLink;
window.goToTracking = goToTracking;

// Inicializar cuando se navega a la página de tracking
if (typeof router !== 'undefined') {
  const originalNavigate = router.navigate;
  router.navigate = function(pageName) {
    originalNavigate.call(this, pageName);
    if (pageName === 'track') {
      setTimeout(() => {
        initTrackingPage();
      }, 100);
    }
  };
}

// También inicializar si ya estamos en la página de tracking
if (document.getElementById('page-track') && document.getElementById('page-track').classList.contains('active')) {
  setTimeout(() => {
    initTrackingPage();
  }, 500);
}
