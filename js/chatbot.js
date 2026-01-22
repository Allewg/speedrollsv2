// ========== CHATBOT CON IA (GOOGLE GEMINI) ==========

// Configuración
// IMPORTANTE: Para obtener tu API key de Google Gemini:
// 1. Ve a https://makersuite.google.com/app/apikey
// 2. Inicia sesión con tu cuenta de Google
// 3. Crea una nueva API key
// 4. Reemplaza 'TU_API_KEY_AQUI' con tu API key real
// 
// NOTA: Por seguridad, considera almacenar la API key en Firebase o usar un backend proxy
const GEMINI_API_KEY = 'TU_API_KEY_AQUI'; // Reemplazar con tu API key de Google Gemini
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Si la API key no está configurada, el chatbot usará respuestas de fallback
const USE_AI = GEMINI_API_KEY && GEMINI_API_KEY !== 'TU_API_KEY_AQUI';

// Estado del chatbot
let chatbotState = {
  isOpen: false,
  conversationHistory: [],
  products: [],
  welcomeShown: false,
  actionCounter: 0, // Contador para IDs únicos de acciones
  businessInfo: {
    name: 'Speed Roll',
    description: 'Restaurante de sushi fusión con hamburguesas',
    hours: 'Lunes a Domingo: 12:00 - 23:00',
    location: 'Delivery disponible',
    phone: '+56921922139',
    deliveryCost: 3000,
    minOrder: 0
  }
};

// Inicializar chatbot
function initChatbot() {
  // Cargar productos desde Firebase
  loadProductsForChatbot();
  
  // Agregar mensaje de bienvenida
  addWelcomeMessage();
  
  // Configurar eventos
  setupChatbotEvents();
}

// Cargar productos para el contexto del chatbot
function loadProductsForChatbot() {
  if (!window.firebaseDB || !window.firebaseReady) {
    // Intentar de nuevo después de un tiempo
    setTimeout(loadProductsForChatbot, 1000);
    return;
  }
  
  const productsRef = window.firebaseRef(window.firebaseDB, 'products');
  
  window.firebaseGet(productsRef).then((snapshot) => {
    const productsData = snapshot.val() || {};
    chatbotState.products = Object.values(productsData);
  }).catch((error) => {
    console.error('Error al cargar productos para chatbot:', error);
  });
  
  // También escuchar cambios en tiempo real
  if (window.firebaseOnValue) {
    window.firebaseOnValue(productsRef, (snapshot) => {
      const productsData = snapshot.val() || {};
      chatbotState.products = Object.values(productsData);
    });
  }
}

// Configurar eventos del chatbot
function setupChatbotEvents() {
  const input = document.getElementById('chatbotInput');
  if (input) {
    input.addEventListener('focus', () => {
      // Scroll al final cuando se enfoca el input
      scrollChatToBottom();
    });
  }
}

// Toggle chatbot (abrir/cerrar)
function toggleChatbot() {
  const window = document.getElementById('chatbotWindow');
  const button = document.getElementById('chatbotButton');
  const buttonIcon = document.getElementById('chatbotButtonIcon');
  
  if (!window || !button) return;
  
  chatbotState.isOpen = !chatbotState.isOpen;
  
  if (chatbotState.isOpen) {
    window.classList.remove('hidden');
    buttonIcon.textContent = 'close';
    scrollChatToBottom();
    document.getElementById('chatbotInput')?.focus();
  } else {
    window.classList.add('hidden');
    buttonIcon.textContent = 'chat';
  }
}

// Manejar tecla Enter en el input
function handleChatbotKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatbotMessage();
  }
}

