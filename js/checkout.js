// ========== FUNCIONES DE CHECKOUT ==========

// Función para obtener datos del checkout
function getCheckoutData() {
  const fullName = document.getElementById('fullName')?.value || '';
  const phone = document.getElementById('customerPhone')?.value || '';
  const paymentMethod = document.getElementById('paymentMethod')?.value || 'efectivo';
  const btnRetiro = document.getElementById('btnRetiro');
  const deliveryType = btnRetiro && (btnRetiro.classList.contains('bg-white') || btnRetiro.classList.contains('dark:bg-surface-dark')) ? 'retiro' : 'despacho';
  const deliveryAddress = document.getElementById('deliveryAddress')?.value || '';
  const checkoutTotal = document.getElementById('checkoutTotal')?.textContent.trim().replace('$', '').replace(',', '') || '0.00';
  const sauces = getCartSauces();
  const observations = document.getElementById('customerObservations')?.value || '';
  
  // Honeypot fields (deben estar vacíos)
  const website = document.getElementById('website')?.value || '';
  const email = document.getElementById('email')?.value || '';
  
  return {
    fullName,
    phone,
    paymentMethod,
    deliveryType,
    deliveryAddress,
    total: parseFloat(checkoutTotal) || 0.00,
    sauces: sauces,
    observations: observations,
    website: website,
    email: email
  };
}

// Función para generar el mensaje de WhatsApp
function generateWhatsAppMessage() {
  const cartItems = getCartItems();
  const cartTotals = getCartTotals();
  const checkoutData = getCheckoutData();
  
  let message = '*🍣 NUEVO PEDIDO - SPEED ROLL 🍣*\n\n';
  
  // Información del cliente
  message += '*👤 CLIENTE:*\n';
  message += `${checkoutData.fullName || 'No especificado'}\n\n`;
  
  // Detalle del pedido
  message += '*📦 PEDIDO:*\n';
  if (cartItems.length === 0) {
    message += 'Carrito vacío\n';
  } else {
    cartItems.forEach((item, index) => {
      message += `${index + 1}. ${item.name} x${item.quantity}\n`;
      
      // Mostrar personalizaciones detalladas
      if (item.customizations) {
        const customParts = [];
        
        // Salsas
        if (item.customizations.sauces && item.customizations.sauces.length > 0) {
          customParts.push(`   🧂 Salsas: ${item.customizations.sauces.join(', ')}`);
        }
        
        // Extras
        if (item.customizations.extras && item.customizations.extras.length > 0) {
          const extraNames = item.customizations.extras.map(e => {
            const names = { 'aguacate': 'Aguacate Extra', 'tempura': 'Hojuelas Tempura', 'jengibre': 'Jengibre Fresco' };
            return names[e] || e;
          });
          customParts.push(`   ➕ Extras: ${extraNames.join(', ')}`);
        }
        
        // Instrucciones especiales
        if (item.customizations.instructions && item.customizations.instructions.trim()) {
          customParts.push(`   📝 Instrucciones: ${item.customizations.instructions}`);
        }
        
        if (customParts.length > 0) {
          message += customParts.join('\n') + '\n';
        }
      } else if (item.extras) {
        // Si no hay customizations detalladas, mostrar extras generales
        message += `   ➜ ${item.extras}\n`;
      }
      
      message += `   💰 $${Math.round(item.price)} c/u = $${Math.round(item.subtotal)}\n\n`;
    });
  }
  
  // Salsas principales por producto
  if (checkoutData.sauces && checkoutData.sauces.productMainSauces && checkoutData.sauces.productMainSauces.length > 0) {
    message += '\n*🧂 SALSAS PRINCIPALES:*\n';
    const sauceNames = {
      'soya': 'Salsa Soya',
      'agridulce': 'Salsa Agridulce'
    };
    
    checkoutData.sauces.productMainSauces.forEach(item => {
      message += `${item.productName}: ${sauceNames[item.sauce] || item.sauce}\n`;
    });
  }
  
  // Salsas adicionales con cantidades
  if (checkoutData.sauces && checkoutData.sauces.extraSauces && checkoutData.sauces.extraSauces.length > 0) {
    message += '\n*🧂 SALSAS ADICIONALES:*\n';
    
    checkoutData.sauces.extraSauces.forEach(sauce => {
      const sauceName = sauce.name || sauce.type || sauce.id;
      const totalPrice = sauce.quantity * sauce.price;
      message += `${sauceName} x${sauce.quantity} = $${totalPrice.toFixed(0)}\n`;
    });
  }
  
  // Observaciones del cliente
  if (checkoutData.observations && checkoutData.observations.trim()) {
    message += '\n*📝 OBSERVACIONES DEL CLIENTE:*\n';
    message += `${checkoutData.observations.trim()}\n`;
  }
  
  // Resumen de totales
  message += '\n*💰 RESUMEN:*\n';
  message += `Subtotal: $${Math.round(cartTotals.subtotal)}\n`;
  
  // Información de entrega
  message += '\n*🚚 ENTREGA:*\n';
  if (checkoutData.deliveryType === 'despacho') {
    message += `Tipo: Despacho a domicilio\n`;
    if (checkoutData.deliveryAddress) {
      message += `Dirección: ${checkoutData.deliveryAddress}\n`;
    }
    message += `Costo de despacho: $3.000\n`;
  } else {
    message += `Tipo: Retiro en local\n`;
  }
  
  // Medio de pago
  message += '\n*💳 PAGO:*\n';
  const paymentMethods = {
    'efectivo': 'Efectivo',
    'tarjeta': 'Tarjeta',
    'transferencia': 'Transferencia'
  };
  message += `${paymentMethods[checkoutData.paymentMethod] || checkoutData.paymentMethod}\n`;
  
  // Total final
  message += `\n*✅ TOTAL: $${Math.round(checkoutData.total)}*\n\n`;
  
  message += '_Gracias por tu pedido_ 🎉';
  
  return message;
}

