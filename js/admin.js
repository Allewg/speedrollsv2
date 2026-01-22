// ========== CONSTANTES Y VARIABLES DE ADMINISTRACIÓN ==========

const ADMIN_CODE = '123456'; // Código de acceso (cambiar por el código real)

// ========== FUNCIONES DE FIREBASE PARA STOCK ==========

// Función para guardar el estado de stock en Firebase
function saveItemStockStatus(itemName, inStock) {
  if (window.firebaseDB && window.firebaseReady) {
    const stockRef = window.firebaseRef(window.firebaseDB, `stock/${itemName}`);
    window.firebaseSet(stockRef, inStock).catch((error) => {
      console.error('Error al guardar stock en Firebase:', error);
      // Fallback a localStorage
      localStorage.setItem(`stock_${itemName}`, inStock ? 'true' : 'false');
    });
  } else {
    // Fallback a localStorage si Firebase no está disponible
    localStorage.setItem(`stock_${itemName}`, inStock ? 'true' : 'false');
  }
}

// Función para obtener el estado de stock de Firebase (con callback)
function getItemStockStatus(itemName, callback) {
  if (window.firebaseDB && window.firebaseReady) {
    const stockRef = window.firebaseRef(window.firebaseDB, `stock/${itemName}`);
    window.firebaseGet(stockRef).then((snapshot) => {
      const result = snapshot.exists() ? snapshot.val() : true; // true por defecto
      if (callback) callback(result);
    }).catch((error) => {
      console.error('Error al leer stock:', error);
      // Fallback a localStorage
      const stored = localStorage.getItem(`stock_${itemName}`);
      const result = stored === null ? true : stored === 'true';
      if (callback) callback(result);
    });
  } else {
    // Fallback a localStorage
    const stored = localStorage.getItem(`stock_${itemName}`);
    const result = stored === null ? true : stored === 'true';
    if (callback) callback(result);
  }
}

// Función para escuchar cambios en tiempo real del stock
function listenToStockChanges(callback) {
  if (!window.firebaseDB || !window.firebaseReady) return;
  
  // Remover listener anterior si existe
  if (stockListenerUnsubscribe) {
    window.firebaseOff(window.firebaseRef(window.firebaseDB, 'stock'), stockListenerUnsubscribe);
  }
  
  const stockRef = window.firebaseRef(window.firebaseDB, 'stock');
  stockListenerUnsubscribe = window.firebaseOnValue(stockRef, (snapshot) => {
    const stockData = snapshot.val() || {};
    if (callback) callback(stockData);
  });
  
  stockListenerActive = true;
}

// Función para obtener todo el stock de una vez
function getAllStockStatus(callback) {
  if (window.firebaseDB && window.firebaseReady) {
    const stockRef = window.firebaseRef(window.firebaseDB, 'stock');
    window.firebaseGet(stockRef).then((snapshot) => {
      const stockData = snapshot.val() || {};
      if (callback) callback(stockData);
    }).catch((error) => {
      console.error('Error al leer todo el stock:', error);
      if (callback) callback({});
    });
  } else {
    if (callback) callback({});
  }
}