// Enviar mensaje del usuario
async function sendChatbotMessage() {
  const input = document.getElementById('chatbotInput');
  if (!input) return;
  
  const message = input.value.trim();
  if (!message) return;
  
  // Limpiar input
  input.value = '';
  
  // Agregar mensaje del usuario
  addMessageToChat('user', message);
  
  // Detectar acciones automáticas (pero no ejecutarlas todavía)
  const autoActions = detectAutoActions(message);
  let hasAutoAction = autoActions.length > 0 && autoActions.some(a => a.autoExecute);
  
  // Mostrar indicador de escritura
  showTypingIndicator();
  
  try {
    // Obtener respuesta del chatbot
    const response = await getChatbotResponse(message);
    
    // Ocultar indicador de escritura
    hideTypingIndicator();
    
    // Agregar respuesta del asistente
    addMessageToChat('assistant', response.text, response.actions);
    
    // Ejecutar acciones automáticas detectadas antes o después de la respuesta
    const actionsToExecute = [];
    
    // Agregar acciones automáticas detectadas antes
    if (hasAutoAction) {
      actionsToExecute.push(...autoActions.filter(a => a.autoExecute));
    }
    
    // Agregar acciones detectadas en la respuesta que deben ejecutarse automáticamente
    if (response.actions.length > 0) {
      const clearActions = response.actions.filter(action => shouldAutoExecute(action, message));
      clearActions.forEach(action => {
        // Evitar duplicados
        const exists = actionsToExecute.some(a => 
          a.type === action.type && 
          (a.productName === action.productName || a.category === action.category)
        );
        if (!exists) {
          actionsToExecute.push(action);
        }
      });
    }
    
    // Ejecutar acciones automáticas
    if (actionsToExecute.length > 0) {
      // Mostrar mensaje de confirmación
      setTimeout(() => {
        const actionMessages = {
          'navigate_product': 'Te estoy mostrando el producto...',
          'filter_category': 'Filtrando la categoría...',
          'navigate_menu': 'Abriendo el menú...',
          'navigate_cart': 'Abriendo tu carrito...'
        };
        const firstAction = actionsToExecute[0];
        const message = actionMessages[firstAction.type] || 'Ejecutando acción...';
        addMessageToChat('assistant', `🔄 ${message}`, []);
      }, 500);
      
      // Ejecutar acciones después de un pequeño delay
      actionsToExecute.forEach((action, index) => {
        setTimeout(() => {
          executeChatbotAction(action.type, JSON.stringify(action));
        }, 1000 + (index * 300)); // Delay escalonado si hay múltiples acciones
      });
    }
    
    // Guardar en historial
    chatbotState.conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: response.text }
    );
    
    // Limitar historial a últimos 10 mensajes
    if (chatbotState.conversationHistory.length > 20) {
      chatbotState.conversationHistory = chatbotState.conversationHistory.slice(-20);
    }
    
  } catch (error) {
    console.error('Error al obtener respuesta del chatbot:', error);
    hideTypingIndicator();
    addMessageToChat('assistant', 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.');
  }
}

// Obtener respuesta del chatbot usando Gemini
async function getChatbotResponse(userMessage) {
  // Si la API key no está configurada, usar fallback
  if (!USE_AI) {
    const fallbackResponse = getFallbackResponse(userMessage);
    const actions = detectActions(fallbackResponse, userMessage);
    return {
      text: fallbackResponse,
      actions: actions
    };
  }
  
  // Construir contexto con información del menú y negocio
  const context = buildChatbotContext();
  
  // Construir prompt para Gemini
  const prompt = buildPrompt(context, userMessage);
  
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Respuesta inválida de la API');
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Procesar respuesta para detectar acciones
    const actions = detectActions(responseText, userMessage);
    
    return {
      text: responseText,
      actions: actions
    };
    
  } catch (error) {
    console.error('Error en Gemini API:', error);
    
    // Fallback: respuesta básica sin IA
    const fallbackResponse = getFallbackResponse(userMessage);
    const actions = detectActions(fallbackResponse, userMessage);
    
    return {
      text: fallbackResponse + '\n\n(Nota: Usando modo básico. Configura la API key de Gemini para respuestas más inteligentes.)',
      actions: actions
    };
  }
}

// Construir contexto para el chatbot
function buildChatbotContext() {
  const products = chatbotState.products || [];
  
  // Formatear productos por categoría
  const productsByCategory = {};
  products.forEach(product => {
    const category = product.category || 'Sin categoría';
    if (!productsByCategory[category]) {
      productsByCategory[category] = [];
    }
    productsByCategory[category].push({
      name: product.name,
      price: product.price,
      description: product.description || '',
      ingredients: product.ingredients || ''
    });
  });
  
  // Crear texto de productos
  let productsText = 'PRODUCTOS DISPONIBLES:\n\n';
  Object.keys(productsByCategory).forEach(category => {
    productsText += `${category.toUpperCase()}:\n`;
    productsByCategory[category].forEach(product => {
      productsText += `- ${product.name}: $${product.price.toLocaleString()}`;
      if (product.description) {
        productsText += ` - ${product.description}`;
      }
      productsText += '\n';
    });
    productsText += '\n';
  });
  
  return {
    products: productsText,
    businessInfo: chatbotState.businessInfo,
    productsList: products
  };
}