// Función para generar mensaje de WhatsApp desde datos del pedido
function generateWhatsAppMessageFromOrder(orderData, checkoutData) {
  let message = '*🍣 NUEVO PEDIDO - SPEED ROLL 🍣*\n\n';
  
  // Información del cliente
  message += '*👤 CLIENTE:*\n';
  message += `${checkoutData.fullName || orderData.cliente?.nombre || 'No especificado'}\n\n`;
  
  // Detalle del pedido
  message += '*📦 PEDIDO:*\n';
  if (!orderData.items || orderData.items.length === 0) {
    message += 'Carrito vacío\n';
  } else {
    orderData.items.forEach((item, index) => {
      message += `${index + 1}. ${item.name} x${item.quantity || 1}\n`;
      
      // Mostrar personalizaciones detalladas
      if (item.customizations) {
        const customParts = [];
        
        // Salsas
        if (item.customizations.sauces && item.customizations.sauces.length > 0) {
          customParts.push(`   🧂 Salsas: ${item.customizations.sauces.join(', ')}`);
        }
        
        // Extras
        if (item.customizations.extras && item.customizations.extras.length > 0) {
          const extraNames = item.customizations.extras.map(e => {
            const names = { 'aguacate': 'Aguacate Extra', 'tempura': 'Hojuelas Tempura', 'jengibre': 'Jengibre Fresco' };
            return names[e] || e;
          });
          customParts.push(`   ➕ Extras: ${extraNames.join(', ')}`);
        }
        
        // Instrucciones especiales
        if (item.customizations.instructions && item.customizations.instructions.trim()) {
          customParts.push(`   📝 Instrucciones: ${item.customizations.instructions}`);
        }
        
        if (customParts.length > 0) {
          message += customParts.join('\n') + '\n';
        }
      } else if (item.extras) {
        // Si no hay customizations detalladas, mostrar extras generales
        message += `   ➜ ${item.extras}\n`;
      }
      
      const itemPrice = item.price || 0;
      const itemQuantity = item.quantity || 1;
      const itemSubtotal = item.subtotal || (itemPrice * itemQuantity);
      message += `   💰 $${Math.round(itemPrice)} c/u = $${Math.round(itemSubtotal)}\n\n`;
    });
  }
  
  // Salsas principales por producto
  const sauces = checkoutData.sauces || orderData.sauces || {};
  if (sauces.productMainSauces && sauces.productMainSauces.length > 0) {
    message += '\n*🧂 SALSAS PRINCIPALES:*\n';
    const sauceNames = {
      'soya': 'Salsa Soya',
      'agridulce': 'Salsa Agridulce'
    };
    
    sauces.productMainSauces.forEach(item => {
      message += `${item.productName}: ${sauceNames[item.sauce] || item.sauce}\n`;
    });
  }
  
  // Salsas adicionales con cantidades
  if (sauces.extraSauces && sauces.extraSauces.length > 0) {
    message += '\n*🧂 SALSAS ADICIONALES:*\n';
    
    sauces.extraSauces.forEach(sauce => {
      const sauceName = sauce.name || sauce.type || sauce.id;
      const totalPrice = sauce.quantity * sauce.price;
      message += `${sauceName} x${sauce.quantity} = $${totalPrice.toFixed(0)}\n`;
    });
  }
  
  // Observaciones del cliente
  const observations = checkoutData.observations || orderData.observations || '';
  if (observations && observations.trim()) {
    message += '\n*📝 OBSERVACIONES DEL CLIENTE:*\n';
    message += `${observations.trim()}\n`;
  }
  
  // Resumen de totales
  message += '\n*💰 RESUMEN:*\n';
  message += `Subtotal: $${Math.round(orderData.subtotal || 0)}\n`;
  
  // Información de entrega
  message += '\n*🚚 ENTREGA:*\n';
  const deliveryType = checkoutData.deliveryType || orderData.deliveryType || 'retiro';
  if (deliveryType === 'despacho') {
    message += `Tipo: Despacho a domicilio\n`;
    const deliveryAddress = checkoutData.deliveryAddress || orderData.cliente?.direccion || '';
    if (deliveryAddress) {
      message += `Dirección: ${deliveryAddress}\n`;
    }
    message += `Costo de despacho: $3.000\n`;
  } else {
    message += `Tipo: Retiro en local\n`;
  }
  
  // Medio de pago
  message += '\n*💳 PAGO:*\n';
  const paymentMethods = {
    'efectivo': 'Efectivo',
    'tarjeta': 'Tarjeta',
    'transferencia': 'Transferencia'
  };
  const paymentMethod = checkoutData.paymentMethod || orderData.paymentMethod || 'efectivo';
  message += `${paymentMethods[paymentMethod] || paymentMethod}\n`;
  
  // Total final
  message += `\n*✅ TOTAL: $${Math.round(orderData.total || 0)}*\n\n`;
  
  message += '_Gracias por tu pedido_ 🎉';
  
  return message;
}

