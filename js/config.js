// Configuración de Firebase
// Este archivo debe ser cargado como módulo ES6 debido a los imports de Firebase

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
import { getDatabase, ref, set, get, onValue, off } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCAu96Nk2vciukH5L2PNP8IsaNz8cuxnlU",
  authDomain: "speedrolls.firebaseapp.com",
  databaseURL: "https://speedrolls-default-rtdb.firebaseio.com",
  projectId: "speedrolls",
  storageBucket: "speedrolls.firebasestorage.app",
  messagingSenderId: "721891301536",
  appId: "1:721891301536:web:c4e8146405ea12b13751c5",
  measurementId: "G-EFGM3FYB0F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Hacer disponible globalmente
window.firebaseDB = database;
window.firebaseRef = ref;
window.firebaseSet = set;
window.firebaseGet = get;
window.firebaseOnValue = onValue;
window.firebaseOff = off;
window.firebaseReady = true;

// Constantes globales
const ADMIN_CODE = '123456'; // Código de acceso (cambiar por el código real)

// Variables globales del estado de la aplicación
// Nota: Estas variables se actualizarán desde products.js
let MENU_ITEMS = []; // Array con todos los items del menú (se carga dinámicamente desde Firebase)
let currentCategoryFilter = 'all'; // Filtro de categoría actual
let productsListenerUnsubscribe = null;
let stockListenerActive = false;
let stockListenerUnsubscribe = null;
let selectedProductName = null; // Variable global para el producto seleccionado

// Variables globales para el producto actual
let selectedSauces = ['mayonesa']; // Mayonesa seleccionada por defecto
let selectedExtras = [];
const baseProductPrice = 18.50;

// Variables globales para el carrito
const processingButtons = new Set();
let isAddingToCart = false;

// Orden de categorías para el menú y home
const categoryOrder = [
  'sushi burger',
  'gohan',
  'sushipleto',
  'fries',
  'bebestibles',
  'promociones',
  'salsas'
];

// Exportar constantes y variables globales al objeto window para compatibilidad
window.MENU_ITEMS = MENU_ITEMS;
window.currentCategoryFilter = currentCategoryFilter;
window.selectedSauces = selectedSauces;
window.selectedExtras = selectedExtras;
window.baseProductPrice = baseProductPrice;
window.ADMIN_CODE = ADMIN_CODE;
window.categoryOrder = categoryOrder;
window.processingButtons = processingButtons;
window.isAddingToCart = isAddingToCart;
window.productsListenerUnsubscribe = productsListenerUnsubscribe;
window.stockListenerActive = stockListenerActive;
window.stockListenerUnsubscribe = stockListenerUnsubscribe;
