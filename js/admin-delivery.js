// ========== SISTEMA DE GESTIÓN DE REPARTIDORES ==========

let deliveryPersonsListener = null;
let allDeliveryPersons = [];

// Inicializar panel de gestión de repartidores
function initAdminDelivery() {
  loadAllDeliveryPersons();
  
  // Escuchar cambios en tiempo real
  if (window.firebaseDB && window.firebaseReady) {
    deliveryPersonsListener = listenToAllDeliveryPersons((persons) => {
      allDeliveryPersons = persons;
      renderDeliveryPersonsList(persons);
    });
  }
}

// Cargar todos los repartidores
async function loadAllDeliveryPersons() {
  try {
    const persons = await getAllDeliveryPersons();
    allDeliveryPersons = persons;
    renderDeliveryPersonsList(persons);
  } catch (error) {
    console.error('Error al cargar repartidores:', error);
  }
}

// Renderizar lista de repartidores
function renderDeliveryPersonsList(persons) {
  const container = document.getElementById('adminDeliveryPersonsList');
  if (!container) return;
  
  if (persons.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <span class="material-symbols-outlined text-gray-400 text-6xl mb-4">delivery_dining</span>
        <p class="text-gray-500 dark:text-gray-400">No hay repartidores registrados</p>
        <button onclick="showAddDeliveryPersonModal()" class="mt-4 bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Agregar Repartidor
        </button>
      </div>
    `;
    return;
  }
  
  let html = '';
  persons.forEach(person => {
    const statusColors = {
      'available': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Disponible' },
      'busy': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Ocupado' },
      'offline': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Offline' }
    };
    
    const statusInfo = statusColors[person.status] || statusColors['offline'];
    const activeOrders = person.activeOrders || 0;
    
    html += `
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div class="p-4">
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <h4 class="text-base font-bold font-display dark:text-white">${person.name}</h4>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${person.phone || 'Sin teléfono'}</p>
            </div>
            <div class="px-2.5 py-1 rounded-md ${statusInfo.bg} ${statusInfo.text} text-[10px] font-bold uppercase tracking-wider">
              ${statusInfo.label}
            </div>
          </div>
          
          <div class="flex items-center gap-2 mb-4">
            <span class="material-symbols-outlined text-sm text-gray-400">local_shipping</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Pedidos activos: <strong class="text-primary">${activeOrders}</strong></span>
          </div>
          
          <div class="flex gap-2">
            <button onclick="editDeliveryPerson('${person.id}')" class="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold font-display text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
              Editar
            </button>
            <button onclick="viewDeliveryPersonOrders('${person.id}')" class="flex-1 h-10 rounded-lg border border-primary/30 text-xs font-bold font-display text-primary hover:bg-primary/10 transition-colors">
              Ver Pedidos
            </button>
            ${person.active ? `
              <button onclick="toggleDeliveryPersonStatus('${person.id}', false)" class="h-10 w-10 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-sm" title="Desactivar">
                <span class="material-symbols-outlined text-sm">block</span>
              </button>
            ` : `
              <button onclick="toggleDeliveryPersonStatus('${person.id}', true)" class="h-10 w-10 rounded-lg bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors shadow-sm" title="Activar">
                <span class="material-symbols-outlined text-sm">check</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Obtener todos los repartidores
async function getAllDeliveryPersons() {
  if (!window.firebaseDB) return [];
  
  const personsRef = window.firebaseRef(window.firebaseDB, 'deliveryPersons');
  const snapshot = await window.firebaseGet(personsRef);
  const personsData = snapshot.val() || {};
  
  // Filtrar solo activos y calcular pedidos activos
  const persons = Object.entries(personsData)
    .map(([id, data]) => ({ id, ...data }))
    .filter(p => p.active !== false);
  
  // Calcular pedidos activos para cada repartidor
  const orders = await getAllOrders();
  for (const person of persons) {
    person.activeOrders = orders.filter(o => 
      o.deliveryPerson && 
      o.deliveryPerson.id === person.id && 
      o.status === 'en_camino'
    ).length;
  }
  
  return persons.sort((a, b) => {
    // Ordenar por estado: available primero, luego busy, luego offline
    const statusOrder = { 'available': 0, 'busy': 1, 'offline': 2 };
    return (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
  });
}

// Escuchar todos los repartidores en tiempo real
function listenToAllDeliveryPersons(callback) {
  if (!window.firebaseDB) return null;
  
  const personsRef = window.firebaseRef(window.firebaseDB, 'deliveryPersons');
  
  return window.firebaseOnValue(personsRef, async (snapshot) => {
    const personsData = snapshot.val() || {};
    const persons = Object.entries(personsData)
      .map(([id, data]) => ({ id, ...data }))
      .filter(p => p.active !== false);
    
    // Calcular pedidos activos
    const orders = await getAllOrders();
    for (const person of persons) {
      person.activeOrders = orders.filter(o => 
        o.deliveryPerson && 
        o.deliveryPerson.id === person.id && 
        o.status === 'en_camino'
      ).length;
    }
    
    if (callback) {
      callback(persons.sort((a, b) => {
        const statusOrder = { 'available': 0, 'busy': 1, 'offline': 2 };
        return (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
      }));
    }
  });
}

// Obtener repartidor por ID
async function getDeliveryPerson(personId) {
  if (!window.firebaseDB) return null;
  
  const personRef = window.firebaseRef(window.firebaseDB, `deliveryPersons/${personId}`);
  const snapshot = await window.firebaseGet(personRef);
  return snapshot.exists() ? { id: personId, ...snapshot.val() } : null;
}

// Obtener repartidores disponibles
async function getAvailableDeliveryPersons() {
  const persons = await getAllDeliveryPersons();
  return persons.filter(p => p.status === 'available' && p.active !== false);
}

// Crear nuevo repartidor
async function createDeliveryPerson(personData) {
  if (!window.firebaseDB) return;
  
  const personId = `DP-${Date.now()}`;
  const personRef = window.firebaseRef(window.firebaseDB, `deliveryPersons/${personId}`);
  
  const person = {
    id: personId,
    name: personData.name.trim(),
    phone: personData.phone.trim(),
    status: 'available',
    active: true,
    createdAt: Date.now(),
    activeOrders: 0
  };
  
  await window.firebaseSet(personRef, person);
  return personId;
}

// Actualizar repartidor
async function updateDeliveryPerson(personId, updates) {
  if (!window.firebaseDB) return;
  
  const personRef = window.firebaseRef(window.firebaseDB, `deliveryPersons/${personId}`);
  const personSnapshot = await window.firebaseGet(personRef);
  const person = personSnapshot.val();
  
  if (!person) return;
  
  await window.firebaseSet(personRef, {
    ...person,
    ...updates
  });
}

// Actualizar estado del repartidor
async function updateDeliveryPersonStatus(personId, newStatus) {
  await updateDeliveryPerson(personId, { status: newStatus });
}

// Toggle activo/inactivo
async function toggleDeliveryPersonStatus(personId, active) {
  await updateDeliveryPerson(personId, { active });
  if (!active) {
    // Si se desactiva, liberar pedidos asignados
    await releaseDeliveryPersonOrders(personId);
  }
}

// Liberar pedidos de un repartidor desactivado
async function releaseDeliveryPersonOrders(personId) {
  const orders = await getAllOrders();
  const assignedOrders = orders.filter(o => 
    o.deliveryPerson && 
    o.deliveryPerson.id === personId && 
    o.status === 'en_camino'
  );
  
  for (const order of assignedOrders) {
    const orderRef = window.firebaseRef(window.firebaseDB, `orders/${order.id}`);
    const orderSnapshot = await window.firebaseGet(orderRef);
    const orderData = orderSnapshot.val();
    
    if (orderData) {
      delete orderData.deliveryPerson;
      await window.firebaseSet(orderRef, orderData);
    }
  }
}

// Calcular carga de trabajo (pedidos activos)
async function getDeliveryPersonWorkload(personId) {
  const orders = await getAllOrders();
  return orders.filter(o => 
    o.deliveryPerson && 
    o.deliveryPerson.id === personId && 
    o.status === 'en_camino'
  ).length;
}

// Asignar repartidor a pedido
async function assignDeliveryPerson(orderId, personId) {
  const order = await getOrderById(orderId);
  if (!order || order.deliveryType !== 'despacho') {
    throw new Error('El pedido no es de tipo despacho');
  }
  
  const person = await getDeliveryPerson(personId);
  if (!person || person.status !== 'available' || person.active === false) {
    throw new Error('Repartidor no disponible');
  }
  
  // Actualizar pedido
  const orderRef = window.firebaseRef(window.firebaseDB, `orders/${orderId}`);
  await window.firebaseSet(orderRef, {
    ...order,
    deliveryPerson: {
      id: personId,
      name: person.name,
      assignedAt: Date.now()
    }
  });
  
  // Actualizar estado del repartidor a "busy" si tiene pedidos activos
  const workload = await getDeliveryPersonWorkload(personId);
  if (workload >= 1) {
    await updateDeliveryPersonStatus(personId, 'busy');
  }
  
  return true;
}

// Desasignar repartidor de pedido
async function unassignDeliveryPerson(orderId) {
  const order = await getOrderById(orderId);
  if (!order || !order.deliveryPerson) return;
  
  const personId = order.deliveryPerson.id;
  
  // Remover repartidor del pedido
  const orderRef = window.firebaseRef(window.firebaseDB, `orders/${orderId}`);
  const orderUpdate = { ...order };
  delete orderUpdate.deliveryPerson;
  await window.firebaseSet(orderRef, orderUpdate);
  
  // Verificar si el repartidor tiene más pedidos activos
  const workload = await getDeliveryPersonWorkload(personId);
  if (workload === 0) {
    await updateDeliveryPersonStatus(personId, 'available');
  }
}

// Mostrar modal para agregar repartidor
function showAddDeliveryPersonModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-[#171212] dark:text-white">Agregar Repartidor</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
          <input id="newDeliveryPersonName" type="text" class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-background-dark h-12 px-4 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Juan Pérez" required/>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
          <input id="newDeliveryPersonPhone" type="tel" class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-background-dark h-12 px-4 text-sm focus:ring-2 focus:ring-primary/50" placeholder="+56912345678" required/>
        </div>
      </div>
      
      <div class="mt-6 flex gap-2">
        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-[#171212] dark:text-white font-bold py-3 rounded-lg transition-colors">
          Cancelar
        </button>
        <button onclick="saveNewDeliveryPerson(); this.closest('.fixed').remove();" class="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-colors">
          Guardar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Guardar nuevo repartidor
async function saveNewDeliveryPerson() {
  const name = document.getElementById('newDeliveryPersonName')?.value.trim();
  const phone = document.getElementById('newDeliveryPersonPhone')?.value.trim();
  
  if (!name || !phone) {
    alert('Por favor completa todos los campos');
    return;
  }
  
  try {
    await createDeliveryPerson({ name, phone });
    alert('Repartidor agregado exitosamente');
    loadAllDeliveryPersons();
  } catch (error) {
    console.error('Error al agregar repartidor:', error);
    alert('Error al agregar el repartidor');
  }
}

// Editar repartidor
async function editDeliveryPerson(personId) {
  const person = await getDeliveryPerson(personId);
  if (!person) {
    alert('Repartidor no encontrado');
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-[#171212] dark:text-white">Editar Repartidor</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
          <input id="editDeliveryPersonName" type="text" class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-background-dark h-12 px-4 text-sm focus:ring-2 focus:ring-primary/50" value="${person.name}" required/>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
          <input id="editDeliveryPersonPhone" type="tel" class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-background-dark h-12 px-4 text-sm focus:ring-2 focus:ring-primary/50" value="${person.phone || ''}" required/>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
          <select id="editDeliveryPersonStatus" class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-background-dark h-12 px-4 text-sm focus:ring-2 focus:ring-primary/50">
            <option value="available" ${person.status === 'available' ? 'selected' : ''}>Disponible</option>
            <option value="busy" ${person.status === 'busy' ? 'selected' : ''}>Ocupado</option>
            <option value="offline" ${person.status === 'offline' ? 'selected' : ''}>Offline</option>
          </select>
        </div>
      </div>
      
      <div class="mt-6 flex gap-2">
        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-[#171212] dark:text-white font-bold py-3 rounded-lg transition-colors">
          Cancelar
        </button>
        <button onclick="saveDeliveryPersonChanges('${personId}'); this.closest('.fixed').remove();" class="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-colors">
          Guardar Cambios
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Guardar cambios del repartidor
async function saveDeliveryPersonChanges(personId) {
  const name = document.getElementById('editDeliveryPersonName')?.value.trim();
  const phone = document.getElementById('editDeliveryPersonPhone')?.value.trim();
  const status = document.getElementById('editDeliveryPersonStatus')?.value;
  
  if (!name || !phone) {
    alert('Por favor completa todos los campos');
    return;
  }
  
  try {
    await updateDeliveryPerson(personId, { name, phone, status });
    alert('Repartidor actualizado exitosamente');
    loadAllDeliveryPersons();
  } catch (error) {
    console.error('Error al actualizar repartidor:', error);
    alert('Error al actualizar el repartidor');
  }
}

// Ver pedidos de un repartidor
function viewDeliveryPersonOrders(personId) {
  // Navegar a la pestaña de pedidos y filtrar por repartidor
  showAdminTab('orders');
  setTimeout(() => {
    filterOrdersByDeliveryPerson(personId);
  }, 100);
}

// Exportar funciones
window.initAdminDelivery = initAdminDelivery;
window.loadAllDeliveryPersons = loadAllDeliveryPersons;
window.getAllDeliveryPersons = getAllDeliveryPersons;
window.getDeliveryPerson = getDeliveryPerson;
window.getAvailableDeliveryPersons = getAvailableDeliveryPersons;
window.createDeliveryPerson = createDeliveryPerson;
window.updateDeliveryPerson = updateDeliveryPerson;
window.updateDeliveryPersonStatus = updateDeliveryPersonStatus;
window.toggleDeliveryPersonStatus = toggleDeliveryPersonStatus;
window.assignDeliveryPerson = assignDeliveryPerson;
window.unassignDeliveryPerson = unassignDeliveryPerson;
window.getDeliveryPersonWorkload = getDeliveryPersonWorkload;
window.showAddDeliveryPersonModal = showAddDeliveryPersonModal;
window.saveNewDeliveryPerson = saveNewDeliveryPerson;
window.editDeliveryPerson = editDeliveryPerson;
window.saveDeliveryPersonChanges = saveDeliveryPersonChanges;
window.viewDeliveryPersonOrders = viewDeliveryPersonOrders;