// Función para enviar mensaje por WhatsApp con enlaces de tracking y validación
async function sendWhatsAppMessageWithOrder(phoneNumber, orderId, checkoutData) {
  // Intentar obtener datos desde sessionStorage primero (más rápido y confiable)
  const orderConfirmationData = sessionStorage.getItem('orderConfirmationData');
  let orderData = null;
  
  if (orderConfirmationData) {
    try {
      const parsed = JSON.parse(orderConfirmationData);
      // Solo usar si es del mismo pedido
      if (parsed.orderId === orderId) {
        orderData = {
          items: parsed.items || [],
          subtotal: parsed.subtotal || 0,
          deliveryCost: parsed.deliveryCost || 0,
          total: parsed.total || 0,
          deliveryType: parsed.deliveryType || checkoutData.deliveryType || 'retiro',
          cliente: {
            nombre: parsed.cliente?.nombre || checkoutData.fullName || '',
            direccion: parsed.cliente?.direccion || checkoutData.deliveryAddress || ''
          },
          paymentMethod: parsed.paymentMethod || checkoutData.paymentMethod || 'efectivo',
          observations: parsed.observations || checkoutData.observations || '',
          sauces: parsed.sauces || checkoutData.sauces || {}
        };
      }
    } catch (e) {
      console.error('Error al parsear orderConfirmationData:', e);
    }
  }
  
  // Si no hay datos guardados, intentar obtener desde Firebase
  if (!orderData && typeof getOrderById === 'function') {
    try {
      const order = await getOrderById(orderId);
      if (order) {
        orderData = order;
      }
    } catch (error) {
      console.error('Error al obtener pedido desde Firebase:', error);
    }
  }
  
  // Generar mensaje con los datos disponibles
  let message;
  if (orderData && orderData.items && orderData.items.length > 0) {
    message = generateWhatsAppMessageFromOrder(orderData, checkoutData);
  } else {
    // Si no hay datos, intentar usar checkoutData directamente
    if (checkoutData && checkoutData.fullName) {
      // Construir orderData mínimo desde checkoutData
      orderData = {
        items: [],
        subtotal: checkoutData.total || 0,
        deliveryCost: checkoutData.deliveryType === 'despacho' ? 3000 : 0,
        total: checkoutData.total || 0,
        deliveryType: checkoutData.deliveryType || 'retiro',
        cliente: {
          nombre: checkoutData.fullName || '',
          direccion: checkoutData.deliveryAddress || ''
        },
        paymentMethod: checkoutData.paymentMethod || 'efectivo',
        observations: checkoutData.observations || '',
        sauces: checkoutData.sauces || {}
      };
      message = generateWhatsAppMessageFromOrder(orderData, checkoutData);
    } else {
      // Último recurso: mensaje básico
      message = '*🍣 NUEVO PEDIDO - SPEED ROLL 🍣*\n\n';
      message += '*👤 CLIENTE:*\n';
      message += `${checkoutData?.fullName || 'No especificado'}\n\n`;
      message += '*📦 PEDIDO:*\n';
      message += 'Información no disponible\n\n';
      message += '*💰 RESUMEN:*\n';
      message += `Subtotal: $0\n\n`;
      message += '*🚚 ENTREGA:*\n';
      message += `Tipo: ${checkoutData?.deliveryType === 'despacho' ? 'Despacho a domicilio' : 'Retiro en local'}\n\n`;
      message += '*💳 PAGO:*\n';
      message += `${checkoutData?.paymentMethod || 'Efectivo'}\n\n`;
      message += '*✅ TOTAL: $0*\n\n';
      message += '_Gracias por tu pedido_ 🎉';
    }
  }
  
  // Agregar información del pedido
  message += `\n*📋 NÚMERO DE PEDIDO: ${orderId}*\n`;
  
  sendWhatsAppMessageWithContent(phoneNumber, orderId, message);
}

