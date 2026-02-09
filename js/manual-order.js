// ========== CREACIÓN MANUAL DE PEDIDOS ==========

let manualOrderProducts = [];
let manualOrderSelectedItems = {}; // { productId: { product, quantity, price } }
let manualOrderFilteredProducts = [];

// Inicializar página de creación manual
function initManualOrderPage() {
  // Resetear formulario
  resetManualOrderForm();
  
  // Cargar productos
  loadProductsForManualOrder();
}

// Abrir página de creación manual (navegar)
function openManualOrderPage() {
  // Verificar que estemos en el tab de pedidos o en admin
  const ordersTab = document.getElementById('adminTabOrdersContent');
  const adminPage = document.getElementById('page-admin');
  
  if (!adminPage || !adminPage.classList.contains('active')) {
    // Si no estamos en admin, navegar primero a admin
    router.navigate('admin');
    setTimeout(() => {
      // Cambiar al tab de pedidos y luego navegar a crear pedido
      if (typeof showAdminTab === 'function') {
        showAdminTab('orders');
      }
      setTimeout(() => {
        router.navigate('admin-manual-order');
      }, 300);
    }, 300);
  } else {
    router.navigate('admin-manual-order');
  }
}

// Resetear formulario
function resetManualOrderForm() {
  document.getElementById('manualOrderFullName').value = '';
  document.getElementById('manualOrderPhone').value = '';
  document.getElementById('manualOrderAddress').value = '';
  document.getElementById('manualOrderDelivery').checked = true;
  document.getElementById('manualOrderPickup').checked = false;
  document.getElementById('manualOrderSearch').value = '';
  manualOrderSelectedItems = {};
  manualOrderFilteredProducts = [];
  updateManualOrderSummary();
  toggleManualOrderType('despacho');
}

// Alternar tipo de entrega
function toggleManualOrderType(type) {
  const addressLabel = document.getElementById('manualOrderAddressLabel');
  const deliveryLabel = document.getElementById('manualOrderDeliveryLabel');
  const pickupLabel = document.getElementById('manualOrderPickupLabel');
  
  if (type === 'despacho') {
    if (addressLabel) addressLabel.style.display = 'flex';
    if (deliveryLabel) {
      deliveryLabel.classList.add('bg-white', 'dark:bg-gray-700', 'shadow-sm', 'text-primary', 'font-bold');
      deliveryLabel.classList.remove('text-gray-500', 'font-medium');
    }
    if (pickupLabel) {
      pickupLabel.classList.remove('bg-white', 'dark:bg-gray-700', 'shadow-sm', 'text-primary', 'font-bold');
      pickupLabel.classList.add('text-gray-500', 'font-medium');
    }
  } else {
    if (addressLabel) addressLabel.style.display = 'none';
    if (pickupLabel) {
      pickupLabel.classList.add('bg-white', 'dark:bg-gray-700', 'shadow-sm', 'text-primary', 'font-bold');
      pickupLabel.classList.remove('text-gray-500', 'font-medium');
    }
    if (deliveryLabel) {
      deliveryLabel.classList.remove('bg-white', 'dark:bg-gray-700', 'shadow-sm', 'text-primary', 'font-bold');
      deliveryLabel.classList.add('text-gray-500', 'font-medium');
    }
  }
  updateManualOrderSummary();
}

// Cargar productos para el modal
function loadProductsForManualOrder() {
  if (typeof loadProductsFromFirebase === 'function') {
    loadProductsFromFirebase((products) => {
      manualOrderProducts = products || [];
      manualOrderFilteredProducts = [...manualOrderProducts];
      renderManualOrderProducts();
    });
  } else {
    // Fallback: usar MENU_ITEMS si está disponible
    setTimeout(() => {
      if (window.MENU_ITEMS && window.MENU_ITEMS.length > 0) {
        manualOrderProducts = window.MENU_ITEMS;
        manualOrderFilteredProducts = [...manualOrderProducts];
        renderManualOrderProducts();
      } else {
        // Intentar cargar desde Firebase directamente
        if (window.firebaseDB && window.firebaseReady) {
          const productsRef = window.firebaseRef(window.firebaseDB, 'products');
          window.firebaseGet(productsRef).then((snapshot) => {
            const productsData = snapshot.val() || {};
            manualOrderProducts = Object.values(productsData);
            manualOrderFilteredProducts = [...manualOrderProducts];
            renderManualOrderProducts();
          });
        }
      }
    }, 500);
  }
}

