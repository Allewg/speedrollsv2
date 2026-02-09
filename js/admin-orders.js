// ========== ADMINISTRACIÓN DE PEDIDOS ==========

let ordersListener = null;
let allOrders = []; // Almacenar todos los pedidos para contar

// Inicializar panel de administración de pedidos
function initAdminOrders() {
  loadAllOrders();
  
  // Mostrar FAB si estamos en tab de pedidos
  const ordersTab = document.getElementById('adminTabOrdersContent');
  const fab = document.getElementById('adminFAB');
  if (fab && ordersTab && !ordersTab.classList.contains('hidden')) {
    fab.style.display = 'block';
  } else if (fab) {
    fab.style.display = 'none';
  }
  
  // Escuchar cambios en tiempo real
  if (window.firebaseDB && window.firebaseReady) {
    ordersListener = listenToAllOrders((orders) => {
      renderOrdersList(orders);
    });
  }
}

// Cargar todos los pedidos
async function loadAllOrders() {
  try {
    const orders = await getAllOrders();
    renderOrdersList(orders);
  } catch (error) {
    console.error('Error al cargar pedidos:', error);
  }
}

// Renderizar lista de pedidos
function renderOrdersList(orders) {
  const container = document.getElementById('adminOrdersList');
  if (!container) return;
  
  // Guardar todos los pedidos para contar
  allOrders = orders;
  
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <span class="material-symbols-outlined text-gray-400 text-6xl mb-4">receipt_long</span>
        <p class="text-gray-500 dark:text-gray-400">No hay pedidos aún</p>
      </div>
    `;
    return;
  }
  
  // Filtrar por estado según el filtro activo
  const activeFilter = window.currentOrderFilter || 'all';
  let filteredOrders = orders;
  
  if (activeFilter === 'pending') {
    filteredOrders = orders.filter(o => !o.validado);
  } else if (activeFilter === 'preparing') {
    filteredOrders = orders.filter(o => o.validado && (o.status === 'confirmado' || o.status === 'en_cocina'));
  } else if (activeFilter === 'dispatched') {
    filteredOrders = orders.filter(o => o.status === 'en_camino');
  } else if (activeFilter === 'cancelled') {
    filteredOrders = orders.filter(o => o.status === 'cancelado');
  }
  
  // Aplicar búsqueda si existe
  if (window.currentOrderSearch && window.currentOrderSearch.trim() !== '') {
    const searchTerm = window.currentOrderSearch.toLowerCase();
    filteredOrders = filteredOrders.filter(o => 
      o.id.toLowerCase().includes(searchTerm) ||
      (o.cliente.nombre && o.cliente.nombre.toLowerCase().includes(searchTerm)) ||
      (o.cliente.telefono && o.cliente.telefono.includes(searchTerm))
    );
  }
  
  // Ordenar por fecha (más recientes primero)
  filteredOrders.sort((a, b) => b.createdAt - a.createdAt);
  
  // Contar pedidos por estado para los badges
  const newCount = orders.filter(o => !o.validado).length;
  document.getElementById('filterNewCount').textContent = `(${newCount})`;
  
  let html = '';
  filteredOrders.forEach(order => {
    const date = new Date(order.createdAt);
    const timeStr = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const itemsCount = order.items ? order.items.length : 0;
    const totalFormatted = Math.round(order.total || 0).toLocaleString();
    
    // Obtener iniciales del cliente
    const clienteNombre = order.cliente.nombre || 'Sin nombre';
    const initials = clienteNombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SN';
    
    // Determinar tipo de tarjeta según estado
    let cardClass = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden';
    let orderTypeLabel = 'Pedido Activo';
    let orderTypeClass = 'text-gray-400';
    
    if (order.status === 'cancelado') {
      cardClass = 'bg-red-50/30 dark:bg-primary/5 rounded-xl border border-primary/10 dark:border-primary/20 shadow-sm overflow-hidden';
      orderTypeLabel = 'Anulado';
      orderTypeClass = 'text-primary text-opacity-70';
    } else if (order.status === 'en_camino') {
      cardClass = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden opacity-80';
      orderTypeLabel = 'En Ruta';
      orderTypeClass = 'text-gray-400';
    } else if (!order.validado) {
      orderTypeLabel = 'Pedido Nuevo';
      orderTypeClass = 'text-primary';
    }
    
    // Badge de estado
    let statusBadge = '';
    if (order.status === 'cancelado') {
      statusBadge = '<div class="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Cancelado</div>';
    } else if (order.status === 'en_camino') {
      statusBadge = '<div class="px-2.5 py-1 rounded-md bg-status-dispatched/10 text-status-dispatched text-[10px] font-bold uppercase tracking-wider">En Camino</div>';
    } else if (order.status === 'en_cocina' || order.status === 'confirmado') {
      statusBadge = '<div class="px-2.5 py-1 rounded-md bg-status-preparing/10 text-status-preparing text-[10px] font-bold uppercase tracking-wider">Preparando</div>';
    } else if (!order.validado) {
      statusBadge = '<div class="px-2.5 py-1 rounded-md bg-status-new/10 text-status-new text-[10px] font-bold uppercase tracking-wider">Nuevo</div>';
    }
    
    // Avatar del cliente
    let avatarClass = 'w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-bold font-display';
    if (order.status === 'cancelado') {
      avatarClass = 'w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold font-display';
    }
    
    // Botones de acción
    let actionButtons = '';
    if (order.status === 'cancelado') {
      actionButtons = `
        <button onclick="viewOrderDetails('${order.id}')" class="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold font-display text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
          Ver Detalles
        </button>
        <button onclick="deleteOrderFromList('${order.id}')" class="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold font-display transition-colors shadow-sm">
          Eliminar
        </button>
      `;
    } else if (order.status === 'en_camino') {
      actionButtons = `
        <button onclick="viewOrderDetails('${order.id}')" class="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold font-display text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
          Ver Detalles
        </button>
        <button onclick="showEditOrderModal('${order.id}')" class="h-10 w-10 rounded-lg border border-primary/30 bg-primary/5 text-primary flex items-center justify-center hover:bg-primary/10 transition-colors" title="Editar pedido">
          <span class="material-symbols-outlined text-sm">edit</span>
        </button>
        <button onclick="updateOrderStatusFromList('${order.id}', 'entregado', true)" class="flex-1 h-10 rounded-lg bg-primary text-white text-xs font-bold font-display hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
          Marcar Entregado
        </button>
        <button onclick="deleteOrderFromList('${order.id}')" class="h-10 w-10 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-sm" title="Eliminar pedido">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="viewOrderDetails('${order.id}')" class="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold font-display text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
          Ver Detalles
        </button>
        <button onclick="showEditOrderModal('${order.id}')" class="h-10 w-10 rounded-lg border border-primary/30 bg-primary/5 text-primary flex items-center justify-center hover:bg-primary/10 transition-colors" title="Editar pedido">
          <span class="material-symbols-outlined text-sm">edit</span>
        </button>
        <button onclick="manageOrderStatus('${order.id}')" class="flex-1 h-10 rounded-lg bg-primary text-white text-xs font-bold font-display hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
          Gestionar Estado
        </button>
        <button onclick="deleteOrderFromList('${order.id}')" class="h-10 w-10 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-sm" title="Eliminar pedido">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      `;
    }
    
    html += `
      <div class="${cardClass}">
        <div class="p-4">
          <div class="flex justify-between items-start mb-3">
            <div class="flex flex-col">
              <span class="text-xs font-bold ${orderTypeClass} font-display mb-1 uppercase tracking-wider">${orderTypeLabel}</span>
              <h4 class="text-base font-bold font-display dark:text-white">${order.id}</h4>
            </div>
            ${statusBadge}
          </div>
          <div class="flex items-center gap-3 mb-4">
            <div class="${avatarClass}">
              ${initials}
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold dark:text-gray-200">${clienteNombre}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 leading-none mt-1">${timeStr} • ${itemsCount} ${itemsCount === 1 ? 'producto' : 'productos'} • $${totalFormatted}</p>
            </div>
          </div>
          <div class="flex gap-2">
            ${actionButtons}
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Actualizar contador
  updateOrdersCount(filteredOrders.length, orders.length);
}

