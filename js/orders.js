// ========== SISTEMA DE GESTIÓN DE PEDIDOS ==========

// Estados de pedido
const ORDER_STATUS = {
  PENDING: 'pendiente',
  CONFIRMED: 'confirmado',
  PREPARING: 'en_cocina',
  ON_WAY: 'en_camino',
  DELIVERED: 'entregado',
  CANCELLED: 'cancelado'
};

// Mapeo de estados Firebase a estados visuales del diseño
const STATUS_TO_VISUAL = {
  'pendiente': { step: 1, label: 'Received', progress: 0 },
  'confirmado': { step: 2, label: 'Preparing', progress: 33 },
  'en_cocina': { step: 2, label: 'Preparing', progress: 33 },
  'en_camino': { step: 3, label: 'On Way', progress: 66 },
  'entregado': { step: 4, label: 'Arrived', progress: 100 },
  'cancelado': { step: 0, label: 'Cancelled', progress: 0 }
};

// Generar ID único de pedido (formato: SR-XXXX-X)
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  return `SR-${random.toString().padStart(4, '0')}-${letter}`;
}

// Crear nuevo pedido en Firebase
async function createOrder(orderData) {
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
    status: ORDER_STATUS.PENDING,
    validado: false,
    createdAt: Date.now(),
    validatedAt: null,
    cliente: {
      nombre: (orderData.fullName || '').trim(),
      telefono: (orderData.phone || '').trim(),
      direccion: (orderData.deliveryAddress || '').trim()
    },
    deliveryType: orderData.deliveryType || 'retiro',
    items: orderData.items || [],
    sauces: orderData.sauces || {},
    observations: (orderData.observations || '').trim(),
    paymentMethod: orderData.paymentMethod || 'efectivo',
    subtotal: orderData.subtotal || 0,
    deliveryCost: orderData.deliveryCost || (orderData.deliveryType === 'despacho' ? 3000 : 0),
    tip: orderData.tip || 0,
    discount: orderData.discount || 0,
    total: orderData.total || 0,
    estimatedTime: calculateEstimatedTime(orderData.deliveryType),
    statusHistory: [{
      status: ORDER_STATUS.PENDING,
      timestamp: Date.now(),
      note: 'Pedido creado'
    }],
    trackingUrl: trackingUrl,
    validationUrl: validationUrl
  };

  await window.firebaseSet(orderRef, order);
  return orderId;
}

// Calcular tiempo estimado de entrega
function calculateEstimatedTime(deliveryType) {
  const baseTime = deliveryType === 'retiro' ? 20 : 40; // minutos
  return Date.now() + (baseTime * 60 * 1000);
}

// Obtener pedido por ID
async function getOrderById(orderId) {
  if (!window.firebaseDB) return null;

  const orderRef = window.firebaseRef(window.firebaseDB, `orders/${orderId}`);
  const snapshot = await window.firebaseGet(orderRef);
  return snapshot.val();
}

// Escuchar cambios en un pedido (tracking en tiempo real)
function listenToOrder(orderId, callback) {
  if (!window.firebaseDB) return null;

  const orderRef = window.firebaseRef(window.firebaseDB, `orders/${orderId}`);
  
  return window.firebaseOnValue(orderRef, (snapshot) => {
    const order = snapshot.val();
    if (order && callback) {
      callback(order);
    }
  });
}

// Actualizar estado del pedido
async function updateOrderStatus(orderId, newStatus, note = '') {
  if (!window.firebaseDB) return;

  const orderRef = window.firebaseRef(window.firebaseDB, `orders/${orderId}`);
  const orderSnapshot = await window.firebaseGet(orderRef);
  const order = orderSnapshot.val();

  if (!order) return;

  const statusUpdate = {
    status: newStatus,
    statusHistory: [
      ...(order.statusHistory || []),
      {
        status: newStatus,
        timestamp: Date.now(),
        note: note || `Estado cambiado a ${newStatus}`
      }
    ]
  };

  // Si está en camino, actualizar tiempo estimado
  if (newStatus === ORDER_STATUS.ON_WAY) {
    statusUpdate.estimatedTime = Date.now() + (15 * 60 * 1000); // 15 minutos más
  }

  await window.firebaseSet(orderRef, {
    ...order,
    ...statusUpdate
  });
}