// Filtrar productos por búsqueda
function filterManualOrderProducts(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    manualOrderFilteredProducts = [...manualOrderProducts];
  } else {
    const term = searchTerm.toLowerCase();
    manualOrderFilteredProducts = manualOrderProducts.filter(product => 
      (product.name && product.name.toLowerCase().includes(term)) ||
      (product.description && product.description.toLowerCase().includes(term)) ||
      (product.category && product.category.toLowerCase().includes(term))
    );
  }
  renderManualOrderProducts();
}

// Renderizar lista de productos
function renderManualOrderProducts() {
  const container = document.getElementById('manualOrderProductsList');
  if (!container) return;
  
  if (manualOrderFilteredProducts.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 lg:col-span-full">
        <span class="material-symbols-outlined text-gray-400 text-4xl lg:text-5xl mb-2">search_off</span>
        <p class="text-gray-500 dark:text-gray-400 text-sm lg:text-base">No se encontraron productos</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  manualOrderFilteredProducts.forEach(product => {
    const productId = product.id || product.name;
    const quantity = manualOrderSelectedItems[productId]?.quantity || 0;
    const price = product.price || 0;
    const imageUrl = product.imageUrl || '';
    
    html += `
      <div class="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 p-3 lg:p-4 bg-white dark:bg-background-dark border border-gray-100 dark:border-gray-800 rounded-xl lg:rounded-2xl hover:shadow-md transition-shadow">
        <div class="size-14 lg:size-16 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-50 dark:border-gray-700">
          ${imageUrl ? 
            `<img class="w-full h-full object-cover" alt="${product.name || 'Producto'}" src="${imageUrl}"/>` :
            `<div class="w-full h-full flex items-center justify-center">
              <span class="material-symbols-outlined text-gray-400 text-xl lg:text-2xl">restaurant</span>
            </div>`
          }
        </div>
        <div class="flex-1 min-w-0 w-full lg:w-auto">
          <h4 class="text-sm lg:text-base font-bold text-gray-900 dark:text-white truncate mb-1">${escapeHtml(product.name || 'Producto')}</h4>
          <p class="text-xs lg:text-sm text-gray-500 font-medium">$${Math.round(price).toLocaleString()}</p>
        </div>
        <div class="flex items-center gap-2.5 lg:gap-3 bg-gray-50 dark:bg-gray-900 p-1 lg:p-1.5 rounded-lg border border-gray-100 dark:border-gray-800 w-full lg:w-auto justify-center lg:justify-start">
          <button onclick="decreaseManualOrderQuantity('${productId}')" class="size-7 lg:size-8 flex items-center justify-center rounded-md bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${quantity === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${quantity === 0 ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-lg lg:text-xl">remove</span>
          </button>
          <span class="text-sm lg:text-base font-bold min-w-[1.5rem] lg:min-w-[2rem] text-center ${quantity === 0 ? 'text-gray-400' : 'text-gray-900 dark:text-white'}">${quantity}</span>
          <button onclick="increaseManualOrderQuantity('${productId}')" class="size-7 lg:size-8 flex items-center justify-center rounded-md bg-primary text-white shadow-sm hover:bg-primary/90 transition-colors">
            <span class="material-symbols-outlined text-lg lg:text-xl">add</span>
          </button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Aumentar cantidad de producto
function increaseManualOrderQuantity(productId) {
  const product = manualOrderFilteredProducts.find(p => (p.id || p.name) === productId) || 
                  manualOrderProducts.find(p => (p.id || p.name) === productId);
  
  if (!product) return;
  
  const currentQuantity = manualOrderSelectedItems[productId]?.quantity || 0;
  
  if (currentQuantity >= 20) {
    notifyWarning('No puedes agregar más de 20 unidades del mismo producto');
    return;
  }
  
  if (!manualOrderSelectedItems[productId]) {
    manualOrderSelectedItems[productId] = {
      product: product,
      quantity: 0,
      price: product.price || 0
    };
  }
  
  manualOrderSelectedItems[productId].quantity += 1;
  updateManualOrderSummary();
  renderManualOrderProducts();
}

// Disminuir cantidad de producto
function decreaseManualOrderQuantity(productId) {
  if (!manualOrderSelectedItems[productId]) return;
  
  manualOrderSelectedItems[productId].quantity -= 1;
  
  if (manualOrderSelectedItems[productId].quantity <= 0) {
    delete manualOrderSelectedItems[productId];
  }
  
  updateManualOrderSummary();
  renderManualOrderProducts();
}

// Actualizar resumen del pedido
function updateManualOrderSummary() {
  const summarySection = document.getElementById('manualOrderSummarySection');
  const selectedItemsContainer = document.getElementById('manualOrderSelectedItems');
  const subtotalEl = document.getElementById('manualOrderSubtotal');
  const deliveryFeeRow = document.getElementById('manualOrderDeliveryFeeRow');
  const totalEl = document.getElementById('manualOrderTotal');
  const itemsCountEl = document.getElementById('manualOrderItemsCount');
  
  const selectedItems = Object.values(manualOrderSelectedItems).filter(item => item.quantity > 0);
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  
  if (totalItems === 0) {
    if (summarySection) summarySection.style.display = 'none';
    if (totalEl) totalEl.textContent = '$0';
    if (itemsCountEl) itemsCountEl.textContent = '0 Items';
    return;
  }
  
  if (summarySection) summarySection.style.display = 'block';
  
  // Calcular subtotal
  let subtotal = 0;
  selectedItems.forEach(item => {
    subtotal += (item.price || 0) * item.quantity;
  });
  
  // Mostrar items seleccionados
  if (selectedItemsContainer) {
    let itemsHtml = '';
    selectedItems.forEach(item => {
      itemsHtml += `
        <div class="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-800">
          <span class="text-gray-700 dark:text-gray-300">${escapeHtml(item.product.name || 'Producto')} x${item.quantity}</span>
          <span class="font-medium text-gray-900 dark:text-white">$${Math.round((item.price * item.quantity)).toLocaleString()}</span>
        </div>
      `;
    });
    selectedItemsContainer.innerHTML = itemsHtml;
  }
  
  // Calcular costo de despacho
  const isDelivery = document.getElementById('manualOrderDelivery')?.checked;
  const deliveryCost = isDelivery ? 3000 : 0;
  
  if (deliveryFeeRow) {
    deliveryFeeRow.style.display = isDelivery ? 'flex' : 'none';
  }
  
  const total = subtotal + deliveryCost;
  
  if (subtotalEl) subtotalEl.textContent = `$${Math.round(subtotal).toLocaleString()}`;
  if (totalEl) totalEl.textContent = `$${Math.round(total).toLocaleString()}`;
  
  // Actualizar también el total en el resumen si existe
  const totalSummaryEl = document.getElementById('manualOrderTotalSummary');
  if (totalSummaryEl) {
    totalSummaryEl.textContent = `$${Math.round(total).toLocaleString()}`;
  }
  
  if (itemsCountEl) itemsCountEl.textContent = `${totalItems} ${totalItems === 1 ? 'Item' : 'Items'}`;
}

// Crear pedido manual
async function createManualOrder() {
  // Validaciones
  const fullName = document.getElementById('manualOrderFullName')?.value.trim();
  const phone = document.getElementById('manualOrderPhone')?.value.trim();
  const isDelivery = document.getElementById('manualOrderDelivery')?.checked;
  const address = document.getElementById('manualOrderAddress')?.value.trim();
  
  if (!fullName || fullName.length < 3) {
    notifyWarning('Por favor, ingresa un nombre válido (mínimo 3 caracteres)');
    return;
  }
  
  if (!phone || !/^\+569[0-9]{8}$/.test(phone)) {
    notifyWarning('Por favor, ingresa un teléfono válido en formato +56912345678');
    return;
  }
  
  if (isDelivery && (!address || address.length < 10)) {
    notifyWarning('Por favor, ingresa una dirección completa (mínimo 10 caracteres)');
    return;
  }
  
  const selectedItems = Object.values(manualOrderSelectedItems).filter(item => item.quantity > 0);
  
  if (selectedItems.length === 0) {
    notifyWarning('Por favor, selecciona al menos un producto');
    return;
  }
  
  // Preparar datos del pedido
  const orderItems = selectedItems.map(item => ({
    id: item.product.id || item.product.name,
    name: item.product.name || 'Producto',
    price: item.price || 0,
    quantity: item.quantity,
    subtotal: (item.price || 0) * item.quantity
  }));
  
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryCost = isDelivery ? 3000 : 0;
  const total = subtotal + deliveryCost;
  
  const orderData = {
    fullName: fullName,
    phone: phone,
    deliveryAddress: isDelivery ? address : '',
    deliveryType: isDelivery ? 'despacho' : 'retiro',
    items: orderItems,
    sauces: {},
    observations: '',
    paymentMethod: 'efectivo',
    subtotal: subtotal,
    deliveryCost: deliveryCost,
    tip: 0,
    discount: 0,
    total: total
  };
  
  // Mostrar loading
  const createButton = document.querySelector('button[onclick="createManualOrder()"]');
  const originalText = createButton ? createButton.textContent : '';
  if (createButton) {
    createButton.disabled = true;
    createButton.textContent = 'Creando...';
  }
  
  try {
    // Crear pedido directamente como confirmado (admin ya lo validó)
    const orderId = await createManualOrderInFirebase(orderData);
    
    notifySuccess(`Pedido creado exitosamente: ${orderId}`);
    
    // Navegar de vuelta al admin y recargar lista
    router.navigate('admin');
    setTimeout(() => {
      // Cambiar al tab de pedidos
      if (typeof showAdminTab === 'function') {
        showAdminTab('orders');
      }
      // Recargar pedidos
      if (typeof loadAllOrders === 'function') {
        loadAllOrders();
      } else if (typeof initAdminOrders === 'function') {
        initAdminOrders();
      }
    }, 300);
    
  } catch (error) {
    console.error('Error al crear pedido manual:', error);
    notifyError('Error al crear el pedido. Por favor intenta nuevamente.');
  } finally {
    if (createButton) {
      createButton.disabled = false;
      createButton.textContent = originalText;
    }
  }
}

// Crear pedido manual en Firebase (como confirmado)
async function createManualOrderInFirebase(orderData) {
  if (!window.firebaseDB || !window.firebaseReady) {
    throw new Error('Firebase no está inicializado');
  }

  const orderId = generateOrderId();
  const orderRef = window.firebaseRef(window.firebaseDB, `orders/${orderId}`);

  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
  const trackingUrl = `${baseUrl}#track?id=${orderId}`;
  const validationUrl = `${baseUrl}#admin-validate?id=${orderId}`;

  const order = {
    id: orderId,
    status: ORDER_STATUS.CONFIRMED, // Directamente confirmado
    validado: true, // Ya validado por admin
    createdAt: Date.now(),
    validatedAt: Date.now(),
    cliente: {
      nombre: orderData.fullName.trim(),
      telefono: orderData.phone.trim(),
      direccion: orderData.deliveryAddress.trim()
    },
    deliveryType: orderData.deliveryType || 'retiro',
    items: orderData.items || [],
    sauces: orderData.sauces || {},
    observations: orderData.observations || '',
    paymentMethod: orderData.paymentMethod || 'efectivo',
    subtotal: orderData.subtotal || 0,
    deliveryCost: orderData.deliveryCost || 0,
    tip: orderData.tip || 0,
    discount: orderData.discount || 0,
    total: orderData.total || 0,
    estimatedTime: calculateEstimatedTime(orderData.deliveryType),
    statusHistory: [{
      status: ORDER_STATUS.CONFIRMED,
      timestamp: Date.now(),
      note: 'Pedido creado manualmente por administrador'
    }],
    trackingUrl: trackingUrl,
    validationUrl: validationUrl,
    isManual: true // Marcar como pedido manual
  };

  await window.firebaseSet(orderRef, order);
  return orderId;
}

// Escapar HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Exportar funciones
window.initManualOrderPage = initManualOrderPage;
window.openManualOrderPage = openManualOrderPage;
window.toggleManualOrderType = toggleManualOrderType;
window.filterManualOrderProducts = filterManualOrderProducts;
window.increaseManualOrderQuantity = increaseManualOrderQuantity;
window.decreaseManualOrderQuantity = decreaseManualOrderQuantity;
window.createManualOrder = createManualOrder;