// Función auxiliar para enviar el mensaje
function sendWhatsAppMessageWithContent(phoneNumber, orderId, message) {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = phoneNumber 
    ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`
    : `https://web.whatsapp.com/send?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}

// Función para enviar mensaje por WhatsApp (mantener compatibilidad)
function sendWhatsAppMessage(phoneNumber = null) {
  const message = generateWhatsAppMessage();
  const encodedMessage = encodeURIComponent(message);
  
  // Si no se proporciona número, usar WhatsApp Web (el usuario elegirá el contacto)
  // Para usar con número específico: sendWhatsAppMessage('+56912345678')
  const whatsappUrl = phoneNumber 
    ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`
    : `https://web.whatsapp.com/send?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}

// Función para manejar el pago en checkout
async function handlePayment() {
  // Validar que haya información mínima
  const checkoutData = getCheckoutData();
  const cartItems = getCartItems();
  
  // Validación de honeypot fields (detección de bots)
  if (checkoutData.website && checkoutData.website.trim() !== '') {
    console.warn('Bot detectado: campo website fue llenado');
    return; // Silenciosamente rechazar sin mostrar mensaje
  }
  
  if (checkoutData.email && checkoutData.email.trim() !== '') {
    console.warn('Bot detectado: campo email fue llenado');
    return; // Silenciosamente rechazar sin mostrar mensaje
  }
  
  // Validación de nombre
  if (!checkoutData.fullName || checkoutData.fullName.trim() === '') {
    notifyWarning('Por favor, ingresa tu nombre completo');
    return;
  }
  
  // Validación de teléfono obligatorio
  if (!checkoutData.phone || checkoutData.phone.trim() === '') {
    notifyWarning('Por favor, ingresa tu número de teléfono');
    return;
  }
  
  // Validar formato de teléfono chileno
  const phoneRegex = /^\+569[0-9]{8}$/;
  if (!phoneRegex.test(checkoutData.phone.trim())) {
    notifyWarning('Por favor, ingresa un número de teléfono válido en formato +56912345678');
    return;
  }
  
  // Validación de carrito
  if (cartItems.length === 0) {
    notifyWarning('Tu carrito está vacío');
    return;
  }
  
  // Validación de dirección si es delivery
  if (checkoutData.deliveryType === 'despacho') {
    if (!checkoutData.deliveryAddress || checkoutData.deliveryAddress.trim() === '') {
      notifyWarning('Por favor, ingresa la dirección de despacho');
      return;
    }
    if (checkoutData.deliveryAddress.trim().length < 10) {
      notifyWarning('Por favor, ingresa una dirección más completa (mínimo 10 caracteres)');
      return;
    }
  }
  
  // Validación de observaciones
  if (checkoutData.observations && checkoutData.observations.length > 500) {
    notifyWarning('Las observaciones no pueden exceder 500 caracteres');
    return;
  }
  
  // Validar límites de cantidad
  const quantityValidation = validateOrderQuantities(cartItems);
  if (!quantityValidation.valid) {
    notifyWarning(quantityValidation.reason);
    return;
  }
  
  // Validar patrones sospechosos
  const patternValidation = validateOrderPattern(checkoutData);
  if (!patternValidation.valid) {
    notifyError(patternValidation.reason);
    return;
  }
  
  // Verificar rate limiting mejorado
  const rateLimitCheck = canCreateOrder();
  if (!rateLimitCheck.allowed) {
    notifyWarning(rateLimitCheck.reason);
    return;
  }
  
  // Calcular totales correctamente antes de validar y crear el pedido
  const cartTotals = getCartTotals();
  const deliveryCost = checkoutData.deliveryType === 'despacho' ? 3000 : 0;
  const subtotal = cartTotals.subtotal || 0;
  const total = subtotal + deliveryCost;
  
  // Preparar orderData con subtotal para validación
  const orderDataForValidation = {
    ...checkoutData,
    subtotal: subtotal,
    deliveryCost: deliveryCost,
    total: total
  };
  
  // Validar precios antes de crear el pedido
  const priceValidation = await validateOrderPrices(orderDataForValidation, cartItems);
  if (!priceValidation.valid) {
    notifyError(priceValidation.reason);
    return;
  }
  
  // Mostrar loading
  const confirmButton = document.querySelector('button[onclick="handlePayment()"]');
  const originalButtonText = confirmButton ? confirmButton.innerHTML : '';
  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Procesando...';
  }
  
  try {
    
    // 1. Crear pedido en Firebase
    const orderId = await createOrder({
      fullName: checkoutData.fullName.trim(),
      phone: checkoutData.phone.trim(),
      deliveryAddress: checkoutData.deliveryAddress.trim(),
      deliveryType: checkoutData.deliveryType,
      items: cartItems,
      sauces: checkoutData.sauces,
      observations: checkoutData.observations.trim(),
      paymentMethod: checkoutData.paymentMethod,
      subtotal: subtotal,
      deliveryCost: deliveryCost,
      tip: checkoutData.tip || 0,
      discount: checkoutData.discount || 0,
      total: total
    });
    
    // 2. Limpiar el carrito
    clearCart();
    
    // 3. Limpiar formulario de checkout (verificar que los elementos existan)
    try {
      const fullNameInput = document.getElementById('fullName');
      const customerPhoneInput = document.getElementById('customerPhone');
      const paymentMethodInput = document.getElementById('paymentMethod');
      const deliveryAddressInput = document.getElementById('deliveryAddress');
      const customerObservationsInput = document.getElementById('customerObservations');
      
      if (fullNameInput) fullNameInput.value = '';
      if (customerPhoneInput) customerPhoneInput.value = '';
      if (paymentMethodInput) paymentMethodInput.value = 'efectivo';
      if (deliveryAddressInput) deliveryAddressInput.value = '';
      if (customerObservationsInput) customerObservationsInput.value = '';
      
      // Resetear a retiro solo si la función existe
      if (typeof toggleDeliveryOption === 'function') {
        toggleDeliveryOption('retiro');
      }
      
      // Limpiar salsas del carrito
      const productMainSauceSelects = document.querySelectorAll('.product-main-sauce');
      productMainSauceSelects.forEach(select => {
        if (select) select.value = '';
      });
      
      const extraSauceInputs = document.querySelectorAll('input[id^="extraSauce_"]');
      extraSauceInputs.forEach(input => {
        if (input) input.value = '0';
      });
    } catch (formError) {
      console.warn('No se pudieron limpiar algunos campos del formulario:', formError);
      // Continuar aunque haya errores al limpiar el formulario
    }
    
    // 4. Guardar datos del pedido para mostrar en página de confirmación y WhatsApp
    const orderConfirmationData = {
      orderId: orderId,
      items: cartItems,
      subtotal: subtotal,
      deliveryCost: deliveryCost,
      total: total,
      deliveryType: checkoutData.deliveryType,
      cliente: {
        nombre: checkoutData.fullName.trim(),
        direccion: checkoutData.deliveryAddress.trim()
      },
      paymentMethod: checkoutData.paymentMethod,
      observations: checkoutData.observations.trim(),
      sauces: checkoutData.sauces || {}
    };
    sessionStorage.setItem('orderConfirmationData', JSON.stringify(orderConfirmationData));
    
    // Guardar ID para tracking
    window.currentOrderId = orderId;
    sessionStorage.setItem('lastOrderId', orderId);
    
    // 5. Navegar primero a la página de confirmación
    router.navigate('confirmation');
    
    // 6. Poblar datos en la página de confirmación inmediatamente
    populateConfirmationPage(orderConfirmationData);
    
    // 7. Abrir WhatsApp después de un pequeño delay para asegurar que la página se muestre
    setTimeout(() => {
      sendWhatsAppMessageWithOrder('+56921922139', orderId, checkoutData);
    }, 300);
    
  } catch (error) {
    console.error('Error al procesar pedido:', error);
    notifyError('Hubo un error al procesar tu pedido. Por favor intenta nuevamente.');
  } finally {
    // Restaurar botón
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.innerHTML = originalButtonText;
    }
  }
}

