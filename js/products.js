// ========== VARIABLES GLOBALES PARA PRODUCTOS ==========

// Variables globales para el producto actual
let selectedSauces = ['mayonesa']; // Mayonesa seleccionada por defecto
let selectedExtras = [];
const baseProductPrice = 18.50;

// Array con todos los items del menú (se carga dinámicamente desde Firebase)
let MENU_ITEMS = [];
let productsListenerUnsubscribe = null;
let currentCategoryFilter = 'all'; // Filtro de categoría actual

// Variable global para el producto seleccionado
let selectedProductName = null;

// Variables para stock
let stockListenerActive = false;
let stockListenerUnsubscribe = null;

// ========== FUNCIONES DE PRODUCTOS ==========

// Función para alternar selección de salsa (máximo 2)
function toggleSauce(element, sauceName, price) {
  const isSelected = element.classList.contains('selected');
  const selectedCount = document.querySelectorAll('.sauce-option.selected').length;
  
  if (isSelected) {
    // Deseleccionar
    element.classList.remove('selected', 'border-primary', 'bg-primary/5');
    element.classList.add('border-[#171212]/10', 'dark:border-white/10', 'bg-white', 'dark:bg-white/5');
    const checkIcon = element.querySelector('.sauce-check');
    checkIcon.classList.remove('bg-primary');
    checkIcon.classList.add('border-2', 'border-primary/20');
    const icon = checkIcon.querySelector('span.material-symbols-outlined');
    icon.classList.add('opacity-0');
    icon.classList.remove('text-white');
    icon.classList.add('text-primary');
    
    selectedSauces = selectedSauces.filter(s => s !== sauceName);
  } else {
    // Verificar límite de 2 salsas
    if (selectedCount >= 2) {
      alert('Solo puedes seleccionar hasta 2 salsas');
      return;
    }
    
    // Seleccionar
    element.classList.add('selected', 'border-primary', 'bg-primary/5');
    element.classList.remove('border-[#171212]/10', 'dark:border-white/10');
    const checkIcon = element.querySelector('.sauce-check');
    checkIcon.classList.add('bg-primary');
    checkIcon.classList.remove('border-2', 'border-primary/20');
    const icon = checkIcon.querySelector('span.material-symbols-outlined');
    icon.classList.remove('opacity-0');
    icon.classList.add('text-white');
    icon.classList.remove('text-primary');
    
    selectedSauces.push(sauceName);
  }
  
  updateProductPrice();
}

// Función para alternar selección de extra
function toggleExtra(element, extraName, price) {
  const isSelected = element.classList.contains('selected');
  
  if (isSelected) {
    // Deseleccionar
    element.classList.remove('selected', 'border-primary', 'border-2', 'bg-primary/5');
    element.classList.add('border-[#171212]/10', 'dark:border-white/10', 'border');
    
    selectedExtras = selectedExtras.filter(e => e.name !== extraName);
  } else {
    // Seleccionar
    element.classList.add('selected', 'border-primary', 'border-2', 'bg-primary/5');
    element.classList.remove('border-[#171212]/10', 'dark:border-white/10');
    
    selectedExtras.push({ name: extraName, price: price });
  }
  
  updateProductPrice();
}

// Función para actualizar el precio total del producto
function updateProductPrice() {
  let totalPrice = baseProductPrice;
  
  // Sumar precios de salsas seleccionadas
  document.querySelectorAll('.sauce-option.selected').forEach(option => {
    const price = parseFloat(option.dataset.price) || 0;
    totalPrice += price;
  });
  
  // Sumar precios de extras seleccionados
  selectedExtras.forEach(extra => {
    totalPrice += extra.price;
  });
  
  // Obtener cantidad
  const quantity = parseInt(document.getElementById('productQuantity')?.textContent || '1');
  const finalPrice = totalPrice * quantity;
  
  // Actualizar botón
  const priceSpan = document.getElementById('addToCartPrice');
  if (priceSpan) {
    priceSpan.textContent = `Agregar al Carrito - $${Math.round(finalPrice)}`;
  }
}