// Función para generar la lista de inventario en el panel admin
function generateAdminInventory() {
  const inventoryList = document.getElementById('adminInventoryList');
  if (!inventoryList) return;
  
  // Cargar productos desde Firebase
  loadProductsFromFirebase((products) => {
    // Actualizar contador de items
    const itemsCountEl = document.getElementById('adminItemsCount');
    if (itemsCountEl) {
      itemsCountEl.textContent = `${products.length} ITEMS TOTALES`;
    }
    
    // Limpiar contenido existente
    inventoryList.innerHTML = '';
    
    if (products.length === 0) {
      inventoryList.innerHTML = '<div class="text-center text-gray-400 p-8">No hay productos disponibles. Usa import-excel.html para importar productos.</div>';
      return;
    }
    
    // Cargar stock desde Firebase para cada item
    products.forEach((item, index) => {
      getItemStockStatus(item.name, (inStock) => {
        const isChecked = inStock ? 'checked=""' : '';
        const stockStatus = inStock ? 'En Stock' : 'Agotado';
        const stockClass = inStock ? 'text-accent-green' : 'text-primary';
        const toggleBg = inStock ? 'bg-accent-green' : 'bg-primary';
        const opacityClass = inStock ? '' : 'opacity-60';
        const contentOpacityClass = inStock ? '' : 'opacity-60';
        
        // Verificar si el producto está marcado como "Elección del Chef"
        const isChefChoice = item.isChefChoice === true;
        const chefChoiceChecked = isChefChoice ? 'checked=""' : '';
        const chefChoiceBg = isChefChoice ? 'bg-yellow-500' : 'bg-gray-300';
        
        const itemHTML = `
<!-- Item ${index + 1} -->
<div class="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 ${opacityClass}" data-product-name="${(item.name || '').replace(/"/g, '&quot;')}">
<div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-16 shrink-0" data-alt="${item.alt || ''}" style="background-image: url('${item.imageUrl || ''}');"></div>
<div class="flex flex-col flex-1 min-w-0 ${contentOpacityClass}">
<p class="font-display text-base font-bold truncate">${item.name}</p>
<p class="text-gray-500 text-sm">${formatPrice(item.price)} • ${item.category || 'Sin categoría'}</p>
<div class="flex items-center gap-2 mt-1">
<p class="${stockClass} text-xs font-bold uppercase tracking-tighter">${stockStatus}</p>
${isChefChoice ? '<span class="text-yellow-600 dark:text-yellow-400 text-xs font-bold">⭐ Chef</span>' : ''}
</div>
</div>
<div class="flex flex-col gap-2 shrink-0 items-end">
<label class="relative flex h-[34px] w-[60px] cursor-pointer items-center rounded-full p-1 transition-colors duration-300 toggle-label ${toggleBg}" title="Stock">
<input ${isChecked} class="invisible absolute toggle-checkbox peer" type="checkbox" onchange="toggleItemStock(this)"/>
<div class="h-full w-[26px] rounded-full bg-white transition-all peer-checked:translate-x-[26px]" style="box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
</label>
<label class="relative flex h-[28px] w-[50px] cursor-pointer items-center rounded-full p-1 transition-colors duration-300 toggle-label ${chefChoiceBg}" title="Elección del Chef">
<input ${chefChoiceChecked} class="invisible absolute toggle-checkbox peer" type="checkbox" onchange="toggleChefChoice(this)"/>
<div class="h-full w-[22px] rounded-full bg-white transition-all peer-checked:translate-x-[22px]" style="box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
</label>
</div>
</div>
`;
        
        inventoryList.innerHTML += itemHTML;
      });
    });
  });
}

// Función para manejar el login del administrador
function handleAdminLogin() {
  const codeInput = document.getElementById('adminCode');
  const errorMsg = document.getElementById('adminCodeError');
  
  if (!codeInput) return;
  
  const enteredCode = codeInput.value.trim();
  
  if (enteredCode === ADMIN_CODE) {
    // Código correcto - establecer sesión
    sessionStorage.setItem('adminAuthenticated', 'true');
    
    // Limpiar error si existe
    if (errorMsg) {
      errorMsg.classList.add('hidden');
    }
    
    // Limpiar campo
    codeInput.value = '';
    
    // Navegar al panel de admin
    router.navigate('admin');
  } else {
    // Código incorrecto - mostrar error
    if (errorMsg) {
      errorMsg.classList.remove('hidden');
    }
    
    // Limpiar campo y enfocar
    codeInput.value = '';
    setTimeout(() => {
      codeInput.focus();
    }, 100);
  }
}