// Función para alternar entre retiro y despacho
function toggleDeliveryOption(option) {
  const addressSection = document.getElementById('deliveryAddressSection');
  const btnRetiro = document.getElementById('btnRetiro');
  const btnDespacho = document.getElementById('btnDespacho');
  
  if (option === 'despacho') {
    addressSection.classList.remove('hidden');
    btnDespacho.classList.remove('text-gray-500', 'dark:text-gray-400');
    btnDespacho.classList.add('bg-white', 'dark:bg-surface-dark', 'shadow-sm', 'text-primary', 'font-bold');
    btnRetiro.classList.remove('bg-white', 'dark:bg-surface-dark', 'shadow-sm', 'text-primary', 'font-bold');
    btnRetiro.classList.add('text-gray-500', 'dark:text-gray-400', 'font-medium');
    updateCheckoutTotal(true);
  } else {
    addressSection.classList.add('hidden');
    btnRetiro.classList.remove('text-gray-500', 'dark:text-gray-400');
    btnRetiro.classList.add('bg-white', 'dark:bg-surface-dark', 'shadow-sm', 'text-primary', 'font-bold');
    btnDespacho.classList.remove('bg-white', 'dark:bg-surface-dark', 'shadow-sm', 'text-primary', 'font-bold');
    btnDespacho.classList.add('text-gray-500', 'dark:text-gray-400', 'font-medium');
    updateCheckoutTotal(false);
  }
}

