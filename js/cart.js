// ========== VARIABLES GLOBALES PARA CARRITO ==========

// Variable para prevenir doble agregado en la misma llamada
let isAddingToCart = false;

// Variable global para rastrear botones que están siendo procesados
const processingButtons = new Set();

// ========== FUNCIONES DEL CARRITO ==========

// Función para agregar producto directamente al carrito desde el menú (sin personalizaciones)
function addToCartDirect(button, event) {
  // Prevenir propagación SIEMPRE, incluso si event es undefined
  if (event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
  
  // Crear un ID único para este botón basado en su posición en el DOM
  const buttonId = button.outerHTML.length + Date.now();
  
  // Verificar si el botón está deshabilitado o ya está procesándose
  if (button.disabled || processingButtons.has(buttonId)) {
    return false;
  }
  
  // Marcar el botón como procesando INMEDIATAMENTE
  processingButtons.add(buttonId);
  button.dataset.processing = 'true';
  
  // Obtener el contenedor del item (el div padre que contiene nombre y precio)
  const itemContainer = button.closest('.flex.flex-col.gap-2, .flex.flex-col.group');
  if (!itemContainer) {
    delete button.dataset.processing;
    return;
  }
  
  // Obtener nombre y precio del producto
  const nameEl = itemContainer.querySelector('h3');
  const priceEl = itemContainer.querySelector('p.text-\\[\\#836967\\].dark\\:text-zinc-400');
  
  if (!nameEl || !priceEl) {
    delete button.dataset.processing;
    return;
  }
  
  const productName = nameEl.textContent.trim();
  const priceText = priceEl.textContent.trim().replace('$', '').replace(',', '');
  const price = parseFloat(priceText) || 0;
  
  if (!productName || price === 0) {
    delete button.dataset.processing;
    return;
  }
  
  // Verificar stock antes de agregar
  getItemStockStatus(productName, (isInStock) => {
    // Función de limpieza
    const cleanup = () => {
      setTimeout(() => {
        delete button.dataset.processing;
        processingButtons.delete(buttonId);
      }, 500);
    };
    
    if (!isInStock) {
      alert('Este producto está actualmente agotado');
      cleanup();
      return;
    }
    
    // Continuar con la lógica de agregar al carrito
    addProductToCartInternal(productName, price);
    
    // Limpiar el flag después de un breve delay
    cleanup();
  });
  
  // Retornar false para prevenir acciones por defecto
  return false;
}

// Función interna para agregar producto al carrito (separada para reutilización)
function addProductToCartInternal(productName, price) {
  // Prevenir doble ejecución simultánea
  if (isAddingToCart) {
    console.log('Ya se está agregando un producto al carrito, ignorando duplicado');
    return;
  }
  
  // Marcar que estamos agregando
  isAddingToCart = true;
  
  // Obtener el contenedor del carrito
  const cartContainer = document.querySelector('#page-orders main .flex.flex-col.gap-4');
  if (!cartContainer) {
    isAddingToCart = false;
    return;
  }
  
  // Verificar si el producto ya está en el carrito antes de agregar (evitar duplicados)
  const existingItems = cartContainer.querySelectorAll('.bg-white.dark\\:bg-zinc-900');
  for (let item of existingItems) {
    const nameEl = item.querySelector('p.text-base.font-bold');
    if (nameEl && nameEl.textContent.trim() === productName) {
      // El producto ya existe en el carrito, solo incrementar cantidad
      const quantityInput = item.querySelector('input[type="number"]');
      if (quantityInput) {
        const currentQuantity = parseInt(quantityInput.value) || 1;
        quantityInput.value = currentQuantity + 1;
        updateCartTotals();
        updateCartBadges();
        isAddingToCart = false;
        return; // Salir sin agregar duplicado
      }
    }
  }
  
  // Buscar el producto en Firebase para obtener su imagen
  loadProductsFromFirebase((products) => {
    const product = products.find(p => p.name === productName);
    let productImage = '';
    
    if (product && product.imageUrl) {
      const imageUrlRaw = product.imageUrl || '';
      const hasImage = imageUrlRaw.trim() !== '' && (
        imageUrlRaw.startsWith('http://') || 
        imageUrlRaw.startsWith('https://') || 
        imageUrlRaw.startsWith('data:image')
      );
      if (hasImage) {
        productImage = imageUrlRaw;
      } else {
        productImage = getPlaceholderImage(productName, product.category || '');
      }
    } else {
      productImage = getPlaceholderImage(productName, '');
    }
    
    // Crear el elemento del carrito
    const cartItem = document.createElement('div');
    cartItem.className = 'flex items-center gap-4 bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-sm border border-gray-50 dark:border-zinc-800 justify-between';
    cartItem.innerHTML = `
    <div class="flex items-center gap-4">
      <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-20 shadow-inner bg-gray-200 dark:bg-zinc-800" style="background-image: url('${productImage}'); background-color: #b5352c;"></div>
      <div class="flex flex-col justify-center flex-1">
        <p class="text-[#171212] dark:text-white text-base font-bold leading-tight line-clamp-1">${productName}</p>
        <p class="text-[#836967] dark:text-zinc-400 text-sm font-medium mt-1">$${Math.round(price)}</p>
        <!-- Selector de Salsa Principal para este producto -->
        <select class="product-main-sauce mt-2 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-background-dark text-[#171212] dark:text-white h-9 px-3 text-xs focus:outline-0 focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer" style="background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27%3E%3Cpath fill=%27%23333%27 d=%27M6 9L1 4h10L6 9z%27/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 0.5rem center; background-size: 10px; padding-right: 2rem;">
          <option value="">Sin salsa</option>
          <option value="soya">Salsa Soya</option>
          <option value="agridulce">Salsa Agridulce</option>
        </select>
      </div>
    </div>
    <div class="shrink-0 flex items-center gap-3">
      <div class="flex flex-col items-center gap-2 text-[#171212] dark:text-white">
        <button onclick="cartFunctions.incrementQuantity(this, event); return false;" class="text-white flex h-7 w-7 items-center justify-center rounded-lg bg-primary cursor-pointer shadow-sm shadow-primary/30">
          <span class="material-symbols-outlined text-sm">add</span>
        </button>
        <input class="text-base font-bold w-6 p-0 text-center bg-transparent focus:outline-0 focus:ring-0 focus:border-none border-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-[#171212] dark:text-white" type="number" value="1"/>
        <button onclick="cartFunctions.decrementQuantity(this, event); return false;" class="text-[#171212] dark:text-white flex h-7 w-7 items-center justify-center rounded-lg bg-[#f4f1f1] dark:bg-zinc-800 cursor-pointer">
          <span class="material-symbols-outlined text-sm">remove</span>
        </button>
      </div>
      <button onclick="cartFunctions.removeItem(this)" class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer" title="Eliminar del carrito">
        <span class="material-symbols-outlined text-sm">delete</span>
      </button>
    </div>
  `;
  
  // Insertar antes de la tarjeta de sugerencia si existe, o al final
  const suggestionCard = cartContainer.querySelector('.border-dashed');
  if (suggestionCard) {
    cartContainer.insertBefore(cartItem, suggestionCard);
  } else {
    cartContainer.appendChild(cartItem);
  }
  
  // Actualizar totales del carrito
  updateCartTotals();
  
  // Actualizar badges
  updateCartBadges();
  
  // Liberar el flag DESPUÉS de completar la inserción
  isAddingToCart = false;
  
  // Navegar automáticamente al carrito
  router.navigate('orders');
  });
}

// Función para agregar producto al carrito (con personalizaciones desde página de producto)
function addProductToCart() {
  const productName = document.querySelector('#page-product h1')?.textContent.trim() || 'El Burger Katsu Rey';
  const quantity = parseInt(document.getElementById('productQuantity')?.textContent || '1');
  
  // Calcular precio total
  let totalPrice = baseProductPrice;
  const saucesList = [];
  
  document.querySelectorAll('.sauce-option.selected').forEach(option => {
    const sauceName = option.querySelector('p.font-bold')?.textContent.trim() || '';
    const price = parseFloat(option.dataset.price) || 0;
    totalPrice += price;
    if (sauceName) saucesList.push(sauceName);
  });
  
  const extrasList = [];
  selectedExtras.forEach(extra => {
    totalPrice += extra.price;
    extrasList.push(extra.name);
  });
  
  const finalPrice = totalPrice * quantity;
  
  // Obtener instrucciones especiales
  const instructions = document.getElementById('specialInstructions')?.value.trim() || '';
  
  // Crear resumen de personalizaciones
  let customizationText = '';
  if (saucesList.length > 0) {
    customizationText += saucesList.join(', ');
  }
  if (extrasList.length > 0) {
    if (customizationText) customizationText += ' | ';
    customizationText += extrasList.map(e => {
      const names = { 'aguacate': 'Aguacate Extra', 'tempura': 'Hojuelas Tempura', 'jengibre': 'Jengibre Fresco' };
      return names[e] || e;
    }).join(', ');
  }
  if (instructions) {
    if (customizationText) customizationText += ' | ';
    customizationText += `Instrucciones: ${instructions}`;
  }
  
  // Almacenar las personalizaciones en sessionStorage para que estén disponibles cuando se genere el mensaje de WhatsApp
  // Las personalizaciones se asociarán con el nombre del producto
  const customizationData = {
    sauces: saucesList,
    extras: extrasList.map(e => e.name),
    instructions: instructions
  };
  
  // Guardar en sessionStorage con una clave única basada en timestamp
  const cartItemId = `cart_item_${Date.now()}`;
  sessionStorage.setItem(cartItemId, JSON.stringify({
    productName: productName,
    quantity: quantity,
    price: finalPrice / quantity, // Precio unitario
    customizations: customizationData,
    customizationText: customizationText,
    timestamp: Date.now() // Agregar timestamp para ordenar
  }));
  
  // Por ahora, navegar al carrito (el mensaje de WhatsApp incluirá toda esta info)
  // NOTA: En una implementación completa, aquí agregarías el item al DOM del carrito con data-customizations
  
  // Navegar al carrito directamente
  router.navigate('orders');
}

// Función para contar el total de items en el carrito
function getCartItemCount() {
  const cartContainer = document.querySelector('#page-orders main .flex.flex-col.gap-4');
  if (!cartContainer) return 0;
  
  // Buscar solo items del carrito que tengan selector de salsa principal (excluyendo salsas adicionales)
  // Los items del carrito tienen .product-main-sauce, las salsas adicionales NO
  const sauceSelectors = cartContainer.querySelectorAll('.product-main-sauce');
  let totalCount = 0;
  
  sauceSelectors.forEach(sauceSelector => {
    // Encontrar el contenedor del item del carrito (el div padre con bg-white)
    const cartItem = sauceSelector.closest('.bg-white.dark\\:bg-zinc-900');
    if (cartItem) {
      // Buscar el input de cantidad dentro de este item
      const quantityInput = cartItem.querySelector('input[type="number"]');
      if (quantityInput) {
        const quantity = parseInt(quantityInput.value) || 1;
        totalCount += quantity;
      }
    }
  });
  
  return totalCount;
}

// Función para actualizar los badges del carrito
function updateCartBadges() {
  const itemCount = getCartItemCount();
  const badgeHome = document.getElementById('cartBadgeHome');
  const badgeMenu = document.getElementById('cartBadgeMenu');
  
  // Actualizar badge en home
  if (badgeHome) {
    if (itemCount > 0) {
      badgeHome.textContent = itemCount;
      badgeHome.classList.remove('hidden');
    } else {
      badgeHome.classList.add('hidden');
    }
  }
  
  // Actualizar badge en menu
  if (badgeMenu) {
    if (itemCount > 0) {
      badgeMenu.textContent = itemCount;
      badgeMenu.classList.remove('hidden');
    } else {
      badgeMenu.classList.add('hidden');
    }
  }
}

// Función para obtener los items del carrito desde el DOM
function getCartItems() {
  const cartItems = [];
  const cartContainer = document.querySelector('#page-orders main .flex.flex-col.gap-4');
  
  if (!cartContainer) {
    console.warn('getCartItems: No se encontró el contenedor del carrito');
    return cartItems;
  }
  
  const itemElements = cartContainer.querySelectorAll('.bg-white.dark\\:bg-zinc-900');
  
  if (itemElements.length === 0) {
    console.warn('getCartItems: No se encontraron items en el carrito');
  }
  
  // Obtener todas las personalizaciones almacenadas en sessionStorage
  const storedCustomizations = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('cart_item_')) {
      try {
        const storedItem = JSON.parse(sessionStorage.getItem(key));
        storedCustomizations.push(storedItem);
      } catch (e) {
        console.error('Error parsing stored item:', e);
      }
    }
  }
  
  itemElements.forEach(itemEl => {
    const nameEl = itemEl.querySelector('p.text-base.font-bold');
    const priceEl = itemEl.querySelector('p.text-\\[\\#836967\\].dark\\:text-zinc-400.text-sm');
    const quantityInput = itemEl.querySelector('input[type="number"]');
    const extrasEl = itemEl.querySelector('p.text-\\[10px\\].text-zinc-400');
    
    // Buscar información de personalización almacenada en data attributes
    const customizations = itemEl.dataset.customizations ? JSON.parse(itemEl.dataset.customizations) : null;
    
    if (nameEl && priceEl && quantityInput) {
      const name = nameEl.textContent.trim();
      const priceText = priceEl.textContent.trim().replace('$', '').replace(',', '');
      const price = parseFloat(priceText) || 0;
      const quantity = parseInt(quantityInput.value) || 1;
      const extras = extrasEl ? extrasEl.textContent.trim() : '';
      
      // Buscar personalizaciones almacenadas en sessionStorage que coincidan con este producto
      let storedCustomization = null;
      if (!customizations && storedCustomizations.length > 0) {
        // Buscar la personalización más reciente que coincida con el nombre del producto
        storedCustomization = storedCustomizations
          .filter(item => item.productName === name)
          .sort((a, b) => b.timestamp - a.timestamp)[0];
      }
      
      // Usar customizations de data attribute, sessionStorage, o extras del DOM
      let finalCustomizations = customizations;
      if (!finalCustomizations && storedCustomization && storedCustomization.customizations) {
        finalCustomizations = storedCustomization.customizations;
      }
      
      // Construir información de personalización completa
      let customizationText = '';
      if (finalCustomizations) {
        const parts = [];
        
        // Agregar salsas seleccionadas
        if (finalCustomizations.sauces && finalCustomizations.sauces.length > 0) {
          parts.push(`Salsas: ${finalCustomizations.sauces.join(', ')}`);
        }
        
        // Agregar extras seleccionados
        if (finalCustomizations.extras && finalCustomizations.extras.length > 0) {
          const extraNames = finalCustomizations.extras.map(e => {
            const names = { 'aguacate': 'Aguacate Extra', 'tempura': 'Hojuelas Tempura', 'jengibre': 'Jengibre Fresco' };
            return names[e] || e;
          });
          parts.push(`Extras: ${extraNames.join(', ')}`);
        }
        
        // Agregar instrucciones especiales
        if (finalCustomizations.instructions && finalCustomizations.instructions.trim()) {
          parts.push(`Instrucciones: ${finalCustomizations.instructions}`);
        }
        
        customizationText = parts.join(' | ');
      } else if (extras) {
        // Si no hay customizations detalladas, usar el texto de extras existente
        customizationText = extras;
      }
      
      // Calcular subtotal asegurándose de que price y quantity sean números válidos
      const itemSubtotal = (parseFloat(price) || 0) * (parseInt(quantity) || 1);
      
      if (itemSubtotal === 0) {
        console.warn(`getCartItems: Item "${name}" tiene subtotal 0 (price: ${price}, quantity: ${quantity})`);
      }
      
      cartItems.push({
        name: name,
        price: parseFloat(price) || 0,
        quantity: parseInt(quantity) || 1,
        extras: customizationText || extras,
        subtotal: itemSubtotal,
        customizations: finalCustomizations || null
      });
    }
  });
  
  console.log('getCartItems retornando:', cartItems.length, 'items con subtotal total:', cartItems.reduce((sum, item) => sum + (item.subtotal || 0), 0));
  
  return cartItems;
}