// Construir prompt para Gemini
function buildPrompt(context, userMessage) {
  return `Eres un asistente virtual amigable y profesional para Speed Roll, un restaurante de sushi fusión con hamburguesas.

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${context.businessInfo.name}
- Descripción: ${context.businessInfo.description}
- Horarios: ${context.businessInfo.hours}
- Ubicación: ${context.businessInfo.location}
- Teléfono: ${context.businessInfo.phone}
- Costo de delivery: $${context.businessInfo.deliveryCost.toLocaleString()}

${context.products}

INSTRUCCIONES:
1. Responde de forma amigable, profesional y concisa en español.
2. Si el usuario pregunta sobre productos, usa la información de productos disponibles arriba.
3. Si pregunta sobre precios, menciona los precios exactos.
4. Si pregunta sobre delivery, menciona el costo de $${context.businessInfo.deliveryCost.toLocaleString()}.
5. Si el usuario quiere VER un producto específico (dice "ver X", "quiero ver X", "muéstrame X"), menciona el nombre exacto del producto en tu respuesta para que el sistema pueda navegar automáticamente.
6. Si pregunta sobre una categoría específica (sushi burger, gohan, etc.), menciona el nombre de la categoría en tu respuesta.
7. Si pregunta sobre recomendaciones, sugiere productos populares o de la categoría "Elección del Chef" y menciona sus nombres exactos.
8. Si el usuario quiere ver el menú completo, menciona "menú" o "productos" en tu respuesta.
9. Mantén las respuestas breves (máximo 3-4 oraciones).
10. Si no sabes algo, admítelo y ofrece ayudar de otra manera.
11. Cuando sugieras acciones, sé específico con los nombres de productos o categorías para que el sistema pueda ejecutarlas automáticamente.

HISTORIAL DE CONVERSACIÓN:
${chatbotState.conversationHistory.slice(-6).map(msg => 
  `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`
).join('\n')}

Usuario: ${userMessage}
Asistente:`;
}

// Detectar acciones automáticas antes de obtener respuesta de IA
function detectAutoActions(userMessage) {
  const actions = [];
  const lowerMessage = userMessage.toLowerCase().trim();
  
  // Patrones para acciones automáticas claras (más flexibles)
  const actionKeywords = {
    'ver': ['ver', 'mostrar', 'muéstrame', 'muestra', 'quiero ver', 'dame', 'déjame ver', 'necesito ver'],
    'categorías': {
      'sushi burger': ['sushi burger', 'sushi burgers', 'burger', 'burgers'],
      'gohan': ['gohan'],
      'sushipleto': ['sushipleto', 'sushipletos'],
      'fries': ['fries', 'papas fritas', 'papas'],
      'bebestibles': ['bebestibles', 'bebidas', 'bebida'],
      'salsas': ['salsas', 'salsa']
    },
    'menú': ['menú', 'menu', 'productos', 'carta'],
    'carrito': ['carrito', 'pedido', 'orden', 'mi pedido', 'mi orden']
  };
  
  // Verificar si hay intención de "ver" algo
  const hasViewIntent = actionKeywords['ver'].some(keyword => lowerMessage.includes(keyword));
  
  if (!hasViewIntent) {
    return actions; // Si no hay intención de ver, no ejecutar acciones automáticas
  }
  
  // Detectar categoría específica
  for (const [categoryKey, keywords] of Object.entries(actionKeywords['categorías'])) {
    const hasCategory = keywords.some(keyword => lowerMessage.includes(keyword));
    if (hasCategory) {
      actions.push({
        type: 'filter_category',
        label: `Ver ${categoryKey}`,
        category: categoryKey,
        autoExecute: true
      });
      return actions; // Retornar inmediatamente si encontramos una categoría
    }
  }
  
  // Detectar producto específico
  chatbotState.products.forEach(product => {
    const productNameLower = product.name.toLowerCase();
    const productWords = productNameLower.split(/\s+/);
    
    // Buscar coincidencias con palabras clave del producto
    const hasProductMatch = productWords.some(word => {
      if (word.length > 3) {
        return lowerMessage.includes(word);
      }
      return false;
    }) || lowerMessage.includes(productNameLower);
    
    if (hasProductMatch) {
      actions.push({
        type: 'navigate_product',
        label: `Ver ${product.name}`,
        productName: product.name,
        autoExecute: true
      });
      return actions; // Retornar inmediatamente si encontramos un producto
    }
  });
  
  // Detectar menú
  const hasMenu = actionKeywords['menú'].some(keyword => lowerMessage.includes(keyword));
  if (hasMenu) {
    actions.push({
      type: 'navigate_menu',
      label: 'Ver Menú Completo',
      autoExecute: true
    });
    return actions;
  }
  
  // Detectar carrito
  const hasCart = actionKeywords['carrito'].some(keyword => lowerMessage.includes(keyword));
  if (hasCart) {
    actions.push({
      type: 'navigate_cart',
      label: 'Ver Carrito',
      autoExecute: true
    });
    return actions;
  }
  
  return actions;
}