// Función para actualizar el total en checkout
function updateCheckoutTotal(hasDelivery) {
  // Calcular el total real del carrito
  const cartItems = getCartItems();
  let baseTotal = 0;
  cartItems.forEach(item => {
    baseTotal += item.subtotal;
  });
  
  // Agregar costo de salsas adicionales (dinámicas)
  let extraSaucesTotal = 0;
  const extraSauceInputs = document.querySelectorAll('input[id^="extraSauce_"]');
  extraSauceInputs.forEach(input => {
    const quantity = parseInt(input.value) || 0;
    const price = parseFloat(input.dataset.saucePrice) || 0;
    extraSaucesTotal += quantity * price;
  });
  baseTotal += extraSaucesTotal;
  
  const deliveryCost = 3000;
  const totalElement = document.getElementById('checkoutTotal');
  
  if (hasDelivery) {
    const newTotal = baseTotal + deliveryCost;
    if (totalElement) {
      totalElement.textContent = `$${Math.round(newTotal)}`;
    }
  } else {
    if (totalElement) {
      totalElement.textContent = `$${Math.round(baseTotal)}`;
    }
  }
}

// Función para actualizar la visualización de salsas en el checkout
function updateCheckoutSauces() {
  const checkoutSaucesContainer = document.getElementById('checkoutSaucesSection');
  if (!checkoutSaucesContainer) return;
  
  const sauces = getCartSauces();
  let html = '';
  
  // Mostrar salsas principales por producto
  if (sauces.productMainSauces && sauces.productMainSauces.length > 0) {
    html += '<div class="mb-3">';
    html += '<p class="text-xs font-medium text-[#836967] dark:text-zinc-400 mb-2">Salsas Principales:</p>';
    const sauceNames = {
      'soya': 'Salsa Soya',
      'agridulce': 'Salsa Agridulce'
    };
    sauces.productMainSauces.forEach(item => {
      html += `<div class="flex items-center justify-between text-sm mb-1">
        <span class="text-[#171212] dark:text-white">${item.productName}</span>
        <span class="text-[#836967] dark:text-zinc-400">${sauceNames[item.sauce] || item.sauce}</span>
      </div>`;
    });
    html += '</div>';
  }
  
  // Mostrar salsas adicionales con cantidades y precios (dinámicas)
  if (sauces.extraSauces && sauces.extraSauces.length > 0) {
    html += '<div>';
    html += '<p class="text-xs font-medium text-[#836967] dark:text-zinc-400 mb-2">Salsas Adicionales:</p>';
    sauces.extraSauces.forEach(sauce => {
      const sauceName = sauce.name || sauce.type || sauce.id;
      const totalPrice = sauce.quantity * sauce.price;
      html += `<div class="flex items-center justify-between text-sm mb-1">
        <span class="text-[#171212] dark:text-white">${sauceName} x${sauce.quantity}</span>
        <span class="text-[#836967] dark:text-zinc-400 font-medium">$${totalPrice.toFixed(0)}</span>
      </div>`;
    });
    html += '</div>';
  }
  
  if (html === '') {
    checkoutSaucesContainer.innerHTML = '<p class="text-xs text-gray-400 dark:text-gray-500">No hay salsas seleccionadas</p>';
  } else {
    checkoutSaucesContainer.innerHTML = html;
  }
}