// Función para obtener los totales del carrito
function getCartTotals() {
  // Calcular subtotal directamente desde los items del carrito (no desde el DOM)
  const cartItems = getCartItems();
  let subtotal = 0;
  
  // Debug: verificar que hay items
  if (cartItems.length === 0) {
    console.warn('getCartTotals: No hay items en el carrito');
  }
  
  cartItems.forEach(item => {
    // Asegurar que el subtotal del item esté calculado correctamente
    const itemSubtotal = (item.price || 0) * (item.quantity || 1);
    if (!item.subtotal || item.subtotal === 0) {
      // Si el item no tiene subtotal o es 0, calcularlo
      item.subtotal = itemSubtotal;
    }
    subtotal += item.subtotal;
  });
  
  // Agregar costo de salsas adicionales (dinámicas)
  let extraSaucesTotal = 0;
  const extraSauceInputs = document.querySelectorAll('input[id^="extraSauce_"], select[id^="extraSauce_"]');
  extraSauceInputs.forEach(element => {
    const quantity = parseInt(element.value) || 0;
    const price = parseFloat(element.dataset.saucePrice) || 0;
    extraSaucesTotal += quantity * price;
  });
  subtotal += extraSaucesTotal;
  
  const total = subtotal;
  
  // Debug: log del subtotal calculado
  console.log('getCartTotals calculado:', { subtotal, total, itemsCount: cartItems.length, extraSaucesTotal });
  
  return { subtotal, total };
}