// Actualizar contador de pedidos
function updateOrdersCount(filteredCount, totalCount) {
  const countEl = document.getElementById('adminOrdersCount');
  if (countEl) {
    const activeCount = allOrders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado').length;
    countEl.textContent = `${filteredCount} ${filteredCount === 1 ? 'Activo' : 'Activos'}`;
  }
}

// Filtrar pedidos por búsqueda
function filterOrdersBySearch(searchTerm) {
  window.currentOrderSearch = searchTerm;
  // Re-renderizar con los pedidos actuales aplicando el filtro de búsqueda
  if (allOrders.length > 0) {
    renderOrdersList(allOrders);
  } else {
    loadAllOrders();
  }
}

// Gestionar estado del pedido (abre modal con opciones)
async function manageOrderStatus(orderId) {
  const order = await getOrderById(orderId);
  if (!order) {
    notifyError('Pedido no encontrado');
    return;
  }
  
  // Crear modal de gestión de estado
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
  
  modal.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-[#171212] dark:text-white">Gestionar Estado - ${order.id}</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div class="space-y-3">
        ${!order.validado ? `
          <button onclick="validateOrderFromModal('${order.id}'); this.closest('.fixed').remove();" class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Validar Pedido
          </button>
        ` : ''}
        ${order.validado && order.status !== 'en_cocina' && order.status !== 'entregado' && order.status !== 'cancelado' ? `
          <button onclick="updateOrderStatusFromList('${order.id}', 'en_cocina'); this.closest('.fixed').remove();" class="w-full bg-status-preparing hover:bg-status-preparing/90 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Marcar como En Cocina
          </button>
        ` : ''}
        ${(order.status === 'en_cocina' || order.status === 'confirmado') && order.status !== 'entregado' && order.status !== 'cancelado' ? `
          <button onclick="updateOrderStatusFromList('${order.id}', 'en_camino', true); this.closest('.fixed').remove();" class="w-full bg-status-dispatched hover:bg-status-dispatched/90 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
            <span>Marcar como En Camino</span>
            ${order.deliveryType === 'despacho' ? '<span class="material-symbols-outlined text-sm">local_shipping</span>' : ''}
          </button>
        ` : ''}
        ${order.status === 'en_camino' && order.status !== 'entregado' && order.status !== 'cancelado' ? `
          <button onclick="updateOrderStatusFromList('${order.id}', 'entregado', true); this.closest('.fixed').remove();" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Marcar como Entregado
          </button>
        ` : ''}
        ${order.status !== 'cancelado' && order.status !== 'entregado' ? `
          <button onclick="cancelOrderWithConfirm('${order.id}', this.closest('.fixed'))" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Cancelar Pedido
          </button>
        ` : ''}
      </div>
      
      <div class="mt-6">
        <button onclick="this.closest('.fixed').remove()" class="w-full bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-[#171212] dark:text-white font-bold py-3 rounded-lg transition-colors">
          Cerrar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Validar pedido desde la lista
async function validateOrderFromList(orderId) {
  const confirmed = await showConfirm('¿Deseas confirmar este pedido?', {
    title: 'Validar Pedido',
    confirmText: 'Confirmar',
    type: 'info',
    icon: 'task_alt'
  });
  if (!confirmed) return;
  
  try {
    await validateOrder(orderId);
    notifySuccess('Pedido validado exitosamente');
  } catch (error) {
    console.error('Error al validar pedido:', error);
    notifyError('Error al validar el pedido');
  }
}

// Actualizar estado desde la lista
async function updateOrderStatusFromList(orderId, newStatus, skipConfirm = false) {
  const statusNames = {
    'en_cocina': 'En Cocina',
    'en_camino': 'En Camino',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado'
  };
  
  if (!skipConfirm) {
    const confirmed = await showConfirm(`¿Cambiar estado a "${statusNames[newStatus] || newStatus}"?`, {
      title: 'Cambiar Estado',
      confirmText: 'Cambiar',
      type: newStatus === 'cancelado' ? 'danger' : 'info'
    });
    if (!confirmed) return;
  }
  
  try {
    await updateOrderStatus(orderId, newStatus);
    notifySuccess(`Estado actualizado a "${statusNames[newStatus] || newStatus}"`);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    notifyError('Error al actualizar el estado');
  }
}

// Eliminar pedido desde la lista
async function deleteOrderFromList(orderId) {
  // Confirmación doble para evitar eliminaciones accidentales
  const firstConfirm = await showConfirm('¿Estás seguro de eliminar este pedido?', {
    title: 'Eliminar Pedido',
    confirmText: 'Sí, eliminar',
    type: 'danger',
    icon: 'delete_forever'
  });
  if (!firstConfirm) return;
  
  const secondConfirm = await showConfirm('Esta acción no se puede deshacer. ¿Continuar?', {
    title: 'Confirmar Eliminación',
    confirmText: 'Eliminar definitivamente',
    type: 'danger',
    icon: 'warning'
  });
  if (!secondConfirm) return;
  
  try {
    await deleteOrder(orderId);
    // Recargar la lista de pedidos
    loadAllOrders();
    notifySuccess('Pedido eliminado exitosamente');
  } catch (error) {
    console.error('Error al eliminar pedido:', error);
    notifyError('Error al eliminar el pedido');
  }
}

// Ver detalles del pedido
async function viewOrderDetails(orderId) {
  const order = await getOrderById(orderId);
  if (!order) {
    notifyError('Pedido no encontrado');
    return;
  }
  
  // Crear modal o navegar a página de detalles
  showOrderDetailsModal(order);
}

// Mostrar modal de detalles del pedido
function showOrderDetailsModal(order) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-[#171212] dark:text-white">Pedido ${order.id}</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Cliente</p>
          <p class="font-semibold text-[#171212] dark:text-white">${order.cliente.nombre || 'Sin nombre'}</p>
          ${order.cliente.telefono ? `<p class="text-sm text-gray-600 dark:text-gray-400">${order.cliente.telefono}</p>` : ''}
        </div>
        
        ${order.cliente.direccion ? `
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Dirección</p>
            <p class="text-[#171212] dark:text-white">${order.cliente.direccion}</p>
          </div>
        ` : ''}
        
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Productos</p>
          <div class="space-y-2">
            ${order.items && order.items.length > 0 ? order.items.map(item => `
              <div class="flex justify-between text-sm">
                <span class="text-[#171212] dark:text-white">${item.name} x${item.quantity}</span>
                <span class="font-semibold text-[#171212] dark:text-white">$${Math.round(item.subtotal || 0).toLocaleString()}</span>
              </div>
            `).join('') : '<p class="text-sm text-gray-400">No hay productos</p>'}
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
            <span class="font-black text-primary text-lg">$${Math.round(order.total || 0).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="pt-4 border-t border-gray-200 dark:border-zinc-700">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Estado</p>
          <p class="font-semibold text-[#171212] dark:text-white">${getStatusVisualInfo(order.status).label}</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${order.validado ? 'Validado' : 'Pendiente de validación'}</p>
        </div>
      </div>
      
      <div class="mt-6 flex gap-2 flex-wrap">
        <button onclick="printOrder('${order.id}')" class="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-[#171212] dark:text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-sm">print</span>
          Imprimir
        </button>
        ${order.status !== 'cancelado' && order.status !== 'entregado' ? `
          <button onclick="this.closest('.fixed').remove(); showEditOrderModal('${order.id}');" class="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-sm">edit</span>
            Editar
          </button>
        ` : ''}
        ${!order.validado ? `
          <button onclick="validateOrderFromModal('${order.id}'); this.closest('.fixed').remove();" class="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-colors">
            Validar Pedido
          </button>
        ` : ''}
        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-[#171212] dark:text-white font-bold py-3 rounded-lg transition-colors">
          Cerrar
        </button>
        <button onclick="deleteOrderFromDetails('${order.id}', this.closest('.fixed'))" class="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center" title="Eliminar pedido">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ========== EDICIÓN DE PEDIDOS ==========

// Variable temporal para los items que se están editando
let editingOrderItems = [];
let editingOrderId = null;

// Mostrar modal de edición del pedido
async function showEditOrderModal(orderId) {
  const order = await getOrderById(orderId);
  if (!order) {
    notifyError('Pedido no encontrado');
    return;
  }

  editingOrderId = orderId;
  editingOrderItems = JSON.parse(JSON.stringify(order.items || [])); // Deep clone

  const deliveryCost = order.deliveryCost || 0;
  const discount = order.discount || 0;
  const tip = order.tip || 0;

  const modal = document.createElement('div');
  modal.id = 'editOrderModal';
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';

  modal.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
      <!-- Header -->
      <div class="flex justify-between items-center p-5 border-b border-gray-100 dark:border-zinc-800 shrink-0">
        <div>
          <h3 class="text-lg font-bold text-[#171212] dark:text-white font-display">Editar Pedido</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${order.id} • ${order.cliente?.nombre || 'Sin nombre'}</p>
        </div>
        <button onclick="closeEditOrderModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Content (scrollable) -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5">
        <!-- Items actuales -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-bold text-[#171212] dark:text-white font-display uppercase tracking-wider">Productos del Pedido</h4>
            <button onclick="showAddProductToPedido()" class="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
              <span class="material-symbols-outlined text-sm">add_circle</span>
              Agregar Producto
            </button>
          </div>
          <div id="editOrderItemsList" class="space-y-2">
            <!-- Se genera dinámicamente -->
          </div>
        </div>

        <!-- Selector de producto (oculto por defecto) -->
        <div id="addProductSection" class="hidden">
          <div class="border border-primary/20 rounded-xl p-4 bg-primary/5 dark:bg-primary/10 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-bold text-primary font-display">Agregar Producto</h4>
              <button onclick="hideAddProductToPedido()" class="text-gray-400 hover:text-gray-600">
                <span class="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <input type="text" id="editOrderProductSearch" placeholder="Buscar producto..." 
              oninput="filterEditOrderProducts(this.value)"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-[#171212] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <div id="editOrderProductsList" class="max-h-48 overflow-y-auto space-y-1">
              <!-- Productos disponibles -->
            </div>
          </div>
        </div>

        <!-- Observaciones -->
        <div>
          <h4 class="text-sm font-bold text-[#171212] dark:text-white font-display uppercase tracking-wider mb-2">Observaciones</h4>
          <textarea id="editOrderObservations" rows="2" placeholder="Observaciones del pedido..."
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-[#171212] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none">${order.observations || ''}</textarea>
        </div>

        <!-- Resumen de totales -->
        <div class="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span id="editOrderSubtotal" class="font-semibold text-[#171212] dark:text-white">$0</span>
          </div>
          ${deliveryCost > 0 ? `
          <div class="flex justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">Despacho</span>
            <span class="font-semibold text-[#171212] dark:text-white">$${Math.round(deliveryCost).toLocaleString()}</span>
          </div>` : ''}
          ${discount > 0 ? `
          <div class="flex justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">Descuento</span>
            <span class="font-semibold text-green-600">-$${Math.round(discount).toLocaleString()}</span>
          </div>` : ''}
          ${tip > 0 ? `
          <div class="flex justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">Propina</span>
            <span class="font-semibold text-[#171212] dark:text-white">$${Math.round(tip).toLocaleString()}</span>
          </div>` : ''}
          <div class="flex justify-between pt-2 border-t border-gray-200 dark:border-zinc-700">
            <span class="font-bold text-[#171212] dark:text-white">Total</span>
            <span id="editOrderTotal" class="font-black text-primary text-lg">$0</span>
          </div>
        </div>
      </div>

      <!-- Footer con botones -->
      <div class="p-5 border-t border-gray-100 dark:border-zinc-800 shrink-0 flex gap-3">
        <button onclick="closeEditOrderModal()" class="flex-1 h-11 rounded-xl bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-[#171212] dark:text-white text-sm font-bold font-display transition-colors">
          Cancelar
        </button>
        <button onclick="saveEditedOrder()" class="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold font-display transition-colors shadow-sm shadow-primary/20 flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-sm">save</span>
          Guardar Cambios
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Renderizar items y cargar productos
  renderEditOrderItems();
  loadProductsForEdit();
}

// Renderizar items en el modal de edición
function renderEditOrderItems() {
  const container = document.getElementById('editOrderItemsList');
  if (!container) return;

  if (editingOrderItems.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-gray-400 dark:text-gray-500">
        <span class="material-symbols-outlined text-3xl mb-2">shopping_cart</span>
        <p class="text-sm">No hay productos en el pedido</p>
      </div>
    `;
    recalcEditOrderTotals();
    return;
  }

  let html = '';
  editingOrderItems.forEach((item, index) => {
    html += `
      <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-[#171212] dark:text-white truncate">${item.name}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">$${Math.round(item.price || 0).toLocaleString()} c/u</p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="editOrderItemQty(${index}, -1)" class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-[#171212] dark:text-white hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors active:scale-95">
            <span class="material-symbols-outlined text-sm">remove</span>
          </button>
          <span class="w-8 text-center text-sm font-bold text-[#171212] dark:text-white">${item.quantity || 1}</span>
          <button onclick="editOrderItemQty(${index}, 1)" class="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95">
            <span class="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
        <button onclick="removeEditOrderItem(${index})" class="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors active:scale-95" title="Eliminar">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
  recalcEditOrderTotals();
}

// Cambiar cantidad de un item
async function editOrderItemQty(index, change) {
  if (!editingOrderItems[index]) return;

  const newQty = (editingOrderItems[index].quantity || 1) + change;
  if (newQty < 1) {
    // Si llega a 0, preguntar si eliminar
    const confirmed = await showConfirm(`¿Eliminar "${editingOrderItems[index].name}" del pedido?`, {
      title: 'Quitar Producto',
      confirmText: 'Eliminar',
      type: 'warning'
    });
    if (confirmed) {
      editingOrderItems.splice(index, 1);
    }
  } else {
    editingOrderItems[index].quantity = newQty;
    editingOrderItems[index].subtotal = (editingOrderItems[index].price || 0) * newQty;
  }

  renderEditOrderItems();
}

// Eliminar item del pedido
async function removeEditOrderItem(index) {
  if (!editingOrderItems[index]) return;

  const confirmed = await showConfirm(`¿Eliminar "${editingOrderItems[index].name}" del pedido?`, {
    title: 'Quitar Producto',
    confirmText: 'Eliminar',
    type: 'warning'
  });
  if (confirmed) {
    editingOrderItems.splice(index, 1);
    renderEditOrderItems();
  }
}

// Recalcular totales en el modal de edición
function recalcEditOrderTotals() {
  let subtotal = 0;
  editingOrderItems.forEach(item => {
    subtotal += (item.price || 0) * (item.quantity || 1);
  });

  // Obtener datos del pedido original para delivery/descuento/propina
  const modal = document.getElementById('editOrderModal');
  // Leer los valores desde el HTML renderizado
  const deliveryCostEl = modal?.querySelector('[data-delivery-cost]');
  
  // Usar datos guardados del pedido actual (se parsean del DOM)
  const subtotalEl = document.getElementById('editOrderSubtotal');
  const totalEl = document.getElementById('editOrderTotal');

  if (subtotalEl) subtotalEl.textContent = `$${Math.round(subtotal).toLocaleString()}`;

  // Recalcular total: obtener delivery, descuento y propina del DOM
  // Estos se muestran estáticos en el modal
  getOrderById(editingOrderId).then(order => {
    if (!order) return;
    const deliveryCost = order.deliveryCost || 0;
    const discount = order.discount || 0;
    const tip = order.tip || 0;
    const total = subtotal + deliveryCost - discount + tip;
    if (totalEl) totalEl.textContent = `$${Math.round(total).toLocaleString()}`;
  });
}

// Mostrar sección de agregar producto
function showAddProductToPedido() {
  const section = document.getElementById('addProductSection');
  if (section) {
    section.classList.remove('hidden');
    const searchInput = document.getElementById('editOrderProductSearch');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    filterEditOrderProducts('');
  }
}

// Ocultar sección de agregar producto
function hideAddProductToPedido() {
  const section = document.getElementById('addProductSection');
  if (section) section.classList.add('hidden');
}

// Variable para almacenar productos cargados para edición
let editOrderAvailableProducts = [];

// Cargar productos desde Firebase para el selector
function loadProductsForEdit() {
  loadProductsFromFirebase((products) => {
    editOrderAvailableProducts = products.filter(p => {
      const category = (p.category || '').toLowerCase();
      return category !== 'salsas' && category !== 'salsa';
    });
    filterEditOrderProducts('');
  });
}

// Filtrar productos en el buscador
function filterEditOrderProducts(searchTerm) {
  const container = document.getElementById('editOrderProductsList');
  if (!container) return;

  const term = (searchTerm || '').toLowerCase().trim();
  let filtered = editOrderAvailableProducts;

  if (term) {
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">No se encontraron productos</p>';
    return;
  }

  let html = '';
  filtered.forEach(product => {
    const price = product.price || 0;
    html += `
      <button onclick="addProductToEditOrder('${(product.name || '').replace(/'/g, "\\'")}', ${price})" 
        class="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors text-left group">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[#171212] dark:text-white truncate">${product.name}</p>
          <p class="text-[10px] text-gray-400 dark:text-gray-500">${product.category || 'Sin categoría'}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-bold text-primary">$${Math.round(price).toLocaleString()}</span>
          <span class="material-symbols-outlined text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">add_circle</span>
        </div>
      </button>
    `;
  });

  container.innerHTML = html;
}

// Agregar producto al pedido en edición
function addProductToEditOrder(productName, price) {
  // Verificar si el producto ya está en el pedido
  const existingIndex = editingOrderItems.findIndex(item => item.name === productName);

  if (existingIndex >= 0) {
    // Incrementar cantidad
    editingOrderItems[existingIndex].quantity = (editingOrderItems[existingIndex].quantity || 1) + 1;
    editingOrderItems[existingIndex].subtotal = (editingOrderItems[existingIndex].price || 0) * editingOrderItems[existingIndex].quantity;
  } else {
    // Agregar nuevo item
    editingOrderItems.push({
      name: productName,
      price: price,
      quantity: 1,
      subtotal: price
    });
  }

  renderEditOrderItems();
  hideAddProductToPedido();
}

// Guardar cambios del pedido editado
async function saveEditedOrder() {
  if (!editingOrderId) return;

  if (editingOrderItems.length === 0) {
    notifyWarning('El pedido debe tener al menos un producto');
    return;
  }

  const observations = document.getElementById('editOrderObservations')?.value || '';

  // Mostrar loading en botón
  const saveBtn = document.querySelector('#editOrderModal button[onclick="saveEditedOrder()"]');
  const originalText = saveBtn ? saveBtn.innerHTML : '';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Guardando...';
  }

  try {
    await updateOrderItems(editingOrderId, editingOrderItems, observations);
    closeEditOrderModal();
    // Recargar la lista de pedidos
    loadAllOrders();
    notifySuccess('Pedido actualizado exitosamente');
  } catch (error) {
    console.error('Error al guardar pedido:', error);
    notifyError('Error al guardar los cambios: ' + error.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }
}

// Cerrar modal de edición
function closeEditOrderModal() {
  const modal = document.getElementById('editOrderModal');
  if (modal) modal.remove();
  editingOrderId = null;
  editingOrderItems = [];
}

// Validar desde modal
async function validateOrderFromModal(orderId) {
  try {
    await validateOrder(orderId);
    notifySuccess('Pedido validado exitosamente');
  } catch (error) {
    console.error('Error al validar pedido:', error);
    notifyError('Error al validar el pedido');
  }
}

// Cancelar pedido con confirmación (usado desde modal de gestión de estado)
async function cancelOrderWithConfirm(orderId, modalElement) {
  const confirmed = await showConfirm('¿Estás seguro de cancelar este pedido?', {
    title: 'Cancelar Pedido',
    confirmText: 'Sí, cancelar',
    type: 'danger',
    icon: 'cancel'
  });
  if (confirmed) {
    await updateOrderStatusFromList(orderId, 'cancelado', true);
    if (modalElement) modalElement.remove();
  }
}

// Eliminar pedido desde el modal de detalles
async function deleteOrderFromDetails(orderId, modalElement) {
  if (modalElement) modalElement.remove();
  await deleteOrderFromList(orderId);
}

// Obtener tiempo transcurrido
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  if (hours > 0) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  if (minutes > 0) return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  return 'Hace unos momentos';
}

// Filtrar pedidos
function filterOrders(filter) {
  window.currentOrderFilter = filter;
  loadAllOrders();
  
  // Actualizar UI de filtros
  document.querySelectorAll('.order-filter-btn').forEach(btn => {
    const p = btn.querySelector('p');
    btn.classList.remove('bg-primary');
    btn.classList.add('bg-white', 'dark:bg-gray-800', 'border', 'border-gray-100', 'dark:border-gray-700');
    if (p) {
      p.classList.remove('text-white');
      p.classList.add('text-gray-600', 'dark:text-gray-300');
    }
  });
  
  const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
  if (activeBtn) {
    const p = activeBtn.querySelector('p');
    activeBtn.classList.remove('bg-white', 'dark:bg-gray-800', 'border', 'border-gray-100', 'dark:border-gray-700');
    activeBtn.classList.add('bg-primary');
    if (p) {
      p.classList.remove('text-gray-600', 'dark:text-gray-300');
      p.classList.add('text-white');
    }
  }
}

// Cambiar entre tabs de admin
function showAdminTab(tab) {
  // Ocultar todos los contenidos
  document.getElementById('adminTabInventoryContent')?.classList.add('hidden');
  document.getElementById('adminTabOrdersContent')?.classList.add('hidden');
  document.getElementById('adminTabSalesContent')?.classList.add('hidden');
  
  // Desactivar todos los botones
  document.getElementById('adminTabInventory')?.classList.remove('bg-primary', 'text-white');
  document.getElementById('adminTabInventory')?.classList.add('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
  document.getElementById('adminTabOrders')?.classList.remove('bg-primary', 'text-white');
  document.getElementById('adminTabOrders')?.classList.add('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
  document.getElementById('adminTabSales')?.classList.remove('bg-primary', 'text-white');
  document.getElementById('adminTabSales')?.classList.add('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
  
  // Mostrar contenido seleccionado
  const fab = document.getElementById('adminFAB');
  
  if (tab === 'inventory') {
    document.getElementById('adminTabInventoryContent')?.classList.remove('hidden');
    document.getElementById('adminTabInventory')?.classList.remove('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
    document.getElementById('adminTabInventory')?.classList.add('bg-primary', 'text-white');
    if (fab) fab.style.display = 'none';
  } else if (tab === 'orders') {
    document.getElementById('adminTabOrdersContent')?.classList.remove('hidden');
    document.getElementById('adminTabOrders')?.classList.remove('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
    document.getElementById('adminTabOrders')?.classList.add('bg-primary', 'text-white');
    if (fab) fab.style.display = 'block';
    // Inicializar pedidos si no se ha hecho
    if (!ordersListener) {
      initAdminOrders();
    }
  } else if (tab === 'sales') {
    document.getElementById('adminTabSalesContent')?.classList.remove('hidden');
    document.getElementById('adminTabSales')?.classList.remove('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
    document.getElementById('adminTabSales')?.classList.add('bg-primary', 'text-white');
    if (fab) fab.style.display = 'none';
    // Inicializar ventas si no se ha hecho
    if (typeof initAdminSales === 'function') {
      initAdminSales();
    }
  }
}

// Función para imprimir pedido
async function printOrder(orderId) {
  const order = await getOrderById(orderId);
  if (!order) {
    notifyError('Pedido no encontrado');
    return;
  }
  
  // Crear ventana de impresión
  const printWindow = window.open('', '_blank');
  
  // Formatear fecha
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString('es-CL', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Formatear estado
  const statusNames = {
    'pendiente': 'Pendiente',
    'confirmado': 'Confirmado',
    'en_cocina': 'En Cocina',
    'en_camino': 'En Camino',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado'
  };
  
  // Generar HTML para impresión
  const printHTML = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pedido ${order.id} - Speed Roll</title>
      <style>
        @media print {
          @page {
            margin: 1cm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #b5352c;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #b5352c;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .order-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .info-section {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
        }
        .info-section h3 {
          margin: 0 0 10px 0;
          color: #b5352c;
          font-size: 14px;
          text-transform: uppercase;
        }
        .info-section p {
          margin: 5px 0;
          font-size: 14px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th {
          background: #b5352c;
          color: white;
          padding: 12px;
          text-align: left;
          font-size: 14px;
        }
        .items-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #ddd;
          font-size: 14px;
        }
        .items-table tr:last-child td {
          border-bottom: none;
        }
        .total-section {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          font-size: 16px;
        }
        .total-final {
          font-size: 24px;
          font-weight: bold;
          color: #b5352c;
          border-top: 2px solid #b5352c;
          padding-top: 10px;
          margin-top: 10px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-confirmado { background: #F5A623; color: white; }
        .status-en_cocina { background: #F5A623; color: white; }
        .status-en_camino { background: #4CAF50; color: white; }
        .status-entregado { background: #22c55e; color: white; }
        .status-cancelado { background: #b5352c; color: white; }
        .status-pendiente { background: #4A90E2; color: white; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🍣 SPEED ROLL</h1>
        <p>Pedido de Comida Rápida</p>
      </div>
      
      <div class="order-info">
        <div class="info-section">
          <h3>Información del Pedido</h3>
          <p><strong>Número:</strong> ${order.id}</p>
          <p><strong>Fecha:</strong> ${dateStr}</p>
          <p><strong>Estado:</strong> 
            <span class="status-badge status-${order.status}">${statusNames[order.status] || order.status}</span>
          </p>
        </div>
        
        <div class="info-section">
          <h3>Información del Cliente</h3>
          <p><strong>Nombre:</strong> ${order.cliente.nombre || 'No especificado'}</p>
          <p><strong>Teléfono:</strong> ${order.cliente.telefono || 'No especificado'}</p>
          ${order.cliente.direccion ? `
            <p><strong>Dirección:</strong> ${order.cliente.direccion}</p>
          ` : ''}
          <p><strong>Tipo:</strong> ${order.deliveryType === 'despacho' ? 'Despacho a domicilio' : 'Retiro en local'}</p>
        </div>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${order.items && order.items.length > 0 ? order.items.map(item => `
            <tr>
              <td>${item.name || 'Producto'}</td>
              <td>${item.quantity || 1}</td>
              <td>$${Math.round((item.price || 0)).toLocaleString()}</td>
              <td>$${Math.round((item.subtotal || item.price * (item.quantity || 1))).toLocaleString()}</td>
            </tr>
          `).join('') : '<tr><td colspan="4">No hay productos</td></tr>'}
        </tbody>
      </table>
      
      ${order.observations ? `
        <div class="info-section">
          <h3>Observaciones</h3>
          <p>${order.observations}</p>
        </div>
      ` : ''}
      
      <div class="total-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>$${Math.round(order.subtotal || 0).toLocaleString()}</span>
        </div>
        ${order.deliveryCost > 0 ? `
          <div class="total-row">
            <span>Costo de Despacho:</span>
            <span>$${Math.round(order.deliveryCost).toLocaleString()}</span>
          </div>
        ` : ''}
        ${order.discount > 0 ? `
          <div class="total-row">
            <span>Descuento:</span>
            <span>-$${Math.round(order.discount).toLocaleString()}</span>
          </div>
        ` : ''}
        ${order.tip > 0 ? `
          <div class="total-row">
            <span>Propina:</span>
            <span>$${Math.round(order.tip).toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="total-row total-final">
          <span>TOTAL:</span>
          <span>$${Math.round(order.total || 0).toLocaleString()}</span>
        </div>
        <div class="total-row" style="margin-top: 10px; font-size: 14px;">
          <span>Método de Pago:</span>
          <span>${order.paymentMethod === 'efectivo' ? 'Efectivo' : order.paymentMethod === 'tarjeta' ? 'Tarjeta' : order.paymentMethod === 'transferencia' ? 'Transferencia' : order.paymentMethod || 'Efectivo'}</span>
        </div>
      </div>
      
      <div class="footer">
        <p>Gracias por su pedido</p>
        <p>Speed Roll - ${new Date().getFullYear()}</p>
      </div>
    </body>
    </html>
  `;
  
  // Escribir contenido y abrir diálogo de impresión
  printWindow.document.write(printHTML);
  printWindow.document.close();
  
  // Esperar a que cargue y luego imprimir
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

// Exportar funciones
window.initAdminOrders = initAdminOrders;
window.showAdminTab = showAdminTab;
window.filterOrders = filterOrders;
window.filterOrdersBySearch = filterOrdersBySearch;
window.validateOrderFromList = validateOrderFromList;
window.updateOrderStatusFromList = updateOrderStatusFromList;
window.viewOrderDetails = viewOrderDetails;
window.manageOrderStatus = manageOrderStatus;
window.deleteOrderFromList = deleteOrderFromList;
window.showEditOrderModal = showEditOrderModal;
window.editOrderItemQty = editOrderItemQty;
window.removeEditOrderItem = removeEditOrderItem;
window.showAddProductToPedido = showAddProductToPedido;
window.hideAddProductToPedido = hideAddProductToPedido;
window.filterEditOrderProducts = filterEditOrderProducts;
window.addProductToEditOrder = addProductToEditOrder;
window.saveEditedOrder = saveEditedOrder;
window.closeEditOrderModal = closeEditOrderModal;
window.cancelOrderWithConfirm = cancelOrderWithConfirm;
window.deleteOrderFromDetails = deleteOrderFromDetails;
window.printOrder = printOrder;
