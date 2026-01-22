// ========== MÓDULO DE AUTENTICACIÓN FIREBASE ==========
// Maneja toda la lógica de autenticación para el panel de administración

// Función para normalizar email (reemplazar puntos por comas para usar como key en Firebase)
function normalizeEmailForFirebase(email) {
  return email.toLowerCase().replace(/\./g, ',');
}

// Función para verificar si un email está en la whitelist de admins
async function checkAdminWhitelist(email) {
  if (!window.firebaseDB || !window.firebaseReady) {
    console.error('❌ Firebase no está disponible');
    return false;
  }

  try {
    const normalizedEmail = normalizeEmailForFirebase(email);
    
    console.log('🔍 Verificando whitelist:');
    console.log('  - Email recibido:', email);
    console.log('  - Email normalizado:', normalizedEmail);
    console.log('  - Ruta completa:', `admins/${normalizedEmail}`);
    
    const adminRef = window.firebaseRef(window.firebaseDB, `admins/${normalizedEmail}`);
    const snapshot = await window.firebaseGet(adminRef);
    
    console.log('  - Snapshot existe?', snapshot.exists());
    
    if (snapshot.exists()) {
      const adminData = snapshot.val();
      console.log('✅ Admin encontrado en whitelist:', adminData);
      return true;
    } else {
      console.log('❌ Admin NO encontrado en whitelist');
      
      // Verificar todos los admins para debugging
      try {
        const allAdminsRef = window.firebaseRef(window.firebaseDB, 'admins');
        const allSnapshot = await window.firebaseGet(allAdminsRef);
        const allAdmins = allSnapshot.val() || {};
        
        console.log('📋 Estructura completa de /admins:');
        console.log(JSON.stringify(allAdmins, null, 2));
        
        console.log('📋 Todos los admins en la base de datos:');
        Object.keys(allAdmins).forEach(key => {
          const admin = allAdmins[key];
          
          // Verificar si es un objeto admin o una propiedad directa
          if (typeof admin === 'object' && admin !== null && admin.email) {
            // Es un objeto admin (estructura correcta)
            console.log(`  - Key: "${key}"`);
            console.log(`    Email: "${admin.email}"`);
            console.log(`    Role: "${admin.role}"`);
            console.log(`    Normalizado de key: "${key}"`);
            console.log(`    Normalizado de email: "${normalizeEmailForFirebase(admin.email || '')}"`);
            console.log(`    Coincide con email recibido? ${admin.email && admin.email.toLowerCase() === email.toLowerCase() ? '✅ SÍ' : '❌ NO'}`);
            console.log(`    Coincide con normalizado? ${key === normalizedEmail ? '✅ SÍ' : '❌ NO'}`);
          } else {
            // Es una propiedad directa (estructura incorrecta)
            console.log(`  - Key: "${key}" (propiedad directa, no es un admin)`);
            console.log(`    Valor: ${JSON.stringify(admin)}`);
          }
        });
        
        // Verificar si la estructura está mal (propiedades directas en lugar de key)
        if (allAdmins.email && typeof allAdmins.email === 'string') {
          console.log('⚠️ ADVERTENCIA: La estructura parece estar incorrecta.');
          console.log('   Las propiedades están directamente en /admins en lugar de estar bajo una key de email normalizado.');
          console.log('   Debería ser: /admins/allewmella@gmail,com/email');
          console.log('   Pero parece ser: /admins/email');
        }
      } catch (err) {
        console.error('Error al leer todos los admins:', err);
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ Error al verificar whitelist:', error);
    console.error('  - Error code:', error.code);
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    return false;
  }
}

// Función para obtener el usuario actual autenticado
function getCurrentAdmin() {
  if (!window.firebaseAuth) {
    return null;
  }
  return window.firebaseAuth.currentUser;
}

// Función para verificar si hay un admin autenticado
function isAdminAuthenticated() {
  const user = getCurrentAdmin();
  return user !== null;
}

// Función para traducir errores de Firebase Auth a español
function translateAuthError(error) {
  const errorCode = error.code;
  const errorMessages = {
    'auth/invalid-email': 'El correo electrónico no es válido',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'No existe una cuenta con este correo electrónico',
    'auth/wrong-password': 'La contraseña es incorrecta',
    'auth/invalid-credential': 'Las credenciales son incorrectas',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Por favor, intenta más tarde',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
    'auth/internal-error': 'Error interno del servidor. Intenta más tarde'
  };

  return errorMessages[errorCode] || 'Error al iniciar sesión. Intenta nuevamente';
}

// Función principal para login de administrador
async function loginAdmin(email, password) {
  if (!window.firebaseAuth) {
    throw new Error('Firebase Auth no está disponible');
  }

  try {
    // Importar signInWithEmailAndPassword dinámicamente
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js");
    
    console.log('🔐 Intentando login...');
    console.log('  - Email ingresado:', email);
    console.log('  - Firebase DB disponible?', !!window.firebaseDB);
    console.log('  - Firebase Ready?', window.firebaseReady);
    
    // Autenticar con Firebase Auth
    const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Autenticación exitosa');
    console.log('  - User.email:', user.email);
    console.log('  - User.email (lowercase):', user.email ? user.email.toLowerCase() : 'null');
    console.log('  - User.uid:', user.uid);
    
    // Verificar si el email está en la whitelist de admins
    console.log('🔍 Verificando whitelist con email de Firebase Auth:', user.email);
    const isAuthorized = await checkAdminWhitelist(user.email);
    
    console.log('  - Resultado verificación:', isAuthorized ? '✅ AUTORIZADO' : '❌ NO AUTORIZADO');
    
    if (!isAuthorized) {
      console.error('❌ Usuario no autorizado. Cerrando sesión...');
      // Si no está autorizado, cerrar sesión inmediatamente
      const { signOut } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js");
      await signOut(window.firebaseAuth);
      throw new Error('Tu correo electrónico no está autorizado para acceder al panel de administración');
    }

    console.log('✅ Login completo - Usuario autorizado');
    return {
      success: true,
      user: user
    };
  } catch (error) {
    console.error('❌ Error en loginAdmin:', error);
    console.error('  - Error code:', error.code);
    console.error('  - Error message:', error.message);
    
    // Si es un error de Firebase Auth, traducirlo
    if (error.code && error.code.startsWith('auth/')) {
      throw new Error(translateAuthError(error));
    }
    
    // Si es un error personalizado (whitelist), devolverlo tal cual
    throw error;
  }
}

// Función para cerrar sesión
async function logoutAdmin() {
  if (!window.firebaseAuth) {
    return;
  }

  try {
    const { signOut } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js");
    await signOut(window.firebaseAuth);
    
    // Limpiar cualquier dato de sesión local
    sessionStorage.removeItem('adminAuthenticated');
    
    return { success: true };
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    throw new Error('Error al cerrar sesión. Intenta nuevamente');
  }
}

// Función para verificar el estado de autenticación y whitelist
async function verifyAdminAccess() {
  const user = getCurrentAdmin();
  
  if (!user) {
    return { authenticated: false, authorized: false };
  }

  const isAuthorized = await checkAdminWhitelist(user.email);
  
  if (!isAuthorized) {
    // Si el usuario ya no está en la whitelist, cerrar sesión
    await logoutAdmin();
    return { authenticated: false, authorized: false };
  }

  return { authenticated: true, authorized: true, user: user };
}

// Configurar listener de cambios de autenticación
function setupAuthStateListener(callback) {
  if (!window.firebaseAuth) {
    return null;
  }

  // Importar onAuthStateChanged dinámicamente cuando se necesite
  import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js").then(({ onAuthStateChanged }) => {
    onAuthStateChanged(window.firebaseAuth, async (user) => {
      if (user) {
        // Verificar whitelist cuando el usuario cambia
        const access = await verifyAdminAccess();
        if (callback) {
          callback(access);
        }
      } else {
        if (callback) {
          callback({ authenticated: false, authorized: false });
        }
      }
    });
  }).catch((error) => {
    console.error('Error al configurar listener de autenticación:', error);
  });
}

// Exportar funciones globalmente
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.isAdminAuthenticated = isAdminAuthenticated;
window.getCurrentAdmin = getCurrentAdmin;
window.checkAdminWhitelist = checkAdminWhitelist;
window.verifyAdminAccess = verifyAdminAccess;
window.setupAuthStateListener = setupAuthStateListener;
window.translateAuthError = translateAuthError;
