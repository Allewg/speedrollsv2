// ========== INICIALIZACIÓN DE LA APLICACIÓN ==========

// Inicializar el router cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  router.init();
  
  // Inicializar badges del carrito
  updateCartBadges();
  
  // Esperar a que Firebase esté listo y luego cargar productos
  const checkFirebaseAndInit = setInterval(() => {
    if (window.firebaseReady && window.firebaseDB) {
      clearInterval(checkFirebaseAndInit);
      
      // Cargar productos y generar menú
      loadProductsFromFirebase((products) => {
        generateCategoryFilters(products);
        generateMenuHTML(products);
        generateHomeCategories(products);
        generateChefChoice(products);
        updatePromoHeroSlide(products);
        generateExtraSauces(products);
        
        // Configurar listener en tiempo real para productos
        listenToProductsChanges((products) => {
          generateCategoryFilters(products);
          generateMenuHTML(products);
          generateHomeCategories(products);
          generateChefChoice(products);
          updatePromoHeroSlide(products);
          generateExtraSauces(products);
        });
      });
      
      // Si estamos en la página del menú, actualizar el estado de stock
      if (router.currentPage === 'menu') {
        setTimeout(() => {
          updateMenuStockStatus();
        }, 500);
      }
    }
  }, 100);
  
  // Timeout de seguridad después de 3 segundos
  setTimeout(() => {
    clearInterval(checkFirebaseAndInit);
    if (window.firebaseReady && window.firebaseDB) {
      loadProductsFromFirebase((products) => {
        if (products.length > 0) {
          generateCategoryFilters(products);
          generateMenuHTML(products);
          generateHomeCategories(products);
          generateChefChoice(products);
          updatePromoHeroSlide(products);
          generateExtraSauces(products);
          if (router.currentPage === 'menu') {
            updateMenuStockStatus();
          }
        }
      });
    }
  }, 3000);
  
  // Agregar funcionalidad a botones de cantidad usando delegación de eventos
  // Usar CAPTURE phase para ejecutar ANTES que los onclick inline
  document.addEventListener('click', function(e) {
    // Verificar si el click es en un botón o en su icono
    let btn = e.target.closest('button');
    if (!btn) {
      // Si es un span dentro de un botón
      const span = e.target.closest('span.material-symbols-outlined');
      if (span) {
        btn = span.closest('button');
      }
    }
    
    if (!btn) return;
    
    // Verificar si el botón tiene onclick o data attribute que indique que ya tiene manejador
    const hasOnclick = btn.getAttribute('onclick');
    const hasDataHandler = btn.dataset.handled === 'true';
    const isProcessing = btn.dataset.processing === 'true';
    
    // Verificar si es un botón "Agregar" (contiene texto "Agregar") - estos tienen su propio manejador
    const buttonText = btn.textContent || '';
    const isAddButton = buttonText.toLowerCase().includes('agregar');
    
    // Si es un botón "Agregar", detener la propagación y NO procesar
    if (isAddButton) {
      // Detener completamente el evento para que solo el onclick se ejecute
      e.stopImmediatePropagation();
      return;
    }
    
    // Si tiene onclick, NO procesar con el listener global (salir temprano)
    if (hasOnclick || hasDataHandler || isProcessing) {
      return; // Salir temprano para evitar procesamiento adicional
    }
    
    // Buscar el icono dentro del botón
    const icon = btn.querySelector('span.material-symbols-outlined');
    if (!icon) return;
    
    // Verificar si está en un contenedor de cantidad
    const quantityContainer = btn.closest('.flex.flex-col.items-center');
    if (!quantityContainer) return;
    
    // Botones de incrementar (icono "add")
    // Solo procesar si está en un contenedor de cantidad y no tiene manejadores adicionales
    if (icon.textContent.trim() === 'add' || icon.textContent.includes('add')) {
      const input = quantityContainer.querySelector('input[type="number"]');
      if (input) {
        e.preventDefault();
        e.stopPropagation();
        const currentValue = parseInt(input.value) || 0;
        input.value = currentValue + 1;
        
        // Actualizar badges del carrito
        updateCartBadges();
        
        // Actualizar totales del carrito y checkout
        updateCartTotals();
      }
    }
    
    // Botones de decrementar (icono "remove")
    // Solo procesar si el botón NO tiene onclick directo (para evitar doble ejecución)
    if ((icon.textContent.trim() === 'remove' || icon.textContent.includes('remove')) && !btn.getAttribute('onclick')) {
      const input = quantityContainer.querySelector('input[type="number"]');
      if (input) {
        e.preventDefault();
        e.stopPropagation();
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
  });
  
  // Event listener delegado para selectores de salsa principal en el carrito
  document.addEventListener('change', function(e) {
    if (e.target && e.target.classList.contains('product-main-sauce')) {
      // Cuando cambia un selector de salsa principal, actualizar totales y visualización en checkout
      updateCartTotals();
      updateCheckoutSauces();
    }
  });
  
  // Permitir Enter para login de admin
  const adminCodeInput = document.getElementById('adminCode');
  if (adminCodeInput) {
    adminCodeInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handleAdminLogin();
      }
    });
  }
});