// Función para actualizar los totales del carrito en el footer
function updateCartTotals() {
  const cartItems = getCartItems();
  let subtotal = 0;
  
  cartItems.forEach(item => {
    subtotal += item.subtotal;
  });
  
  // Agregar costo de salsas adicionales (dinámicas)
  let extraSaucesTotal = 0;
  const extraSauceInputs = document.querySelectorAll('input[id^="extraSauce_"]');
  extraSauceInputs.forEach(input => {
    const quantity = parseInt(input.value) || 0;
    const price = parseFloat(input.dataset.saucePrice) || 0;
    extraSaucesTotal += quantity * price;
  });
  subtotal += extraSaucesTotal;
  
  const total = subtotal;
  
  // Actualizar en el DOM
  const subtotalEl = document.querySelector('#page-orders footer .space-y-3 .flex.justify-between.items-center:first-child p.text-right');
  const totalEl = document.querySelector('#page-orders footer p.text-primary.text-2xl');
  
  if (subtotalEl) {
    subtotalEl.textContent = `$${Math.round(subtotal)}`;
  }
  if (totalEl) {
    totalEl.textContent = `$${Math.round(total)}`;
  }
  
  // Actualizar total en checkout si está visible
  const checkoutTotalEl = document.getElementById('checkoutTotal');
  if (checkoutTotalEl) {
    updateCheckoutTotal(document.getElementById('deliveryAddressSection') && !document.getElementById('deliveryAddressSection').classList.contains('hidden'));
  }
  
  // Actualizar visualización de salsas en checkout
  updateCheckoutSauces();
}