// Validar pedido (cambiar validado a true y estado a confirmado)
async function validateOrder(orderId) {
  if (!window.firebaseDB) return;

  const orderRef = window.firebaseRef(window.firebaseDB, `orders/${orderId}`);
  const orderSnapshot = await window.firebaseGet(orderRef);
  const order = orderSnapshot.val();

  if (!order) return;

  await window.firebaseSet(orderRef, {
    ...order,
    validado: true,
    status: ORDER_STATUS.CONFIRMED,
    validatedAt: Date.now(),
    statusHistory: [
      ...(order.statusHistory || []),
      {
        status: ORDER_STATUS.CONFIRMED,
        timestamp: Date.now(),
        note: 'Pedido validado por administrador'
      }
    ]
  });
}

// Obtener todos los pedidos (para admin)
async function getAllOrders() {
  if (!window.firebaseDB) return [];

  const ordersRef = window.firebaseRef(window.firebaseDB, 'orders');
  const snapshot = await window.firebaseGet(ordersRef);
  const ordersData = snapshot.val() || {};

  return Object.values(ordersData).sort((a, b) => b.createdAt - a.createdAt);
}

// Escuchar todos los pedidos en tiempo real (para admin)
function listenToAllOrders(callback) {
  if (!window.firebaseDB) return null;

  const ordersRef = window.firebaseRef(window.firebaseDB, 'orders');
  
  return window.firebaseOnValue(ordersRef, (snapshot) => {
    const ordersData = snapshot.val() || {};
    const orders = Object.values(ordersData).sort((a, b) => b.createdAt - a.createdAt);
    if (callback) {
      callback(orders);
    }
  });
}