// Función para actualizar cantidad del producto
function updateProductQuantity(change) {
  const quantityEl = document.getElementById('productQuantity');
  if (!quantityEl) return;
  
  let currentQty = parseInt(quantityEl.textContent) || 1;
  currentQty += change;
  
  if (currentQty < 1) currentQty = 1;
  
  quantityEl.textContent = currentQty;
  updateProductPrice();
}

// Función para seleccionar un producto antes de navegar
function selectProduct(productName) {
  selectedProductName = productName;
  sessionStorage.setItem('selectedProductName', productName);
}

// Función para cargar productos desde Firebase
function loadProductsFromFirebase(callback) {
  if (!window.firebaseDB || !window.firebaseReady) {
    if (callback) callback([]);
    return;
  }
  
  const productsRef = window.firebaseRef(window.firebaseDB, 'products');
  
  window.firebaseGet(productsRef).then((snapshot) => {
    const productsData = snapshot.val() || {};
    const productsArray = Object.values(productsData);
    
    MENU_ITEMS = productsArray;
    
    if (callback) callback(productsArray);
  }).catch((error) => {
    console.error('Error al cargar productos:', error);
    if (callback) callback([]);
  });
}

// Función para escuchar cambios en productos en tiempo real
function listenToProductsChanges(callback) {
  if (!window.firebaseDB || !window.firebaseReady) return;
  
  if (productsListenerUnsubscribe) {
    window.firebaseOff(window.firebaseRef(window.firebaseDB, 'products'), productsListenerUnsubscribe);
  }
  
  const productsRef = window.firebaseRef(window.firebaseDB, 'products');
  productsListenerUnsubscribe = window.firebaseOnValue(productsRef, (snapshot) => {
    const productsData = snapshot.val() || {};
    const productsArray = Object.values(productsData);
    MENU_ITEMS = productsArray;
    if (callback) callback(productsArray);
  });
}

// Función para generar los filtros de categorías dinámicamente
function generateCategoryFilters(products) {
  const container = document.getElementById('categoryFiltersContainer');
  if (!container) return;
  
  // Obtener categorías únicas de los productos
  const categories = ['all', ...new Set(products.map(p => p.category).filter(c => c && c !== 'Sin categoría'))];
  
  container.innerHTML = '';
  
  categories.forEach(category => {
    const isActive = currentCategoryFilter === category;
    const displayName = category === 'all' ? 'Todo el Menú' : category;
    const chipHTML = `
<div onclick="filterByCategory('${category}')" class="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-6 cursor-pointer transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}">
<span class="text-sm ${isActive ? 'font-semibold' : 'font-medium'}">${displayName}</span>
</div>
`;
    container.innerHTML += chipHTML;
  });
}

// Función para filtrar productos por categoría
function filterByCategory(category) {
  currentCategoryFilter = category;
  // Regenerar filtros con la categoría activa
  generateCategoryFilters(MENU_ITEMS);
  // Regenerar el menú con el filtro aplicado
  generateMenuHTML(MENU_ITEMS);
}

