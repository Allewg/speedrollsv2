// ========== ADMINISTRACIÓN DE PEDIDOS ==========

let ordersListener = null;
let allOrders = []; // Almacenar todos los pedidos para contar

// Inicializar panel de administración de pedidos
function initAdminOrders() {
  loadAllOrders();
  
  // Cargar filtros de repartidores
  loadDeliveryPersonFilters();
  
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
      (o.cliente.telefono && o.cliente.telefono.includes(searchTerm)) ||
      (o.deliveryPerson && o.deliveryPerson.name && o.deliveryPerson.name.toLowerCase().includes(searchTerm))
    );
  }
  
  // Aplicar filtro por repartidor si existe
  if (window.currentDeliveryPersonFilter) {
    filteredOrders = filteredOrders.filter(o => 
      o.deliveryPerson && o.deliveryPerson.id === window.currentDeliveryPersonFilter
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
              ${order.deliveryPerson ? `
                <div class="mt-2 flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-xs text-primary">delivery_dining</span>
                  <span class="text-xs font-medium text-primary">${order.deliveryPerson.name}</span>
                </div>
              ` : order.deliveryType === 'despacho' && order.status === 'en_camino' ? `
                <div class="mt-2 flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-xs text-yellow-500">warning</span>
                  <span class="text-xs font-medium text-yellow-600 dark:text-yellow-400">Sin repartidor asignado</span>
                </div>
              ` : ''}
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
    alert('Pedido no encontrado');
    return;
  }
  
  // Crear modal de gestión de estado
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
  
  // Debug: mostrar información del pedido en consola
  console.log('🔍 Información del pedido:', {
    id: order.id,
    deliveryType: order.deliveryType,
    status: order.status,
    validado: order.validado,
    cliente: order.cliente?.nombre || 'Sin nombre'
  });
  
  // Si es despacho y está validado (confirmado o en_cocina), mostrar selector de repartidor
  // El selector aparece cuando el pedido puede pasar a "en_camino"
  const canGoToEnCamino = order.validado && 
                          (order.status === 'confirmado' || order.status === 'en_cocina') &&
                          order.status !== 'entregado' && 
                          order.status !== 'cancelado';
  const showDeliverySelector = order.deliveryType === 'despacho' && canGoToEnCamino;
  
  console.log('🔍 Condiciones para selector:', {
    isDespacho: order.deliveryType === 'despacho',
    isValidado: order.validado,
    canGoToEnCamino: canGoToEnCamino,
    showDeliverySelector: showDeliverySelector
  });
  let deliverySelectorHTML = '';
  
  if (showDeliverySelector) {
    try {
      // Verificar que la función esté disponible
      if (typeof getAvailableDeliveryPersons !== 'function') {
        console.error('getAvailableDeliveryPersons no está disponible. Verifica que admin-delivery.js esté cargado.');
        deliverySelectorHTML = `
          <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p class="text-sm text-red-800 dark:text-red-300">❌ Error: Sistema de repartidores no disponible. Recarga la página.</p>
          </div>
        `;
      } else {
        const availablePersons = await getAvailableDeliveryPersons();
        console.log('Repartidores disponibles:', availablePersons.length);
        
        if (availablePersons.length > 0) {
          deliverySelectorHTML = `
            <div class="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🚴 Asignar Repartidor</label>
              <select id="deliveryPersonSelect_${orderId}" class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark h-12 px-4 text-sm focus:ring-2 focus:ring-primary/50">
                <option value="">Seleccionar repartidor...</option>
                ${availablePersons.map(p => `
                  <option value="${p.id}" data-workload="${p.activeOrders || 0}">
                    ${p.name} ${p.activeOrders > 0 ? `(${p.activeOrders} pedido${p.activeOrders > 1 ? 's' : ''})` : '(Disponible)'}
                  </option>
                `).join('')}
              </select>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Selecciona un repartidor disponible antes de marcar como "En Camino"</p>
            </div>
          `;
        } else {
          deliverySelectorHTML = `
            <div class="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p class="text-sm text-yellow-800 dark:text-yellow-300">⚠️ No hay repartidores disponibles. <a href="#" onclick="showAdminTab('delivery'); this.closest('.fixed').remove();" class="underline font-bold">Agrega repartidores</a> en la sección de gestión.</p>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Error al cargar repartidores:', error);
      deliverySelectorHTML = `
        <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p class="text-sm text-red-800 dark:text-red-300">❌ Error al cargar repartidores: ${error.message}. Verifica la consola para más detalles.</p>
        </div>
      `;
    }
  } else {
    // Debug: mostrar por qué no se muestra el selector
    if (order.deliveryType !== 'despacho') {
      console.log('Selector no mostrado: El pedido no es de tipo despacho');
    } else if (!order.validado) {
      console.log('Selector no mostrado: El pedido no está validado');
    } else if (order.status === 'entregado' || order.status === 'cancelado') {
      console.log('Selector no mostrado: El pedido está entregado o cancelado');
    } else {
      console.log('Selector no mostrado: Estado del pedido:', order.status);
    }
  }
  
  modal.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-[#171212] dark:text-white">Gestionar Estado - ${order.id}</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      ${deliverySelectorHTML}
      
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
          <button onclick="handleEnCaminoWithDelivery('${order.id}', this.closest('.fixed'))" class="w-full bg-status-dispatched hover:bg-status-dispatched/90 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
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
          <button onclick="if(confirm('¿Cancelar este pedido?')) { updateOrderStatusFromList('${order.id}', 'cancelado', true); this.closest('.fixed').remove(); }" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
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

// Manejar cambio a "En Camino" con asignación de repartidor
async function handleEnCaminoWithDelivery(orderId, modalElement) {
  const order = await getOrderById(orderId);
  if (!order) {
    if (modalElement) modalElement.remove();
    return;
  }
  
  // Si es despacho, verificar si hay repartidor seleccionado
  if (order.deliveryType === 'despacho') {
    // Buscar el select dentro del modal para asegurarnos de encontrarlo
    let selectElement = null;
    if (modalElement) {
      selectElement = modalElement.querySelector(`#deliveryPersonSelect_${orderId}`);
    }
    
    // Si no se encuentra en el modal, intentar buscarlo globalmente
    if (!selectElement) {
      selectElement = document.getElementById(`deliveryPersonSelect_${orderId}`);
    }
    
    const selectedPersonId = selectElement?.value?.trim();
    
    console.log('🔍 Debug handleEnCaminoWithDelivery:', {
      orderId: orderId,
      deliveryType: order.deliveryType,
      selectElement: selectElement,
      selectedPersonId: selectedPersonId,
      selectValue: selectElement?.value,
      selectOptions: selectElement ? Array.from(selectElement.options).map(opt => ({ value: opt.value, text: opt.text })) : []
    });
    
    if (!selectedPersonId || selectedPersonId === '' || selectedPersonId === null) {
      alert('Por favor selecciona un repartidor antes de marcar como "En Camino"');
      return; // No cerrar el modal si falta seleccionar
    }
    
    try {
      // Cerrar el modal antes de procesar
      if (modalElement) modalElement.remove();
      
      // Asignar repartidor y cambiar estado
      await assignDeliveryPerson(orderId, selectedPersonId);
      await updateOrderStatus(orderId, 'en_camino', 'Pedido asignado a repartidor');
      alert('Pedido marcado como "En Camino" y repartidor asignado');
      loadAllOrders();
    } catch (error) {
      console.error('Error al asignar repartidor:', error);
      alert('Error: ' + error.message);
    }
  } else {
    // Si no es despacho, cerrar modal y cambiar estado
    if (modalElement) modalElement.remove();
    await updateOrderStatusFromList(orderId, 'en_camino', true);
  }
}

// Validar pedido desde la lista
async function validateOrderFromList(orderId) {
  if (!confirm('¿Confirmar este pedido?')) return;
  
  try {
    await validateOrder(orderId);
    alert('Pedido validado exitosamente');
  } catch (error) {
    console.error('Error al validar pedido:', error);
    alert('Error al validar el pedido');
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
  
  if (!skipConfirm && !confirm(`¿Cambiar estado a "${statusNames[newStatus] || newStatus}"?`)) return;
  
  try {
    const order = await getOrderById(orderId);
    
    // Si cambia a "entregado" y tiene repartidor asignado, liberar repartidor
    if (newStatus === 'entregado' && order.deliveryPerson) {
      await unassignDeliveryPerson(orderId);
    }
    
    await updateOrderStatus(orderId, newStatus);
    if (!skipConfirm) {
      alert(`Estado actualizado a "${statusNames[newStatus] || newStatus}"`);
    }
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    alert('Error al actualizar el estado');
  }
}

// Filtrar pedidos por repartidor
function filterOrdersByDeliveryPerson(personId) {
  window.currentDeliveryPersonFilter = personId || null;
  loadAllOrders();
  
  // Actualizar UI del filtro
  const filterChips = document.querySelectorAll('.delivery-person-filter-chip');
  filterChips.forEach(chip => {
    chip.classList.remove('bg-primary', 'text-white');
    chip.classList.add('bg-white', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-300');
  });
  
  if (personId) {
    const activeChip = document.querySelector(`[data-delivery-person="${personId}"]`);
    if (activeChip) {
      activeChip.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-300');
      activeChip.classList.add('bg-primary', 'text-white');
    }
  }
}

// Eliminar pedido desde la lista
async function deleteOrderFromList(orderId) {
  // Confirmación doble para evitar eliminaciones accidentales
  if (!confirm('¿Estás seguro de eliminar este pedido?')) return;
  
  if (!confirm('Esta acción no se puede deshacer. ¿Continuar?')) return;
  
  try {
    await deleteOrder(orderId);
    // Recargar la lista de pedidos
    loadAllOrders();
    alert('Pedido eliminado exitosamente');
  } catch (error) {
    console.error('Error al eliminar pedido:', error);
    alert('Error al eliminar el pedido');
  }
}

// Ver detalles del pedido
async function viewOrderDetails(orderId) {
  const order = await getOrderById(orderId);
  if (!order) {
    alert('Pedido no encontrado');
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
      
      <div class="mt-6 flex gap-2">
        <button onclick="printOrder('${order.id}')" class="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-[#171212] dark:text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-sm">print</span>
          Imprimir
        </button>
        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-[#171212] dark:text-white font-bold py-3 rounded-lg transition-colors">
          Cerrar
        </button>
        ${!order.validado ? `
          <button onclick="validateOrderFromModal('${order.id}'); this.closest('.fixed').remove();" class="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-colors">
            Validar Pedido
          </button>
        ` : ''}
        <button onclick="if(confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) { deleteOrderFromList('${order.id}'); this.closest('.fixed').remove(); }" class="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center" title="Eliminar pedido">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Validar desde modal
async function validateOrderFromModal(orderId) {
  try {
    await validateOrder(orderId);
    alert('Pedido validado exitosamente');
  } catch (error) {
    console.error('Error al validar pedido:', error);
    alert('Error al validar el pedido');
  }
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
  document.getElementById('adminTabDeliveryContent')?.classList.add('hidden');
  document.getElementById('adminTabSalesContent')?.classList.add('hidden');
  
  // Desactivar todos los botones
  document.getElementById('adminTabInventory')?.classList.remove('bg-primary', 'text-white');
  document.getElementById('adminTabInventory')?.classList.add('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
  document.getElementById('adminTabOrders')?.classList.remove('bg-primary', 'text-white');
  document.getElementById('adminTabOrders')?.classList.add('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
  document.getElementById('adminTabDelivery')?.classList.remove('bg-primary', 'text-white');
  document.getElementById('adminTabDelivery')?.classList.add('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
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
    // Cargar filtros de repartidores
    loadDeliveryPersonFilters();
  } else if (tab === 'delivery') {
    document.getElementById('adminTabDeliveryContent')?.classList.remove('hidden');
    document.getElementById('adminTabDelivery')?.classList.remove('bg-gray-200', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
    document.getElementById('adminTabDelivery')?.classList.add('bg-primary', 'text-white');
    if (fab) fab.style.display = 'none';
    // Inicializar repartidores si no se ha hecho
    if (typeof initAdminDelivery === 'function') {
      initAdminDelivery();
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

// Cargar filtros de repartidores en la sección de pedidos
async function loadDeliveryPersonFilters() {
  const container = document.getElementById('deliveryPersonFilters');
  const containerParent = document.getElementById('deliveryPersonFiltersContainer');
  if (!container) return;
  
  try {
    const persons = await getAllDeliveryPersons();
    
    if (persons.length === 0) {
      containerParent?.classList.add('hidden');
      return;
    }
    
    containerParent?.classList.remove('hidden');
    
    let html = `
      <button onclick="filterOrdersByDeliveryPerson(null)" class="delivery-person-filter-chip flex h-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:border-primary">
        Todos
      </button>
    `;
    
    persons.forEach(person => {
      html += `
        <button onclick="filterOrdersByDeliveryPerson('${person.id}')" data-delivery-person="${person.id}" class="delivery-person-filter-chip flex h-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:border-primary">
          🚴 ${person.name} ${person.activeOrders > 0 ? `(${person.activeOrders})` : ''}
        </button>
      `;
    });
    
    container.innerHTML = html;
    
    // Aplicar estilo al filtro activo si existe
    if (window.currentDeliveryPersonFilter) {
      const activeChip = container.querySelector(`[data-delivery-person="${window.currentDeliveryPersonFilter}"]`);
      if (activeChip) {
        activeChip.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-300');
        activeChip.classList.add('bg-primary', 'text-white');
      }
    }
  } catch (error) {
    console.error('Error al cargar filtros de repartidores:', error);
    containerParent?.classList.add('hidden');
  }
}

// Función para imprimir pedido
async function printOrder(orderId) {
  const order = await getOrderById(orderId);
  if (!order) {
    alert('Pedido no encontrado');
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
          ${order.deliveryPerson ? `
            <p><strong>Repartidor:</strong> ${order.deliveryPerson.name}</p>
          ` : ''}
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
window.filterOrdersByDeliveryPerson = filterOrdersByDeliveryPerson;
window.loadDeliveryPersonFilters = loadDeliveryPersonFilters;
window.validateOrderFromList = validateOrderFromList;
window.updateOrderStatusFromList = updateOrderStatusFromList;
window.viewOrderDetails = viewOrderDetails;
window.manageOrderStatus = manageOrderStatus;
window.deleteOrderFromList = deleteOrderFromList;
window.handleEnCaminoWithDelivery = handleEnCaminoWithDelivery;
window.printOrder = printOrder;