// Función para limpiar el carrito
function clearCart() {
  // Limpiar items del carrito eliminando todos los elementos excepto el banner y la sugerencia
  const cartContainer = document.querySelector('#page-orders main .flex.flex-col.gap-4');
  if (cartContainer) {
    // Eliminar todos los items del carrito (elementos con bg-white dark:bg-zinc-900)
    const cartItems = cartContainer.querySelectorAll('.bg-white.dark\\:bg-zinc-900');
    cartItems.forEach(item => {
      item.remove();
    });
  }
  
  // Limpiar personalizaciones almacenadas en sessionStorage
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('cart_item_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
  });
  
  // Actualizar los totales a cero
  const subtotalEl = document.querySelector('#page-orders footer .space-y-3 .flex.justify-between.items-center:first-child p.text-right');
  const totalEl = document.querySelector('#page-orders footer p.text-primary.text-2xl');
  
  if (subtotalEl) {
    subtotalEl.textContent = '$0';
  }
  if (totalEl) {
    totalEl.textContent = '$0';
  }
  
  // Actualizar badges del carrito
  updateCartBadges();
}

// Función para actualizar cantidad de salsa adicional (mantener compatibilidad con botones)
function updateExtraSauceQuantity(sauceId, change, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Construir el ID del input/select basado en el ID de la salsa
  const elementId = `extraSauce_${sauceId}`;
  const element = document.getElementById(elementId);
  
  if (!element) {
    console.error('Elemento de salsa no encontrado:', elementId);
    return;
  }
  
  // Si es un select, actualizar su valor
  if (element.tagName === 'SELECT') {
    let currentValue = parseInt(element.value) || 0;
    currentValue += change;
    if (currentValue < 0) currentValue = 0;
    if (currentValue > 10) currentValue = 10; // Limitar a 10
    element.value = currentValue;
  } else {
    // Si es un input (compatibilidad con código antiguo)
    let currentValue = parseInt(element.value) || 0;
    currentValue += change;
    if (currentValue < 0) currentValue = 0;
    element.value = currentValue;
  }
  
  // Actualizar totales del carrito cuando cambia la cantidad de salsa
  updateCartTotals();
}