// Función para actualizar el estado de stock en el menú del usuario
function updateMenuStockStatus() {
  const menuGrid = document.querySelector('.products-grid');
  if (!menuGrid) return;
  
  // Configurar listener en tiempo real si Firebase está disponible
  if (window.firebaseDB && window.firebaseReady && !stockListenerActive) {
    listenToStockChanges((stockData) => {
      applyStockStatusToMenu(stockData);
    });
  } else {
    // Fallback: cargar estado actual sin listener
    const menuItems = menuGrid.querySelectorAll('.flex.flex-col.gap-2.group');
    menuItems.forEach(itemContainer => {
      const nameEl = itemContainer.querySelector('h3');
      if (!nameEl) return;
      
      const productName = nameEl.textContent.trim();
      getItemStockStatus(productName, (isInStock) => {
        applyStockToItem(itemContainer, productName, isInStock);
      });
    });
  }
}

// Función para aplicar el estado de stock a todo el menú desde datos de Firebase
function applyStockStatusToMenu(stockData) {
  const menuGrid = document.querySelector('.products-grid');
  if (!menuGrid) return;
  
  const menuItems = menuGrid.querySelectorAll('.flex.flex-col.gap-2.group');
  menuItems.forEach(itemContainer => {
    const nameEl = itemContainer.querySelector('h3');
    if (!nameEl) return;
    
    const productName = nameEl.textContent.trim();
    const isInStock = stockData[productName] !== undefined ? stockData[productName] : true;
    applyStockToItem(itemContainer, productName, isInStock);
  });
}

// Función para aplicar el estado de stock a un item individual
function applyStockToItem(itemContainer, productName, isInStock) {
  const addButton = itemContainer.querySelector('button[onclick*="addToCartDirect"]');
  const imageDiv = itemContainer.querySelector('div[onclick]');
  
  if (isInStock) {
    // En stock - habilitar botón y quitar opacidad
    if (addButton) {
      addButton.disabled = false;
      addButton.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
      addButton.classList.add('bg-primary', 'cursor-pointer', 'active:scale-95');
      addButton.innerHTML = '<span class="material-symbols-outlined text-sm">add</span> Agregar';
    }
    if (imageDiv) {
      imageDiv.classList.remove('opacity-50');
      itemContainer.classList.remove('opacity-60');
    }
    
    // Remover badge de agotado si existe
    const outOfStockBadge = itemContainer.querySelector('.out-of-stock-badge');
    if (outOfStockBadge) {
      outOfStockBadge.remove();
    }
  } else {
    // Agotado - deshabilitar botón y aplicar estilos
    if (addButton) {
      addButton.disabled = true;
      addButton.classList.remove('bg-primary', 'cursor-pointer', 'active:scale-95');
      addButton.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
      addButton.innerHTML = '<span class="material-symbols-outlined text-sm">block</span> Agotado';
    }
    if (imageDiv) {
      imageDiv.classList.add('opacity-50');
      itemContainer.classList.add('opacity-60');
      
      // Agregar badge de agotado si no existe
      if (!imageDiv.querySelector('.out-of-stock-badge')) {
        const badge = document.createElement('div');
        badge.className = 'out-of-stock-badge absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider z-10';
        badge.textContent = 'Agotado';
        imageDiv.appendChild(badge);
      }
    }
  }
}