// Determinar si una acción debe ejecutarse automáticamente
function shouldAutoExecute(action, userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Si la acción tiene autoExecute, ejecutarla
  if (action.autoExecute) {
    return true;
  }
  
  // Patrones que indican intención clara de acción
  const actionPatterns = {
    'navigate_product': /(?:ver|mostrar|quiero ver|muéstrame|dame|quiero)\s+([^.!?]+)/i,
    'filter_category': /(?:ver|mostrar|quiero ver|muéstrame)\s+(?:los|las|el|la)?\s*(sushi burger|gohan|sushipleto|fries|bebestibles|salsas)/i,
    'navigate_menu': /(?:ver|mostrar|quiero ver|muéstrame|dame)\s+(?:el|los)?\s*(?:menú|menu|productos)/i,
    'navigate_cart': /(?:ver|mostrar|quiero ver|muéstrame|dame)\s+(?:el|mi)?\s*(?:carrito|pedido|orden)/i
  };
  
  const pattern = actionPatterns[action.type];
  if (pattern && pattern.test(lowerMessage)) {
    return true;
  }
  
  return false;
}

// Detectar acciones en la respuesta
function detectActions(responseText, userMessage) {
  const actions = [];
  const lowerText = responseText.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();
  
  // Detectar si menciona un producto específico (buscar coincidencias parciales)
  chatbotState.products.forEach(product => {
    const productNameLower = product.name.toLowerCase();
    const productWords = productNameLower.split(/\s+/);
    
    // Buscar coincidencias de palabras clave del producto
    const hasMatch = productWords.some(word => {
      if (word.length > 3) { // Solo palabras de más de 3 caracteres
        return lowerMessage.includes(word) || lowerText.includes(word);
      }
      return false;
    }) || lowerMessage.includes(productNameLower) || lowerText.includes(productNameLower);
    
    // También buscar en la respuesta de la IA si menciona el producto
    const responseHasProduct = lowerText.includes(productNameLower) || 
                               productWords.some(word => word.length > 3 && lowerText.includes(word));
    
    if (hasMatch || responseHasProduct) {
      // Evitar duplicados
      const exists = actions.some(a => a.productName === product.name);
      if (!exists) {
        // Marcar como auto-ejecutable si hay intención clara de "ver"
        const wantsToSee = lowerMessage.includes('ver') || lowerMessage.includes('mostrar') || 
                          lowerMessage.includes('quiero') || lowerMessage.includes('muéstrame');
        
        actions.push({
          type: 'navigate_product',
          label: `Ver ${product.name}`,
          productName: product.name,
          autoExecute: wantsToSee || responseHasProduct
        });
      }
    }
  });
  
  // Detectar si menciona una categoría
  const categories = [
    { key: 'sushi burger', label: 'Sushi Burgers' },
    { key: 'gohan', label: 'Gohan' },
    { key: 'sushipleto', label: 'Sushipletos' },
    { key: 'fries', label: 'Fries' },
    { key: 'bebestibles', label: 'Bebestibles' },
    { key: 'salsas', label: 'Salsas' }
  ];
  
  categories.forEach(cat => {
    const categoryLower = cat.key.toLowerCase();
    const categoryLabelLower = cat.label.toLowerCase();
    const hasCategory = lowerMessage.includes(categoryLower) || lowerText.includes(categoryLower) || 
                       lowerMessage.includes(categoryLabelLower) || lowerText.includes(categoryLabelLower);
    
    if (hasCategory) {
      const exists = actions.some(a => a.category === cat.key);
      if (!exists) {
        // Marcar como auto-ejecutable si hay intención clara de "ver"
        const wantsToSee = lowerMessage.includes('ver') || lowerMessage.includes('mostrar') || 
                          lowerMessage.includes('quiero') || lowerMessage.includes('muéstrame');
        
        actions.push({
          type: 'filter_category',
          label: `Ver ${cat.label}`,
          category: cat.key,
          autoExecute: wantsToSee || lowerText.includes(categoryLower)
        });
      }
    }
  });
  
  // Detectar si quiere ver el menú
  if ((lowerMessage.includes('menú') || lowerMessage.includes('menu') || 
       lowerMessage.includes('ver productos') || lowerMessage.includes('productos')) &&
      !actions.some(a => a.type === 'navigate_menu')) {
    actions.push({
      type: 'navigate_menu',
      label: 'Ver Menú Completo'
    });
  }
  
  // Detectar si quiere ver el carrito
  if ((lowerMessage.includes('carrito') || lowerMessage.includes('pedido') ||
       lowerMessage.includes('orden')) && !actions.some(a => a.type === 'navigate_cart')) {
    actions.push({
      type: 'navigate_cart',
      label: 'Ver Carrito'
    });
  }
  
  return actions;
}