// Función para poblar la página de confirmación con los datos del pedido
function populateConfirmationPage(orderData) {
  // Actualizar número de pedido
  const orderIdElement = document.getElementById('confirmationOrderId');
  if (orderIdElement) {
    orderIdElement.textContent = `Pedido #${orderData.orderId}`;
  }
  
  // Calcular y mostrar tiempo estimado
  const estimatedMinutes = orderData.deliveryType === 'retiro' ? '20-30' : '35-45';
  const estimatedTimeElement = document.getElementById('confirmationEstimatedTime');
  if (estimatedTimeElement) {
    estimatedTimeElement.textContent = `Llega en ${estimatedMinutes} min`;
  }
  
  // Generar lista de items
  const itemsListElement = document.getElementById('confirmationItemsList');
  if (itemsListElement && orderData.items) {
    let itemsHTML = '';
    
    // Items del pedido
    orderData.items.forEach(item => {
      itemsHTML += `
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <span class="text-primary font-bold">${item.quantity}x</span>
            <p class="text-[#181112] dark:text-white font-medium">${escapeHtml(item.name)}</p>
          </div>
          <p class="text-[#181112] dark:text-white font-semibold">$${Math.round(item.subtotal).toLocaleString()}</p>
        </div>
      `;
    });
    
    // Costo de envío (solo si es despacho)
    if (orderData.deliveryType === 'despacho' && orderData.deliveryCost > 0) {
      itemsHTML += `
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <span class="text-primary font-bold">1x</span>
            <p class="text-[#181112] dark:text-white font-medium">Envío</p>
          </div>
          <p class="text-[#181112] dark:text-white font-semibold">$${Math.round(orderData.deliveryCost).toLocaleString()}</p>
        </div>
      `;
    }
    
    itemsListElement.innerHTML = itemsHTML;
  }
  
  // Actualizar total
  const totalElement = document.getElementById('confirmationTotal');
  if (totalElement) {
    totalElement.textContent = `$${Math.round(orderData.total).toLocaleString()}`;
  }
}

// Función auxiliar para escapar HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