// Función para actualizar cantidad de salsa adicional desde un select
function updateExtraSauceQuantityFromSelect(sauceId, value) {
  // El valor ya viene del select, solo actualizar totales
  updateCartTotals();
}

// Función para obtener las salsas seleccionadas del carrito
function getCartSauces() {
  // Obtener salsas principales de cada producto del carrito
  const productMainSauces = [];
  const cartItems = document.querySelectorAll('#page-orders .bg-white.dark\\:bg-zinc-900');
  
  cartItems.forEach((itemEl, index) => {
    const productNameEl = itemEl.querySelector('p.text-base.font-bold');
    const sauceSelect = itemEl.querySelector('.product-main-sauce');
    
    if (productNameEl && sauceSelect && sauceSelect.value) {
      productMainSauces.push({
        productIndex: index + 1,
        productName: productNameEl.textContent.trim(),
        sauce: sauceSelect.value
      });
    }
  });
  
  // Obtener cantidades de salsas adicionales (dinámicas) - soporta inputs y selects
  const extraSauces = [];
  // Buscar tanto inputs como selects que empiecen con "extraSauce_"
  const extraSauceInputs = document.querySelectorAll('input[id^="extraSauce_"], select[id^="extraSauce_"]');
  extraSauceInputs.forEach(element => {
    const quantity = parseInt(element.value) || 0;
    if (quantity > 0) {
      const sauceId = element.dataset.sauceId || '';
      const price = parseFloat(element.dataset.saucePrice) || 0;
      // Obtener el nombre de la salsa desde el dataset o desde el DOM
      let sauceName = element.dataset.sauceName || '';
      if (!sauceName) {
        // Intentar obtener desde el DOM (compatibilidad con código antiguo)
        const sauceNameEl = element.closest('.flex.items-center')?.querySelector('p.text-sm.font-bold');
        sauceName = sauceNameEl?.textContent.trim() || sauceId;
      }
      
      extraSauces.push({
        id: sauceId,
        name: sauceName,
        type: sauceId, // Mantener compatibilidad con código existente
        quantity: quantity,
        price: price
      });
    }
  });
  
  return {
    productMainSauces: productMainSauces,
    extraSauces: extraSauces
  };
}