// Respuesta de fallback si falla la API
function getFallbackResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Respuestas básicas sin IA
  if (lowerMessage.includes('hola') || lowerMessage.includes('buenos días') || lowerMessage.includes('buenas')) {
    return '¡Hola! 👋 Bienvenido a Speed Roll. ¿En qué puedo ayudarte hoy? Puedo ayudarte con información sobre nuestro menú, precios, delivery y más.';
  }
  
  if (lowerMessage.includes('precio') || lowerMessage.includes('cuánto cuesta') || lowerMessage.includes('costo')) {
    return 'Los precios varían según el producto. Puedo ayudarte a encontrar el precio de un producto específico. ¿Qué producto te interesa?';
  }
  
  if (lowerMessage.includes('delivery') || lowerMessage.includes('domicilio') || lowerMessage.includes('envío')) {
    return `Sí, hacemos delivery! 🚚 El costo de delivery es de $${chatbotState.businessInfo.deliveryCost.toLocaleString()}. Puedes hacer tu pedido directamente desde aquí.`;
  }
  
  if (lowerMessage.includes('horario') || lowerMessage.includes('hora') || lowerMessage.includes('abierto')) {
    return `Nuestros horarios son: ${chatbotState.businessInfo.hours}. ¡Estamos aquí para servirte!`;
  }
  
  if (lowerMessage.includes('menú') || lowerMessage.includes('productos') || lowerMessage.includes('qué tienen')) {
    return 'Tenemos una gran variedad de productos: Sushi Burgers, Gohan, Sushipletos, Fries, Bebestibles y Salsas. ¿Te gustaría ver alguna categoría en particular?';
  }
  
  return 'Gracias por tu mensaje. Estoy aquí para ayudarte con información sobre nuestro menú, precios, delivery y más. ¿Qué te gustaría saber?';
}