// Función para toggle de stock de items
function toggleItemStock(checkbox) {
  const itemContainer = checkbox.closest('.bg-white, .dark\\:bg-gray-900');
  if (!itemContainer) return;
  
  const isChecked = checkbox.checked;
  const statusEl = itemContainer.querySelector('.text-accent-green, .text-primary');
  const toggleLabel = checkbox.parentElement;
  
  // Obtener el nombre del producto
  const productNameEl = itemContainer.querySelector('.font-display.text-base.font-bold');
  const productName = productNameEl ? productNameEl.textContent.trim() : '';
  
  if (statusEl) {
    if (isChecked) {
      // En stock
      statusEl.textContent = 'En Stock';
      statusEl.classList.remove('text-primary');
      statusEl.classList.add('text-accent-green');
      itemContainer.classList.remove('opacity-60', 'opacity-70');
      toggleLabel.classList.remove('bg-primary');
      toggleLabel.classList.add('bg-accent-green');
    } else {
      // Agotado
      statusEl.textContent = 'Agotado';
      statusEl.classList.remove('text-accent-green');
      statusEl.classList.add('text-primary');
      itemContainer.classList.add('opacity-60');
      toggleLabel.classList.remove('bg-accent-green');
      toggleLabel.classList.add('bg-primary');
    }
  }
  
  // Guardar en Firebase
  if (productName) {
    saveItemStockStatus(productName, isChecked);
    // Actualizar el menú del usuario si está visible (el listener en tiempo real lo hará automáticamente, pero esto es un backup)
    setTimeout(() => {
      updateMenuStockStatus();
    }, 200);
  }
}

// Función para toggle de "Elección del Chef"
function toggleChefChoice(checkbox) {
  const itemContainer = checkbox.closest('.bg-white, .dark\\:bg-gray-900');
  if (!itemContainer) return;
  
  const isChecked = checkbox.checked;
  const toggleLabel = checkbox.parentElement;
  
  // Obtener el nombre del producto desde data attribute o texto
  const productName = itemContainer.getAttribute('data-product-name') || 
                      itemContainer.querySelector('.font-display.text-base.font-bold')?.textContent.trim() || '';
  
  if (!productName) return;
  
  // Actualizar UI del toggle
  if (isChecked) {
    toggleLabel.classList.remove('bg-gray-300');
    toggleLabel.classList.add('bg-yellow-500');
    // Agregar badge de "Chef" si no existe
    const statusContainer = itemContainer.querySelector('.flex.items-center.gap-2.mt-1');
    if (statusContainer && !statusContainer.querySelector('.text-yellow-600')) {
      const chefBadge = document.createElement('span');
      chefBadge.className = 'text-yellow-600 dark:text-yellow-400 text-xs font-bold';
      chefBadge.textContent = '⭐ Chef';
      statusContainer.appendChild(chefBadge);
    }
  } else {
    toggleLabel.classList.remove('bg-yellow-500');
    toggleLabel.classList.add('bg-gray-300');
    // Remover badge de "Chef"
    const chefBadge = itemContainer.querySelector('.text-yellow-600');
    if (chefBadge) {
      chefBadge.remove();
    }
  }
  
  // Guardar en Firebase
  saveProductChefChoice(productName, isChecked);
  
  // Actualizar "Elección del Chef" en el home
  setTimeout(() => {
    loadProductsFromFirebase((products) => {
      generateChefChoice(products);
    });
  }, 200);
}

// Función para guardar el estado de "Elección del Chef" en Firebase
function saveProductChefChoice(productName, isChefChoice) {
  if (!window.firebaseDB || !window.firebaseReady) {
    console.error('Firebase no está disponible');
    return;
  }
  
  // Buscar el producto en Firebase y actualizar su campo isChefChoice
  const productsRef = window.firebaseRef(window.firebaseDB, 'products');
  
  window.firebaseGet(productsRef).then((snapshot) => {
    const productsData = snapshot.val() || {};
    
    // Buscar el producto por nombre
    let productKey = null;
    for (const key in productsData) {
      if (productsData[key].name === productName) {
        productKey = key;
        break;
      }
    }
    
    if (productKey) {
      // Actualizar solo el campo isChefChoice del producto
      const productRef = window.firebaseRef(window.firebaseDB, `products/${productKey}/isChefChoice`);
      window.firebaseSet(productRef, isChefChoice).catch((error) => {
        console.error('Error al guardar isChefChoice en Firebase:', error);
      });
    } else {
      console.warn(`Producto "${productName}" no encontrado en Firebase`);
    }
  }).catch((error) => {
    console.error('Error al leer productos de Firebase:', error);
  });
}