// Funcionalidades adicionales para botones
const cartFunctions = {
  // Incrementar cantidad
  incrementQuantity(button, event) {
    // Prevenir propagación si el evento está presente
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation(); // Prevenir que otros listeners manejen el evento
    }
    
    // Marcar el botón como manejado para prevenir doble ejecución
    button.dataset.handled = 'true';
    
    const container = button.closest('.flex.flex-col.items-center');
    if (container) {
      const input = container.querySelector('input[type="number"]');
      if (input) {
        const currentValue = parseInt(input.value) || 1;
        input.value = currentValue + 1;
        
        // Actualizar badges del carrito
        updateCartBadges();
        
        // Actualizar totales del carrito y checkout
        updateCartTotals();
      }
    }
    
    // Remover el flag después de un breve delay para permitir futuros clicks
    setTimeout(() => {
      delete button.dataset.handled;
    }, 100);
    
    // Retornar false para prevenir propagación adicional
    return false;
  },
  
  // Decrementar cantidad
  decrementQuantity(button, event) {
    // Prevenir propagación si el evento está presente
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation(); // Prevenir que otros listeners manejen el evento
    }
    
    // Marcar el botón como manejado para prevenir doble ejecución
    button.dataset.handled = 'true';
    
    const container = button.closest('.flex.flex-col.items-center');
    if (container) {
      const input = container.querySelector('input[type="number"]');
      if (input) {
        const currentValue = parseInt(input.value) || 1;
        if (currentValue > 1) {
          input.value = currentValue - 1;
          
          // Actualizar badges del carrito
          updateCartBadges();
          
          // Actualizar totales del carrito y checkout
          updateCartTotals();
        }
      }
    }
    
    // Remover el flag después de un breve delay para permitir futuros clicks
    setTimeout(() => {
      delete button.dataset.handled;
    }, 100);
    
    // Retornar false para prevenir propagación adicional
    return false;
  },
  
  // Eliminar item del carrito
  removeItem(button) {
    // Encontrar el contenedor del item completo (el div con bg-white dark:bg-zinc-900)
    const itemContainer = button.closest('.bg-white.dark\\:bg-zinc-900');
    if (itemContainer) {
      // Eliminar el item con animación
      itemContainer.style.transition = 'opacity 0.3s, transform 0.3s';
      itemContainer.style.opacity = '0';
      itemContainer.style.transform = 'translateX(-20px)';
      
      setTimeout(() => {
        itemContainer.remove();
        // Actualizar badges del carrito
        updateCartBadges();
        // Actualizar totales del carrito y checkout
        updateCartTotals();
      }, 300);
    }
  }
};

// Función para agregar producto al carrito desde la página de detalle
function addProductToCartFromDetail() {
  const productName = sessionStorage.getItem('selectedProductName') || selectedProductName;
  
  if (!productName) {
    alert('Error: No hay producto seleccionado');
    return;
  }
  
  loadProductsFromFirebase((products) => {
    const product = products.find(p => p.name === productName);
    
    if (!product) {
      alert('Error: Producto no encontrado');
      return;
    }
    
    // Verificar stock antes de agregar
    getItemStockStatus(productName, (isInStock) => {
      if (!isInStock) {
        alert('Este producto está actualmente agotado');
        return;
      }
      
      // Agregar al carrito usando la función existente
      addProductToCartInternal(productName, product.price || 0);
      
      // Navegar al carrito
      router.navigate('orders');
    });
  });
}
