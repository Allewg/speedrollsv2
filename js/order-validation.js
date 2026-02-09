// ========== VALIDACIÓN DE PEDIDOS ==========

// Inicializar página de validación
function initValidationPage() {
  // Obtener ID del pedido de la URL
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const orderId = urlParams.get('id');
  
  if (!orderId) {
    showValidationError('No se proporcionó un ID de pedido');
    return;
  }
  
  loadOrderForValidation(orderId);
}

// Cargar pedido para validación
async function loadOrderForValidation(orderId) {
  const content = document.getElementById('validateOrderContent');
  if (!content) return;
  
  try {
    const order = await getOrderById(orderId);
    
    if (!order) {
      showValidationError('Pedido no encontrado');
      return;
    }
    
    if (order.validado) {
      showAlreadyValidated(order);
      return;
    }
    
    renderValidationForm(order);
    
  } catch (error) {
    console.error('Error al cargar pedido:', error);
    showValidationError('Error al cargar el pedido');
  }
}

// Mostrar error
function showValidationError(message) {
  const content = document.getElementById('validateOrderContent');
  if (!content) return;
  
  content.innerHTML = `
    <div class="text-center">
      <span class="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
      <h2 class="text-[#171212] dark:text-white text-2xl font-bold mb-2">Error</h2>
      <p class="text-gray-500 dark:text-gray-400">${message}</p>
    </div>
  `;
}