// Agregar mensaje al chat
function addMessageToChat(role, content, actions = []) {
  const messagesContainer = document.getElementById('chatbotMessages');
  if (!messagesContainer) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chatbot-message ${role}`;
  
  let messageHTML = `
    <div class="chatbot-message-content">
      ${formatMessageContent(content)}
    </div>
  `;
  
  messageDiv.innerHTML = messageHTML;
  messagesContainer.appendChild(messageDiv);
  
  // Agregar botones de acción si hay (solo si no se ejecutaron automáticamente)
  if (actions.length > 0) {
    const nonAutoActions = actions.filter(a => !a.autoExecute);
    if (nonAutoActions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.style.marginTop = '0.5rem';
      actionsContainer.style.display = 'flex';
      actionsContainer.style.flexWrap = 'wrap';
      actionsContainer.style.gap = '0.5rem';
      
      nonAutoActions.forEach((action) => {
        const button = document.createElement('button');
        button.className = 'chatbot-action-button';
        button.textContent = action.label;
        button.addEventListener('click', (e) => {
          e.preventDefault();
          executeChatbotAction(action.type, action);
        });
        actionsContainer.appendChild(button);
      });
      
      messageDiv.appendChild(actionsContainer);
    }
  }
  
  scrollChatToBottom();
}

// Formatear contenido del mensaje
function formatMessageContent(content) {
  // Convertir saltos de línea a <br>
  content = escapeHtml(content).replace(/\n/g, '<br>');
  
  // Detectar y formatear precios ($número)
  content = content.replace(/\$(\d+)/g, '<strong class="text-primary">$$1</strong>');
  
  return content;
}

// Escapar HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Ejecutar acción del chatbot
function executeChatbotAction(actionType, actionDataJson) {
  try {
    let actionData;
    if (typeof actionDataJson === 'string') {
      try {
        actionData = JSON.parse(actionDataJson);
      } catch (e) {
        console.error('Error parsing action data:', e, actionDataJson);
        return;
      }
    } else {
      actionData = actionDataJson;
    }
    
    switch (actionType) {
      case 'navigate_product':
        if (actionData.productName) {
          // Usar la función global selectProduct
          if (typeof selectProduct === 'function') {
            selectProduct(actionData.productName);
          } else if (window.selectProduct) {
            window.selectProduct(actionData.productName);
          }
          // Navegar a la página del producto
          if (typeof router !== 'undefined' && router.navigate) {
            router.navigate('product');
          }
          // Cerrar chatbot después de navegar
          setTimeout(() => {
            toggleChatbot();
          }, 500);
        }
        break;
        
      case 'filter_category':
        if (actionData.category) {
          // Navegar al menú primero
          if (typeof router !== 'undefined' && router.navigate) {
            router.navigate('menu');
          }
          // Filtrar por categoría después de un pequeño delay
          setTimeout(() => {
            if (typeof filterByCategory === 'function') {
              filterByCategory(actionData.category);
            } else if (window.filterByCategory) {
              window.filterByCategory(actionData.category);
            }
            // Cerrar chatbot después de filtrar
            setTimeout(() => {
              toggleChatbot();
            }, 300);
          }, 300);
        }
        break;
        
      case 'navigate_menu':
        if (typeof router !== 'undefined' && router.navigate) {
          router.navigate('menu');
        }
        // Cerrar chatbot después de navegar
        setTimeout(() => {
          toggleChatbot();
        }, 500);
        break;
        
      case 'navigate_cart':
        if (typeof router !== 'undefined' && router.navigate) {
          router.navigate('orders');
        }
        // Cerrar chatbot después de navegar
        setTimeout(() => {
          toggleChatbot();
        }, 500);
        break;
        
      case 'add_to_cart':
        if (actionData.productName && typeof addToCart === 'function') {
          // Buscar el producto
          const product = chatbotState.products.find(p => p.name === actionData.productName);
          if (product) {
            addToCart(product.name, 1);
            addMessageToChat('assistant', `✅ He agregado "${product.name}" a tu carrito. ¿Quieres agregar algo más?`, []);
          }
        }
        break;
    }
  } catch (error) {
    console.error('Error al ejecutar acción:', error);
  }
}

// Mostrar indicador de escritura
function showTypingIndicator() {
  const messagesContainer = document.getElementById('chatbotMessages');
  if (!messagesContainer) return;
  
  const typingDiv = document.createElement('div');
  typingDiv.id = 'chatbotTyping';
  typingDiv.className = 'chatbot-message assistant';
  typingDiv.innerHTML = `
    <div class="chatbot-typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  
  messagesContainer.appendChild(typingDiv);
  scrollChatToBottom();
}

// Ocultar indicador de escritura
function hideTypingIndicator() {
  const typingDiv = document.getElementById('chatbotTyping');
  if (typingDiv) {
    typingDiv.remove();
  }
}

// Scroll al final del chat
function scrollChatToBottom() {
  const messagesContainer = document.getElementById('chatbotMessages');
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Agregar mensaje de bienvenida
function addWelcomeMessage() {
  if (chatbotState.welcomeShown) return;
  
  setTimeout(() => {
    if (!chatbotState.welcomeShown) {
      addMessageToChat('assistant', `¡Hola! 👋 Soy el asistente de Speed Roll. 

Puedo ayudarte con:
• Información sobre productos y precios
• Recomendaciones personalizadas
• Información sobre delivery y horarios
• Cualquier pregunta sobre nuestro menú

¿En qué puedo ayudarte hoy?`);
      chatbotState.welcomeShown = true;
    }
  }, 500);
}

// Exportar funciones globales
window.toggleChatbot = toggleChatbot;
window.handleChatbotKeyPress = handleChatbotKeyPress;
window.sendChatbotMessage = sendChatbotMessage;
window.executeChatbotAction = executeChatbotAction;
window.initChatbot = initChatbot;

// Inicializar cuando el DOM esté listo
function initializeChatbot() {
  // Esperar a que Firebase y otros scripts estén listos
  const checkReady = setInterval(() => {
    if (window.firebaseReady && window.firebaseDB && typeof router !== 'undefined') {
      clearInterval(checkReady);
      initChatbot();
    }
  }, 500);
  
  // Timeout de seguridad
  setTimeout(() => {
    clearInterval(checkReady);
    if (!chatbotState.products.length) {
      // Intentar inicializar de todas formas
      initChatbot();
    }
  }, 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChatbot);
} else {
  initializeChatbot();
}
