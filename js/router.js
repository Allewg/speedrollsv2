// Sistema de routing simple
const router = {
  currentPage: 'home',
  
  init() {
    // Configurar listener de autenticación si está disponible
    if (typeof window.setupAuthStateListener === 'function') {
      window.setupAuthStateListener((access) => {
        // Si el usuario perdió acceso mientras está en el panel admin, redirigir
        if (this.currentPage === 'admin' && (!access.authenticated || !access.authorized)) {
          this.navigate('admin-login');
        }
      });
    }
    
    // Navegar a la página inicial basada en el hash o por defecto 'home'
    const hash = window.location.hash.slice(1) || 'home';
    this.navigate(hash);
    
    // Escuchar cambios en el hash
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1) || 'home';
      this.navigate(hash);
    });
  },
  
  navigate(pageName) {
    // Redirigir 'profile' a 'orders' ya que no hay pantalla de perfil
    if (pageName === 'profile') {
      pageName = 'orders';
    }
    
    // Verificar autenticación para el panel de admin
    if (pageName === 'admin' || pageName === 'admin-validate') {
      // admin-validate puede ser accesible sin login (desde enlace de WhatsApp)
      if (pageName === 'admin') {
        // Verificar autenticación con Firebase Auth de forma síncrona primero
        const isAuth = typeof window.isAdminAuthenticated === 'function' ? window.isAdminAuthenticated() : false;
        if (!isAuth) {
          pageName = 'admin-login';
        } else {
          // Verificar también la whitelist de forma asíncrona
          if (typeof window.verifyAdminAccess === 'function') {
            window.verifyAdminAccess().then((access) => {
              if (!access.authenticated || !access.authorized) {
                // Redirigir al login si no está autorizado
                if (this.currentPage === 'admin') {
                  this.navigate('admin-login');
                }
              }
            }).catch((error) => {
              console.error('Error al verificar acceso:', error);
              if (this.currentPage === 'admin') {
                this.navigate('admin-login');
              }
            });
          }
        }
      }
    }
    
    // Ocultar todas las páginas
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    // Mostrar la página solicitada
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
      targetPage.classList.add('active');
      this.currentPage = pageName;
      window.location.hash = pageName;
      
      // Actualizar la barra de navegación
      this.updateNavigation(pageName);
      
      // Inicializar páginas específicas
      if (pageName === 'track') {
        setTimeout(() => {
          if (typeof initTrackingPage === 'function') {
            initTrackingPage();
          }
        }, 200);
      } else if (pageName === 'admin-validate') {
        setTimeout(() => {
          if (typeof initValidationPage === 'function') {
            initValidationPage();
          }
        }, 200);
      } else if (pageName === 'admin') {
        setTimeout(() => {
          // Inicializar tab de inventario por defecto
          if (typeof showAdminTab === 'function') {
            showAdminTab('inventory');
          }
          // Inicializar ventas si está disponible
          if (typeof initAdminSales === 'function') {
            // Se inicializará cuando se cambie a la pestaña de ventas
          }
        }, 200);
      } else if (pageName === 'admin-manual-order') {
        setTimeout(() => {
          // Inicializar página de pedido manual
          if (typeof initManualOrderPage === 'function') {
            initManualOrderPage();
          }
        }, 200);
      } else if (pageName === 'confirmation') {
        setTimeout(() => {
          // Cargar datos del pedido desde sessionStorage
          const orderDataStr = sessionStorage.getItem('orderConfirmationData');
          if (orderDataStr) {
            try {
              const orderData = JSON.parse(orderDataStr);
              if (typeof populateConfirmationPage === 'function') {
                populateConfirmationPage(orderData);
              }
            } catch (error) {
              console.error('Error al cargar datos de confirmación:', error);
            }
          }
        }, 100);
      }
      
      // Inicializar precio del producto si estamos en la página de producto
      if (pageName === 'product') {
        // Resetear selecciones cuando se navega a la página del producto
        window.selectedSauces = ['mayonesa'];
        if (window.selectedExtras !== undefined) {
          window.selectedExtras = [];
        }
        // Cargar producto seleccionado
        setTimeout(() => {
          if (typeof loadProductDetails === 'function') {
            loadProductDetails();
          }
        }, 100);
      }
      
      // Actualizar badges del carrito al navegar a cualquier página
      setTimeout(() => {
        if (typeof updateCartBadges === 'function') {
          updateCartBadges();
        }
      }, 100);
      
      // Si estamos navegando al checkout, actualizar totales y salsas
      if (pageName === 'checkout') {
        setTimeout(() => {
          if (typeof updateCheckoutTotal === 'function') {
            updateCheckoutTotal(document.getElementById('deliveryAddressSection') && !document.getElementById('deliveryAddressSection').classList.contains('hidden'));
          }
          if (typeof updateCheckoutSauces === 'function') {
            updateCheckoutSauces();
          }
        }, 100);
      }
      
      // Si estamos navegando al panel admin, generar la lista de inventario
      if (pageName === 'admin') {
        setTimeout(() => {
          if (typeof generateAdminInventory === 'function') {
            generateAdminInventory();
          }
        }, 100);
      }
      
      // Si estamos navegando al menú, cargar productos si no están cargados
      if (pageName === 'menu') {
        setTimeout(() => {
          const container = document.getElementById('menuProductsContainer');
          if (container && (container.children.length === 0 || container.innerHTML.trim() === '')) {
            if (typeof loadProductsFromFirebase === 'function') {
              loadProductsFromFirebase((products) => {
                if (typeof generateCategoryFilters === 'function') {
                  generateCategoryFilters(products);
                }
                if (typeof generateMenuHTML === 'function') {
                  generateMenuHTML(products);
                }
              });
            }
          }
          if (typeof updateMenuStockStatus === 'function') {
            updateMenuStockStatus();
          }
        }, 200);
      }
      
      // Si estamos navegando al home, actualizar categorías y productos destacados
      if (pageName === 'home') {
        setTimeout(() => {
          if (typeof loadProductsFromFirebase === 'function') {
            loadProductsFromFirebase((products) => {
              if (typeof generateHomeCategories === 'function') {
                generateHomeCategories(products);
              }
              if (typeof generateChefChoice === 'function') {
                generateChefChoice(products);
              }
              if (typeof updatePromoHeroSlide === 'function') {
                updatePromoHeroSlide(products);
              }
            });
          }
        }, 200);
      }
    } else {
      console.warn(`Página "${pageName}" no encontrada`);
    }
  },
  
  updateNavigation(activePage) {
    // Actualizar los botones de la barra de navegación inferior en todas las páginas
    document.querySelectorAll('[onclick^="router.navigate"]').forEach(btn => {
      const isActive = btn.getAttribute('onclick').includes(`'${activePage}'`);
      const iconSpan = btn.querySelector('span.material-symbols-outlined');
      const textSpan = btn.querySelector('span:last-child') || btn.querySelector('p');
      
      if (isActive) {
        btn.classList.remove('text-gray-400', 'dark:text-gray-500', 'text-zinc-400');
        btn.classList.add('text-primary');
        if (iconSpan) {
          iconSpan.classList.add('font-variation-fill-1', 'font-fill');
        }
        if (textSpan) {
          textSpan.classList.remove('font-medium');
          textSpan.classList.add('font-bold');
        }
      } else {
        btn.classList.remove('text-primary');
        if (!btn.classList.contains('text-gray-400') && !btn.classList.contains('text-zinc-400')) {
          btn.classList.add('text-gray-400', 'dark:text-gray-500', 'text-zinc-400');
        }
        if (iconSpan) {
          iconSpan.classList.remove('font-variation-fill-1', 'font-fill');
        }
        if (textSpan) {
          textSpan.classList.remove('font-bold');
          if (textSpan.tagName === 'SPAN') {
            textSpan.classList.add('font-medium');
          }
        }
      }
    });
  }
};

// Hacer router disponible globalmente
window.router = router;