// Mostrar que ya está validado
function showAlreadyValidated(order) {
  const content = document.getElementById('validateOrderContent');
  if (!content) return;
  
  content.innerHTML = `
    <div class="text-center mb-8">
      <span class="material-symbols-outlined text-green-500 text-6xl mb-4">check_circle</span>
      <h2 class="text-[#171212] dark:text-white text-2xl font-bold mb-2">Pedido Ya Validado</h2>
      <p class="text-gray-500 dark:text-gray-400 mb-6">Este pedido ya fue validado anteriormente.</p>
      <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-zinc-800 text-left">
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Número de Pedido</p>
            <p class="font-bold text-[#171212] dark:text-white">${order.id}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Cliente</p>
            <p class="font-semibold text-[#171212] dark:text-white">${order.cliente.nombre || 'Sin nombre'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p class="font-black text-primary text-xl">$${Math.round(order.total || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Renderizar formulario de validación
function renderValidationForm(order) {
  const content = document.getElementById('validateOrderContent');
  if (!content) return;
  
  const date = new Date(order.createdAt);
  const itemsCount = order.items ? order.items.length : 0;
  
  content.innerHTML = `
    <div class="text-center mb-8">
      <h2 class="text-[#171212] dark:text-white text-2xl lg:text-3xl font-extrabold leading-tight mb-4">Validar Pedido</h2>
      <p class="text-[#836967] dark:text-zinc-400 text-base lg:text-lg leading-relaxed mb-6">
        Revisa los detalles del pedido y confirma su validación
      </p>
      
      <!-- Order Info Card -->
      <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-zinc-800 mb-8 text-left">
        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Número de Pedido</p>
            <p class="text-xl font-black text-primary">${order.id}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Cliente</p>
            <p class="font-bold text-[#171212] dark:text-white text-lg">${order.cliente.nombre || 'Sin nombre'}</p>
            ${order.cliente.telefono ? `<p class="text-sm text-gray-600 dark:text-gray-400">${order.cliente.telefono}</p>` : ''}
          </div>
          
          ${order.cliente.direccion ? `
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Dirección</p>
              <p class="text-[#171212] dark:text-white">${order.cliente.direccion}</p>
            </div>
          ` : ''}
          
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Items del Pedido</p>
            <div class="space-y-2">
              ${order.items && order.items.length > 0 ? order.items.map(item => `
                <div class="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-zinc-800">
                  <span class="text-[#171212] dark:text-white">${item.name} x${item.quantity}</span>
                  <span class="font-semibold text-[#171212] dark:text-white">$${Math.round(item.subtotal || 0).toLocaleString()}</span>
                </div>
              `).join('') : '<p class="text-sm text-gray-400">No hay items</p>'}
            </div>
          </div>
          
          ${order.observations ? `
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Observaciones</p>
              <p class="text-[#171212] dark:text-white">${order.observations}</p>
            </div>
          ` : ''}
          
          <div class="pt-4 border-t border-gray-200 dark:border-zinc-700">
            <div class="flex justify-between mb-2">
              <span class="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span class="font-semibold text-[#171212] dark:text-white">$${Math.round(order.subtotal || 0).toLocaleString()}</span>
            </div>
            ${order.deliveryCost > 0 ? `
              <div class="flex justify-between mb-2">
                <span class="text-gray-600 dark:text-gray-400">Delivery</span>
                <span class="font-semibold text-[#171212] dark:text-white">$${Math.round(order.deliveryCost).toLocaleString()}</span>
              </div>
            ` : ''}
            <div class="flex justify-between pt-2 border-t border-gray-200 dark:border-zinc-700">
              <span class="font-bold text-[#171212] dark:text-white">Total</span>
              <span class="font-black text-primary text-xl">$${Math.round(order.total || 0).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="pt-4 border-t border-gray-200 dark:border-zinc-700">
            <p class="text-xs text-gray-400 dark:text-gray-500">Fecha: ${date.toLocaleString('es-CL')}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">Tipo: ${order.deliveryType === 'despacho' ? 'Delivery' : 'Retiro'}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">Pago: ${order.paymentMethod}</p>
          </div>
        </div>
      </div>
      
      <!-- Validation Button -->
      <button onclick="confirmValidation('${order.id}')" class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] text-base mb-4">
        <span class="material-symbols-outlined">verified</span>
        <span>Validar Pedido</span>
      </button>
      
      <p class="text-xs text-gray-400 dark:text-gray-500">
        Al validar, el pedido pasará a estado "Confirmado" y aparecerá en el panel de administración
      </p>
    </div>
  `;
}

// Confirmar validación
async function confirmValidation(orderId) {
  const confirmed = await showConfirm('¿Estás seguro de validar este pedido?', {
    title: 'Validar Pedido',
    confirmText: 'Validar',
    type: 'info',
    icon: 'task_alt'
  });
  if (!confirmed) return;
  
  const content = document.getElementById('validateOrderContent');
  if (!content) return;
  
  // Mostrar loading
  content.innerHTML = `
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p class="text-gray-500 dark:text-gray-400">Validando pedido...</p>
    </div>
  `;
  
  try {
    await validateOrder(orderId);
    
    // Mostrar éxito
    content.innerHTML = `
      <div class="text-center">
        <span class="material-symbols-outlined text-green-500 text-6xl mb-4">check_circle</span>
        <h2 class="text-[#171212] dark:text-white text-2xl font-bold mb-2">¡Pedido Validado!</h2>
        <p class="text-gray-500 dark:text-gray-400 mb-6">El pedido ha sido validado exitosamente y ahora está en proceso.</p>
        <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-zinc-800">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Número de Pedido</p>
          <p class="text-xl font-black text-primary">${orderId}</p>
        </div>
      </div>
    `;
    
    // Redirigir al panel admin después de 3 segundos
    setTimeout(() => {
      router.navigate('admin');
    }, 3000);
    
  } catch (error) {
    console.error('Error al validar pedido:', error);
    showValidationError('Error al validar el pedido. Por favor intenta nuevamente.');
  }
}

// Exportar funciones
window.initValidationPage = initValidationPage;
window.confirmValidation = confirmValidation;

// Inicializar cuando se navega a la página de validación
if (typeof router !== 'undefined') {
  const originalNavigate = router.navigate;
  router.navigate = function(pageName) {
    originalNavigate.call(this, pageName);
    if (pageName === 'admin-validate') {
      setTimeout(() => {
        initValidationPage();
      }, 100);
    } else if (pageName === 'admin') {
      setTimeout(() => {
        // Inicializar pedidos si estamos en el tab de pedidos
        const ordersTab = document.getElementById('adminTabOrdersContent');
        if (ordersTab && !ordersTab.classList.contains('hidden')) {
          initAdminOrders();
        }
      }, 100);
    }
  };
}

// También inicializar si ya estamos en la página
if (document.getElementById('page-admin-validate') && document.getElementById('page-admin-validate').classList.contains('active')) {
  setTimeout(() => {
    initValidationPage();
  }, 500);
}