// Formatear tiempo estimado para mostrar
function formatEstimatedTime(timestamp) {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff <= 0) return '0 mins';
  
  const minutes = Math.ceil(diff / (60 * 1000));
  if (minutes < 60) {
    return `${minutes} mins`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}mins`;
}

// Obtener información visual del estado
function getStatusVisualInfo(status) {
  return STATUS_TO_VISUAL[status] || STATUS_TO_VISUAL['pendiente'];
}

// Función para resetear el rate limiting (útil para desarrollo/pruebas)
// Puedes llamarla desde la consola del navegador: resetRateLimit()
function resetRateLimit() {
  const storageKey = 'orderRateLimit';
  localStorage.removeItem(storageKey);
  console.log('✅ Rate limiting reseteado. Ahora puedes crear pedidos nuevamente.');
  if (typeof notifySuccess === 'function') {
    notifySuccess('Rate limiting reseteado. Puedes crear pedidos nuevamente.');
  } else {
    console.log('Rate limiting reseteado.');
  }
}

// Hacer disponible globalmente para uso desde consola
window.resetRateLimit = resetRateLimit;

// Rate limiting mejorado: verificar si se puede crear pedido
function canCreateOrder() {
  const storageKey = 'orderRateLimit';
  const now = Date.now();
  const limitWindow = 10 * 60 * 1000; // 10 minutos
  const maxOrders = 3;
  const minTimeBetweenOrders = 30 * 1000; // 30 segundos mínimo entre pedidos
  const dailyLimit = 10; // Máximo 10 pedidos por día
  const dayWindow = 24 * 60 * 60 * 1000; // 24 horas

  const rateLimitData = JSON.parse(localStorage.getItem(storageKey) || '{"orders": [], "lastClean": 0, "lastOrder": 0, "dailyOrders": []}');
  
  // Asegurar que dailyOrders siempre sea un array
  if (!Array.isArray(rateLimitData.dailyOrders)) {
    rateLimitData.dailyOrders = [];
  }
  
  // Asegurar que orders siempre sea un array
  if (!Array.isArray(rateLimitData.orders)) {
    rateLimitData.orders = [];
  }
  
  // Limpiar pedidos antiguos
  if (now - rateLimitData.lastClean > limitWindow) {
    rateLimitData.orders = [];
    rateLimitData.lastClean = now;
  }

  // Limpiar pedidos diarios antiguos
  rateLimitData.dailyOrders = rateLimitData.dailyOrders.filter(timestamp => now - timestamp < dayWindow);

  // Verificar límite diario
  if (rateLimitData.dailyOrders.length >= dailyLimit) {
    return { allowed: false, reason: 'Has alcanzado el límite diario de pedidos (10 pedidos por día)' };
  }

  // Verificar tiempo mínimo entre pedidos
  if (rateLimitData.lastOrder > 0 && (now - rateLimitData.lastOrder) < minTimeBetweenOrders) {
    const remainingSeconds = Math.ceil((minTimeBetweenOrders - (now - rateLimitData.lastOrder)) / 1000);
    return { allowed: false, reason: `Debes esperar ${remainingSeconds} segundos antes de realizar otro pedido` };
  }

  // Filtrar pedidos dentro de la ventana de tiempo
  rateLimitData.orders = rateLimitData.orders.filter(timestamp => now - timestamp < limitWindow);

  // Verificar límite por ventana de tiempo
  if (rateLimitData.orders.length >= maxOrders) {
    return { allowed: false, reason: 'Has realizado muchos pedidos recientemente. Por favor espera unos minutos antes de intentar nuevamente.' };
  }

  // Agregar nuevo pedido
  rateLimitData.orders.push(now);
  rateLimitData.lastOrder = now;
  rateLimitData.dailyOrders.push(now);
  localStorage.setItem(storageKey, JSON.stringify(rateLimitData));
  return { allowed: true };
}

// Validar patrones sospechosos en el pedido
function validateOrderPattern(orderData) {
  const suspiciousNames = ['test', 'prueba', '123', 'abc', 'admin', 'administrator', 'root', 'user', 'usuario'];
  const suspiciousPatterns = /^(test|prueba|123|abc|admin|root|user|usuario)[0-9]*$/i;
  
  const name = (orderData.fullName || '').toLowerCase().trim();
  
  // Verificar nombres sospechosos
  if (suspiciousNames.some(suspicious => name === suspicious || name.startsWith(suspicious))) {
    return { valid: false, reason: 'Nombre inválido o sospechoso' };
  }
  
  // Verificar patrones sospechosos
  if (suspiciousPatterns.test(name)) {
    return { valid: false, reason: 'Nombre inválido o sospechoso' };
  }
  
  // Verificar que el nombre tenga al menos 3 caracteres válidos
  if (name.length < 3) {
    return { valid: false, reason: 'El nombre debe tener al menos 3 caracteres' };
  }
  
  // Verificar que el nombre no sea solo números o caracteres especiales
  if (/^[0-9\s\-_]+$/.test(name)) {
    return { valid: false, reason: 'El nombre debe contener letras' };
  }
  
  return { valid: true };
}

// Validar límites de cantidad
function validateOrderQuantities(cartItems) {
  const maxQuantityPerItem = 20;
  const maxTotalItems = 50;
  const maxTotalPrice = 500000; // $500,000 CLP
  
  let totalItems = 0;
  let totalPrice = 0;
  
  for (const item of cartItems) {
    const quantity = item.quantity || 1;
    const price = item.price || 0;
    
    // Verificar cantidad por producto
    if (quantity > maxQuantityPerItem) {
      return { valid: false, reason: `No puedes pedir más de ${maxQuantityPerItem} unidades de "${item.name}"` };
    }
    
    totalItems += quantity;
    totalPrice += price * quantity;
  }
  
  // Verificar total de productos
  if (totalItems > maxTotalItems) {
    return { valid: false, reason: `No puedes pedir más de ${maxTotalItems} productos en total` };
  }
  
  // Verificar precio total
  if (totalPrice > maxTotalPrice) {
    return { valid: false, reason: `El total del pedido no puede exceder $${maxTotalPrice.toLocaleString()}` };
  }
  
  return { valid: true };
}

// Validar precios del pedido comparando con Firebase
async function validateOrderPrices(orderData, cartItems) {
  if (!window.firebaseDB || !window.firebaseReady) {
    // Si Firebase no está disponible, permitir pero registrar advertencia
    console.warn('Firebase no disponible para validación de precios');
    return { valid: true, warning: true };
  }
  
  try {
    // Obtener productos desde Firebase
    const productsRef = window.firebaseRef(window.firebaseDB, 'products');
    const snapshot = await window.firebaseGet(productsRef);
    const products = snapshot.val() || {};
    
    let calculatedSubtotal = 0;
    
    // Validar cada item del carrito
    for (const cartItem of cartItems) {
      const productId = cartItem.id || cartItem.name;
      let product = null;
      
      // Buscar producto por ID o nombre
      for (const key in products) {
        const p = products[key];
        if (p.id === productId || p.name === cartItem.name) {
          product = p;
          break;
        }
      }
      
      if (!product) {
        console.warn(`Producto no encontrado: ${cartItem.name}`);
        continue;
      }
      
      // Verificar que el precio coincida (con tolerancia de 1 peso por redondeo)
      const expectedPrice = product.price || 0;
      const receivedPrice = cartItem.price || 0;
      
      if (Math.abs(expectedPrice - receivedPrice) > 1) {
        return { 
          valid: false, 
          reason: `El precio de "${cartItem.name}" no coincide. Precio esperado: $${expectedPrice}, recibido: $${receivedPrice}` 
        };
      }
      
      calculatedSubtotal += expectedPrice * (cartItem.quantity || 1);
    }
    
    // Agregar costo de salsas adicionales al subtotal calculado
    if (orderData.sauces && orderData.sauces.extraSauces && Array.isArray(orderData.sauces.extraSauces)) {
      orderData.sauces.extraSauces.forEach(sauce => {
        const sauceQuantity = sauce.quantity || 0;
        const saucePrice = sauce.price || 0;
        calculatedSubtotal += sauceQuantity * saucePrice;
      });
    }
    
    // Verificar subtotal (con tolerancia de 100 pesos por redondeo)
    const receivedSubtotal = orderData.subtotal || 0;
    if (Math.abs(calculatedSubtotal - receivedSubtotal) > 100) {
      return { 
        valid: false, 
        reason: `El subtotal no coincide. Esperado: $${Math.round(calculatedSubtotal)}, recibido: $${Math.round(receivedSubtotal)}` 
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error al validar precios:', error);
    // En caso de error, permitir pero registrar
    return { valid: true, warning: true };
  }
}

// Actualizar items de un pedido existente (para edición desde admin)
async function updateOrderItems(orderId, newItems, newObservations) {
  if (!window.firebaseDB) {
    throw new Error('Firebase no está inicializado');
  }

  const orderRef = window.firebaseRef(window.firebaseDB, `orders/${orderId}`);
  const orderSnapshot = await window.firebaseGet(orderRef);
  const order = orderSnapshot.val();

  if (!order) {
    throw new Error('Pedido no encontrado');
  }

  // Recalcular subtotal basado en los nuevos items
  let newSubtotal = 0;
  newItems.forEach(item => {
    item.subtotal = (item.price || 0) * (item.quantity || 1);
    newSubtotal += item.subtotal;
  });

  // Recalcular total (subtotal + delivery - descuento + propina)
  const deliveryCost = order.deliveryCost || 0;
  const discount = order.discount || 0;
  const tip = order.tip || 0;
  const newTotal = newSubtotal + deliveryCost - discount + tip;

  // Agregar nota al historial
  const historyEntry = {
    status: order.status,
    timestamp: Date.now(),
    note: 'Pedido editado por administrador'
  };

  await window.firebaseSet(orderRef, {
    ...order,
    items: newItems,
    observations: newObservations !== undefined ? newObservations : order.observations,
    subtotal: newSubtotal,
    total: newTotal,
    lastEditedAt: Date.now(),
    statusHistory: [
      ...(order.statusHistory || []),
      historyEntry
    ]
  });

  return { subtotal: newSubtotal, total: newTotal };
}

// Eliminar pedido (solo para admin)
async function deleteOrder(orderId) {
  if (!window.firebaseDB) {
    throw new Error('Firebase no está inicializado');
  }

  const orderRef = window.firebaseRef(window.firebaseDB, `orders/${orderId}`);
  await window.firebaseRemove(orderRef);
}

// Exportar funciones
window.createOrder = createOrder;
window.getOrderById = getOrderById;
window.listenToOrder = listenToOrder;
window.updateOrderStatus = updateOrderStatus;
window.validateOrder = validateOrder;
window.getAllOrders = getAllOrders;
window.listenToAllOrders = listenToAllOrders;
window.formatEstimatedTime = formatEstimatedTime;
window.getStatusVisualInfo = getStatusVisualInfo;
window.canCreateOrder = canCreateOrder;
window.validateOrderPattern = validateOrderPattern;
window.validateOrderQuantities = validateOrderQuantities;
window.validateOrderPrices = validateOrderPrices;
window.generateOrderId = generateOrderId;
window.updateOrderItems = updateOrderItems;
window.deleteOrder = deleteOrder;
window.resetRateLimit = resetRateLimit;
window.ORDER_STATUS = ORDER_STATUS;