// Función para generar las salsas adicionales dinámicamente desde Firebase
function generateExtraSauces(products) {
  const container = document.getElementById('extraSaucesContainer');
  if (!container) return;
  
  // Filtrar productos de la categoría "Salsas" (case-insensitive)
  const sauces = products.filter(p => {
    const category = (p.category || '').toLowerCase().trim();
    return category === 'salsas' || category === 'salsa';
  });
  
  // Si no hay salsas, mostrar mensaje o dejar vacío
  if (sauces.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No hay salsas disponibles</p>';
    return;
  }
  
  container.innerHTML = '';
  
  // Colores para los iconos (rotar entre diferentes colores)
  const colors = [
    { bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/30', icon: 'text-amber-600', darkIcon: 'dark:text-amber-400' },
    { bg: 'bg-orange-100', darkBg: 'dark:bg-orange-900/30', icon: 'text-orange-600', darkIcon: 'dark:text-orange-400' },
    { bg: 'bg-red-100', darkBg: 'dark:bg-red-900/30', icon: 'text-red-600', darkIcon: 'dark:text-red-400' },
    { bg: 'bg-pink-100', darkBg: 'dark:bg-pink-900/30', icon: 'text-pink-600', darkIcon: 'dark:text-pink-400' },
    { bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/30', icon: 'text-purple-600', darkIcon: 'dark:text-purple-400' }
  ];
  
  sauces.forEach((sauce, index) => {
    const sauceId = sauce.id || sauce.name?.toLowerCase().replace(/\s+/g, '') || `sauce-${index}`;
    const saucePrice = sauce.price || 0;
    const sauceName = sauce.name || 'Salsa';
    const colorScheme = colors[index % colors.length];
    
    // Crear ID único para el input basado en el ID del producto
    const inputId = `extraSauce_${sauceId}`;
    
    const sauceHTML = `
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-background-dark hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors">
<div class="flex items-center gap-2 flex-1 min-w-0">
<div class="w-7 h-7 rounded-md ${colorScheme.bg} ${colorScheme.darkBg} flex items-center justify-center flex-shrink-0">
<span class="material-symbols-outlined ${colorScheme.icon} ${colorScheme.darkIcon} text-sm">water_drop</span>
</div>
<div class="flex-1 min-w-0">
<p class="text-xs font-semibold text-[#171212] dark:text-white truncate">${sauceName}</p>
<p class="text-[10px] text-[#836967] dark:text-zinc-400">$${saucePrice.toFixed(0)} c/u</p>
</div>
</div>
<div class="flex items-center gap-1.5 flex-shrink-0">
<button onclick="updateExtraSauceQuantity('${sauceId}', -1, event)" class="flex h-7 w-7 items-center justify-center rounded-md bg-gray-200 dark:bg-zinc-700 text-[#171212] dark:text-white hover:bg-gray-300 dark:hover:bg-zinc-600 active:scale-95 transition-all touch-manipulation" aria-label="Reducir cantidad">
<span class="material-symbols-outlined text-xs">remove</span>
</button>
<input type="number" id="${inputId}" value="0" min="0" data-sauce-id="${sauceId}" data-sauce-price="${saucePrice}" class="w-10 h-7 text-center text-xs font-semibold border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-background-dark text-[#171212] dark:text-white focus:outline-0 focus:ring-1 focus:ring-primary/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/>
<button onclick="updateExtraSauceQuantity('${sauceId}', 1, event)" class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all touch-manipulation" aria-label="Aumentar cantidad">
<span class="material-symbols-outlined text-xs">add</span>
</button>
</div>
</div>
`;
    
    container.innerHTML += sauceHTML;
  });
}

// Función para generar las categorías del home con imágenes reales de productos
function generateHomeCategories(products) {
  const container = document.getElementById('homeCategoriesContainer');
  if (!container) return;
  
  // Obtener categorías únicas (excluir 'Sin categoría')
  let categories = [...new Set(products.map(p => p.category).filter(c => c && c !== 'Sin categoría'))];
  
  // Ordenar categorías según el orden especificado (mismo orden que en el menú)
  const categoryOrder = [
    'sushi burger',
    'gohan',
    'sushipleto',
    'fries',
    'bebestibles',
    'promociones',
    'salsas'
  ];
  
  // Función para normalizar una categoría (minúsculas, sin espacios, sin acentos)
  const normalizeCategory = (category) => {
    if (!category) return '';
    return category
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '') // Eliminar todos los espacios
      .normalize('NFD') // Normalizar caracteres Unicode (separar acentos)
      .replace(/[\u0300-\u036f]/g, ''); // Eliminar diacríticos (acentos)
  };
  
  // Función para obtener el índice de orden de una categoría
  const getCategoryOrder = (category) => {
    if (!category) return 999;
    
    const normalizedCategory = normalizeCategory(category);
    
    // Buscar coincidencia exacta primero (más preciso)
    let index = categoryOrder.findIndex(cat => {
      const catNormalized = normalizeCategory(cat);
      return normalizedCategory === catNormalized;
    });
    
    // Si no hay coincidencia exacta, buscar coincidencia parcial (que contenga la palabra clave)
    if (index === -1) {
      index = categoryOrder.findIndex(cat => {
        const catNormalized = normalizeCategory(cat);
        // Coincidencia si la categoría normalizada contiene la palabra clave o viceversa
        return normalizedCategory.includes(catNormalized) || catNormalized.includes(normalizedCategory);
      });
    }
    
    // Si no se encuentra, asignar un índice alto para que aparezca al final
    return index === -1 ? 999 : index;
  };
  
  // Ordenar categorías según categoryOrder
  categories = categories.sort((a, b) => {
    const orderA = getCategoryOrder(a);
    const orderB = getCategoryOrder(b);
    return orderA - orderB;
  });
  
  container.innerHTML = '';
  
  // Limitar a 4 categorías para el diseño del home
  const displayCategories = categories.slice(0, 4);
  
  displayCategories.forEach(category => {
    let categoryImage = '';
    
    // URL específica para la categoría "Gohan"
    const gohanImageUrl = 'https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/EGgbMOFFpKckghElVUHQn6vbYF82%2Fthumb_280_11f60fe9-f263-44d1-be80-a8b1fba7556d.jpg?alt=media';
    
    // Si la categoría es "Gohan", usar la URL específica
    const normalizedCategory = (category || '').toLowerCase().trim();
    if (normalizedCategory.includes('gohan')) {
      categoryImage = gohanImageUrl;
    } else {
      // Buscar el primer producto de esta categoría que tenga imagen
      const categoryProduct = products.find(p => p.category === category && p.imageUrl && p.imageUrl.trim() !== '');
      
      // Si no hay producto con imagen, usar placeholder
      categoryImage = categoryProduct 
        ? categoryProduct.imageUrl 
        : getPlaceholderImage(category, category);
    }
    
    const categoryHTML = `
<div onclick="router.navigate('menu'); filterByCategory('${category}');" class="flex flex-col gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-zinc-900 p-4 items-center justify-center text-center shadow-sm hover:border-primary transition-all group cursor-pointer">
<div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-16 shrink-0 shadow-md group-hover:scale-105 transition-transform" data-alt="${category}" style="background-image: url('${categoryImage}'); background-color: #b5352c;"></div>
<h2 class="text-[#171212] dark:text-white text-sm font-bold leading-tight">${category}</h2>
</div>
`;
    container.innerHTML += categoryHTML;
  });
}

// Función para actualizar la imagen del slide de promoción con una imagen de productos de promociones
function updatePromoHeroSlide(products) {
  const promoSlide = document.getElementById('promoHeroSlide');
  if (!promoSlide) return;
  
  // Buscar productos de la categoría "promociones"
  const promoProducts = products.filter(p => {
    const category = (p.category || '').toLowerCase().trim();
    return category.includes('promocion') || category === 'promociones';
  });
  
  // Si hay productos de promociones con imagen, usar la primera imagen disponible
  if (promoProducts.length > 0) {
    const promoWithImage = promoProducts.find(p => p.imageUrl && p.imageUrl.trim() !== '');
    if (promoWithImage && promoWithImage.imageUrl) {
      const imageUrl = promoWithImage.imageUrl;
      promoSlide.style.backgroundImage = `linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.7)), url('${imageUrl}')`;
      return;
    }
  }
  
  // Si no hay productos de promociones con imagen, mantener la imagen por defecto
  // (ya está configurada en el HTML)
}

// Función para generar "Elección del Chef" con productos destacados
function generateChefChoice(products) {
  const container = document.getElementById('chefChoiceContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (products.length === 0) return;
  
  // Filtrar productos marcados como "Elección del Chef" (isChefChoice === true)
  let featuredProducts = products.filter(p => p.isChefChoice === true);
  
  // Si no hay productos marcados como "Elección del Chef", usar fallback:
  // Productos con badge "Chef's Pick" o similares
  if (featuredProducts.length === 0) {
    featuredProducts = products.filter(p => p.badge && (p.badge.toLowerCase().includes('chef') || p.badge.toLowerCase().includes('pick')));
  }
  
  // Si aún no hay productos, tomar los primeros 3 productos que tengan imágenes
  if (featuredProducts.length === 0) {
    featuredProducts = products.filter(p => p.imageUrl && p.imageUrl.trim() !== '').slice(0, 3);
  } else {
    // Limitar a 3 productos (los primeros que estén marcados como Chef)
    featuredProducts = featuredProducts.slice(0, 3);
  }
  
  // Si aún no hay suficientes, completar con cualquier producto que tenga imagen
  while (featuredProducts.length < 3 && featuredProducts.length < products.length) {
    const remaining = products.filter(p => !featuredProducts.includes(p) && p.imageUrl && p.imageUrl.trim() !== '');
    if (remaining.length > 0) {
      featuredProducts.push(remaining[0]);
    } else {
      break;
    }
  }
  
  featuredProducts.forEach((product, index) => {
    const hasImage = product.imageUrl && product.imageUrl.trim() !== '';
    const imageUrl = hasImage ? product.imageUrl : getPlaceholderImage(product.name, product.category);
    
    // El primer producto ocupa 2 filas en móvil, 1 en desktop
    const isFirst = index === 0;
    const itemClass = isFirst ? 'row-span-2 lg:row-span-1' : '';
    const bottomClass = isFirst ? 'bottom-4 left-4 right-4' : 'bottom-3 left-3';
    const nameClass = isFirst ? 'text-xs font-semibold mb-1' : 'text-[10px] font-semibold';
    const priceClass = isFirst ? 'text-primary font-bold' : 'text-primary text-xs font-bold';
    
    const itemHTML = `
<div onclick="selectProduct('${(product.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}'); router.navigate('product');" class="${itemClass} relative rounded-2xl overflow-hidden shadow-lg bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:scale-[1.02] transition-transform" data-alt="${product.alt || product.name || ''}" style="background-image: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.8)), url('${imageUrl}'); background-size: cover; background-color: #b5352c;">
<div class="absolute ${bottomClass}">
<p class="text-white ${nameClass}">${product.name}</p>
<p class="${priceClass}">${formatPrice(product.price)}</p>
</div>
</div>
`;
    container.innerHTML += itemHTML;
  });
}

// Función para generar el HTML del menú dinámicamente
function generateMenuHTML(products) {
  const container = document.getElementById('menuProductsContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (products.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center text-gray-400 p-8">No hay productos disponibles</div>';
    return;
  }
  
  // Filtrar productos por categoría si no es 'all'
  let filteredProducts = currentCategoryFilter === 'all' 
    ? products 
    : products.filter(p => p.category === currentCategoryFilter);
  
  if (filteredProducts.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center text-gray-400 p-8">No hay productos en esta categoría</div>';
    return;
  }
  
  // Ordenar productos por categoría según el orden especificado (se aplica siempre, incluso cuando el filtro es 'all')
  const categoryOrder = [
    'sushi burger',  // Coincide con "Sushi burger" en la BD (la normalización maneja mayúsculas y espacios)
    'gohan',
    'sushipleto',
    'fries',
    'bebestibles',
    'promociones',
    'salsas'
  ];
  
  // Función para normalizar una categoría (minúsculas, sin espacios, sin acentos)
  const normalizeCategory = (category) => {
    if (!category) return '';
    return category
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '') // Eliminar todos los espacios
      .normalize('NFD') // Normalizar caracteres Unicode (separar acentos)
      .replace(/[\u0300-\u036f]/g, ''); // Eliminar diacríticos (acentos)
  };
  
  // Función para obtener el índice de orden de una categoría
  const getCategoryOrder = (category) => {
    if (!category) return 999;
    
    const normalizedCategory = normalizeCategory(category);
    
    // Buscar coincidencia exacta primero (más preciso)
    let index = categoryOrder.findIndex(cat => {
      const catNormalized = normalizeCategory(cat);
      return normalizedCategory === catNormalized;
    });
    
    // Si no hay coincidencia exacta, buscar coincidencia parcial (que contenga la palabra clave)
    if (index === -1) {
      index = categoryOrder.findIndex(cat => {
        const catNormalized = normalizeCategory(cat);
        // Coincidencia si la categoría normalizada contiene la palabra clave o viceversa
        return normalizedCategory.includes(catNormalized) || catNormalized.includes(normalizedCategory);
      });
    }
    
    // Si no se encuentra, asignar un índice alto para que aparezca al final
    return index === -1 ? 999 : index;
  };
  
  // Ordenar productos: primero por categoría según categoryOrder, luego por nombre alfabéticamente
  filteredProducts = filteredProducts.sort((a, b) => {
    const orderA = getCategoryOrder(a.category);
    const orderB = getCategoryOrder(b.category);
    
    // Primero ordenar por índice de categoría (según categoryOrder)
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Si tienen el mismo orden de categoría, ordenar por nombre alfabéticamente
    const nameA = (a.name || '').toLowerCase().trim();
    const nameB = (b.name || '').toLowerCase().trim();
    return nameA.localeCompare(nameB);
  });
  
  filteredProducts.forEach((product) => {
    const badgeHTML = product.badge ? `<div class="absolute top-2 left-2 ${getBadgeClass(product.badge)} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getBadgeTextClass(product.badge)}">${product.badge}</div>` : '';
    
    // Imagen de fondo o imagen referencial si no hay imagen
    // Verificar si la URL es base64 o una URL normal
    const imageUrlRaw = product.imageUrl || '';
    const hasImage = imageUrlRaw.trim() !== '' && (
      imageUrlRaw.startsWith('http://') || 
      imageUrlRaw.startsWith('https://') || 
      imageUrlRaw.startsWith('data:image')
    );
    const imageUrl = hasImage ? imageUrlRaw : getPlaceholderImage(product.name, product.category);
    
    // Escapar el nombre del producto para HTML
    const safeProductName = (product.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    const itemHTML = `
<div class="flex flex-col gap-2 group">
<div onclick="selectProduct('${safeProductName}'); router.navigate('product');" class="relative w-full aspect-[4/5] bg-center bg-no-repeat bg-cover rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform" data-alt="${product.alt || product.name || ''}" style="background-image: url('${imageUrl}'); background-color: #b5352c;">
<img src="${imageUrl}" alt="${safeProductName}" class="absolute inset-0 w-full h-full object-cover opacity-0" onerror="this.onerror=null; this.style.display='none'; this.parentElement.style.backgroundImage='linear-gradient(135deg, #b5352c 0%, #8b2922 100%)';">
${badgeHTML}
</div>
<div class="flex flex-col flex-1 justify-between pt-1">
<div>
<h3 class="text-[#171212] dark:text-white text-sm font-bold leading-tight">${product.name}</h3>
<p class="text-[#836967] dark:text-zinc-400 text-xs font-medium mt-0.5">${formatPrice(product.price)}</p>
</div>
<button onclick="event.stopImmediatePropagation(); addToCartDirect(this, event); return false;" class="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-primary text-white rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-md shadow-primary/20">
<span class="material-symbols-outlined text-sm">add</span> Agregar
</button>
</div>
</div>
`;
    container.innerHTML += itemHTML;
  });
  
  // Actualizar estado de stock después de generar el menú
  setTimeout(() => {
    updateMenuStockStatus();
  }, 300);
}

// Función para obtener URL de imagen referencial cuando no hay imagen
function getPlaceholderImage(productName, category) {
  // Generar un hash simple del nombre del producto para obtener una imagen consistente
  let hash = 0;
  const nameStr = (productName || category || 'food').toLowerCase();
  for (let i = 0; i < nameStr.length; i++) {
    const char = nameStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const seed = Math.abs(hash);
  
  // Determinar categoría de imagen según el producto usando Foodish API
  const name = nameStr;
  let foodCategory = 'burger'; // Default
  
  if (name.includes('burger') || name.includes('hamburguesa')) {
    foodCategory = 'burger';
  } else if (name.includes('sushi') || name.includes('roll')) {
    foodCategory = 'sushi';
  } else if (name.includes('pizza')) {
    foodCategory = 'pizza';
  } else if (name.includes('pasta')) {
    foodCategory = 'pasta';
  } else if (name.includes('dosa')) {
    foodCategory = 'dosa';
  } else if (name.includes('idly')) {
    foodCategory = 'idly';
  } else if (name.includes('vada')) {
    foodCategory = 'vada';
  } else if (name.includes('samosa')) {
    foodCategory = 'samosa';
  } else if (name.includes('biryani')) {
    foodCategory = 'biryani';
  } else if (name.includes('butter') || name.includes('chicken')) {
    foodCategory = 'butter_chicken';
  } else {
    // Si no coincide, usar el seed para variar entre categorías disponibles
    const categories = ['burger', 'sushi', 'pizza', 'pasta', 'samosa'];
    foodCategory = categories[seed % categories.length];
  }
  
  // Generar URL de imagen referencial
  // Usar placeholder.com que siempre funciona como fallback
  const width = 400;
  const height = 500;
  const bgColor = 'b5352c'; // Color primario del sitio
  const textColor = 'ffffff';
  const displayName = (productName || 'Producto').substring(0, 20); // Limitar texto
  
  // Intentar usar Unsplash primero, pero con fallback a placeholder
  const searchTerm = encodeURIComponent(foodCategory || 'food');
  const unsplashUrl = `https://source.unsplash.com/${width}x${height}/?${searchTerm}&sig=${seed}`;
  
  // Usar placeholder.com que es más confiable
  // Esto mostrará al menos un fondo con el nombre del producto
  const placeholderUrl = `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(displayName)}`;
  
  // También intentar con Unsplash para obtener imágenes reales de comida
  // El navegador intentará cargar la imagen y si falla, usará el onerror del img tag
  return `https://images.unsplash.com/photo-${1500 + (seed % 1000)}?w=${width}&h=${height}&fit=crop&auto=format&q=80`;
}

// Función para formatear precios sin símbolo $ y sin decimales innecesarios
function formatPrice(price) {
  const numPrice = parseFloat(price) || 0;
  // Si es un número entero, mostrarlo sin decimales; si tiene decimales, mostrarlos solo si no son .00
  if (numPrice % 1 === 0) {
    return numPrice.toString();
  } else {
    // Si termina en .00, mostrarlo sin decimales
    const rounded = Math.round(numPrice * 100) / 100;
    if (rounded % 1 === 0) {
      return rounded.toString();
    }
    return rounded.toString();
  }
}

// Función auxiliar para clases de badge
function getBadgeClass(badge) {
  const badgeLower = badge.toLowerCase();
  if (badgeLower.includes('chef') || badgeLower.includes("pick")) return 'bg-white/90 dark:bg-black/80 text-primary';
  if (badgeLower.includes('vegetariano') || badgeLower.includes('vegetarian')) return 'bg-[#6B705C]/90 text-white';
  return 'bg-primary/90 text-white';
}

function getBadgeTextClass(badge) {
  const badgeLower = badge.toLowerCase();
  if (badgeLower.includes('chef') || badgeLower.includes("pick")) return 'text-primary';
  return 'text-white';
}

// Función para cargar y mostrar los detalles del producto
function loadProductDetails() {
  // Obtener el nombre del producto desde sessionStorage o variable global
  const productName = sessionStorage.getItem('selectedProductName') || selectedProductName;
  
  if (!productName) {
    console.warn('No hay producto seleccionado');
    // Si no hay producto, volver al menú
    setTimeout(() => {
      router.navigate('menu');
    }, 500);
    return;
  }
  
  // Limpiar contenido anterior para evitar duplicados
  const imageEl = document.getElementById('productImage');
  const nameEl = document.getElementById('productName');
  const priceEl = document.getElementById('productPrice');
  const descEl = document.getElementById('productDescription');
  const badgeEl = document.getElementById('productBadge');
  const ingredientsContainer = document.getElementById('productIngredientsContainer');
  
  // Resetear a estado de carga
  if (imageEl) {
    imageEl.style.backgroundImage = '';
  }
  if (nameEl) {
    nameEl.textContent = '';
  }
  if (priceEl) {
    priceEl.textContent = '$0';
  }
  if (descEl) {
    descEl.textContent = '';
  }
  if (badgeEl) {
    badgeEl.classList.add('hidden');
  }
  if (ingredientsContainer) {
    ingredientsContainer.innerHTML = '';
  }
  
  // Cargar productos desde Firebase
  loadProductsFromFirebase((products) => {
    // Buscar el producto por nombre
    const product = products.find(p => p.name === productName);
    
    if (!product) {
      console.warn(`Producto "${productName}" no encontrado`);
      setTimeout(() => {
        router.navigate('menu');
      }, 500);
      return;
    }
    
    // Actualizar la imagen - evitar duplicados limpiando primero
    if (imageEl) {
      const imageUrlRaw = product.imageUrl || '';
      const hasImage = imageUrlRaw.trim() !== '' && (
        imageUrlRaw.startsWith('http://') || 
        imageUrlRaw.startsWith('https://') || 
        imageUrlRaw.startsWith('data:image')
      );
      const imageUrl = hasImage ? imageUrlRaw : getPlaceholderImage(product.name, product.category || '');
      
      imageEl.style.backgroundImage = `url('${imageUrl}')`;
      imageEl.setAttribute('data-alt', product.alt || product.name || '');
    }
    
    // Actualizar nombre
    if (nameEl) {
      nameEl.textContent = product.name || 'Producto';
    }
    
    // Actualizar precio
    if (priceEl) {
      priceEl.textContent = formatPrice(product.price);
    }
    
    // Actualizar badge (si existe)
    if (badgeEl) {
      if (product.badge || product.isChefChoice) {
        badgeEl.textContent = product.badge || 'Elección del Chef';
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }
    
    // Actualizar descripción
    if (descEl) {
      // Si hay descripción en el producto, usarla; si no, usar una descripción por defecto
      if (product.description) {
        descEl.textContent = product.description;
      } else if (product.ingredients && product.ingredients.length > 0) {
        descEl.textContent = `Una deliciosa opción con ${product.ingredients.join(', ').toLowerCase()}.`;
      } else {
        descEl.textContent = `Disfruta de nuestro ${product.name}, elaborado con ingredientes frescos y de la más alta calidad.`;
      }
    }
    
    // Actualizar ingredientes - limpiar contenido anterior primero
    if (ingredientsContainer) {
      ingredientsContainer.innerHTML = '';
      
      // Si hay ingredientes en el producto, mostrarlos
      if (product.ingredients && Array.isArray(product.ingredients) && product.ingredients.length > 0) {
        const sectionHTML = `
<section>
<h3 class="text-[#171212] dark:text-white text-lg font-bold pb-3">Ingredientes</h3>
<div class="grid grid-cols-1 gap-3">
${product.ingredients.map(ingredient => {
  // Iconos según tipo de ingrediente
  let icon = 'nutrition';
  let iconColor = 'green-600';
  let bgColor = 'green-100';
  
  const ingredientLower = (ingredient || '').toLowerCase();
  if (ingredientLower.includes('salsa') || ingredientLower.includes('mayo')) {
    icon = 'liquor';
    iconColor = 'orange-600';
    bgColor = 'orange-100';
  } else if (ingredientLower.includes('picante') || ingredientLower.includes('spicy')) {
    icon = 'local_fire_department';
    iconColor = 'red-600';
    bgColor = 'red-100';
  } else if (ingredientLower.includes('tempura') || ingredientLower.includes('crunch')) {
    icon = 'grain';
    iconColor = 'yellow-600';
    bgColor = 'yellow-100';
  }
  
  return `
<div class="flex items-center gap-3 p-4 rounded-xl border border-[#171212]/10 dark:border-white/10 bg-white dark:bg-white/5">
<div class="w-10 h-10 rounded-lg bg-${bgColor} flex items-center justify-center text-${iconColor}">
<span class="material-symbols-outlined">${icon}</span>
</div>
<div>
<p class="font-bold text-sm dark:text-white">${ingredient || ''}</p>
</div>
</div>`;
}).join('')}
</div>
</section>
`;
        ingredientsContainer.innerHTML = sectionHTML;
      } else {
        // Si no hay ingredientes específicos, mostrar mensaje
        ingredientsContainer.innerHTML = `
<section>
<h3 class="text-[#171212] dark:text-white text-lg font-bold pb-3">Descripción</h3>
<p class="text-[#171212]/70 dark:text-white/70 text-base font-normal leading-relaxed">
Este producto está elaborado con ingredientes frescos y de la más alta calidad.
</p>
</section>
`;
      }
      
      // Agregar botón de "Agregar al carrito" al final
      const buttonSection = `
<div class="h-4"></div>
<section class="sticky bottom-0 bg-background-light dark:bg-background-dark pt-4 pb-6">
<button onclick="addProductToCartFromDetail()" class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] text-base">
<span class="material-symbols-outlined">add_shopping_cart</span>
<span>Agregar al Carrito - ${formatPrice(product.price)}</span>
</button>
</section>
`;
      ingredientsContainer.innerHTML += buttonSection;
    }
  });
}
