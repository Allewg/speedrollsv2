// ========== ADMINISTRACIÓN DE VENTAS Y ANALYTICS ==========

let salesChart = null;
let paymentChart = null;
let currentSalesPeriod = 'daily';
let salesData = [];
let salesListener = null;

// Inicializar panel de ventas
function initAdminSales() {
  loadSalesData();
  
  // Escuchar cambios en tiempo real
  if (window.firebaseDB && window.firebaseReady) {
    salesListener = listenToAllOrders((orders) => {
      salesData = orders;
      updateSalesDashboard();
    });
  }
}

// Cargar datos de ventas
async function loadSalesData() {
  try {
    const orders = await getAllOrders();
    salesData = orders;
    updateSalesDashboard();
  } catch (error) {
    console.error('Error al cargar datos de ventas:', error);
  }
}

// Actualizar dashboard de ventas
function updateSalesDashboard() {
  updateKPIs();
  updateSalesChart();
  updateTopProducts();
  updatePaymentMethods();
  updateDeliveryTypes();
  updateMonthlyTarget();
}

// Actualizar KPIs principales
function updateKPIs() {
  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart = now - (7 * 24 * 60 * 60 * 1000);
  
  // Inicio del mes actual (día 1 del mes actual a las 00:00:00)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  // Inicio del año actual (1 de enero a las 00:00:00)
  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);
  
  // Filtrar solo pedidos entregados
  const deliveredOrders = salesData.filter(o => o.status === 'entregado');
  
  // Ventas de hoy
  const todayOrders = deliveredOrders.filter(o => o.createdAt >= todayStart);
  const todaySales = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Ventas de la semana
  const weekOrders = deliveredOrders.filter(o => o.createdAt >= weekStart);
  const weekSales = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Ventas del mes actual
  const monthOrders = deliveredOrders.filter(o => o.createdAt >= monthStart.getTime());
  const monthSales = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Ventas del año actual
  const yearOrders = deliveredOrders.filter(o => o.createdAt >= yearStart.getTime());
  const yearSales = yearOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Promedio de ticket
  const avgTicket = deliveredOrders.length > 0 
    ? deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0) / deliveredOrders.length 
    : 0;
  
  // Total de pedidos entregados
  const totalDelivered = deliveredOrders.length;
  
  // Comparaciones con período anterior
  const prevTodayStart = todayStart - (24 * 60 * 60 * 1000);
  const prevTodayOrders = deliveredOrders.filter(o => o.createdAt >= prevTodayStart && o.createdAt < todayStart);
  const prevTodaySales = prevTodayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  const prevWeekStart = weekStart - (7 * 24 * 60 * 60 * 1000);
  const prevWeekOrders = deliveredOrders.filter(o => o.createdAt >= prevWeekStart && o.createdAt < weekStart);
  const prevWeekSales = prevWeekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Mes anterior (mes completo)
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const prevMonthEnd = new Date(monthStart);
  prevMonthEnd.setMilliseconds(-1);
  const prevMonthOrders = deliveredOrders.filter(o => 
    o.createdAt >= prevMonthStart.getTime() && o.createdAt < prevMonthEnd.getTime()
  );
  const prevMonthSales = prevMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Año anterior (año completo)
  const prevYearStart = new Date(yearStart);
  prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
  const prevYearEnd = new Date(yearStart);
  prevYearEnd.setMilliseconds(-1);
  const prevYearOrders = deliveredOrders.filter(o => 
    o.createdAt >= prevYearStart.getTime() && o.createdAt < prevYearEnd.getTime()
  );
  const prevYearSales = prevYearOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  const prevAvgTicket = prevWeekOrders.length > 0 
    ? prevWeekOrders.reduce((sum, o) => sum + (o.total || 0), 0) / prevWeekOrders.length 
    : 0;
  
  const prevTotalDelivered = prevWeekOrders.length;
  
  // Calcular cambios porcentuales
  const todayChange = prevTodaySales > 0 ? ((todaySales - prevTodaySales) / prevTodaySales * 100) : 0;
  const weekChange = prevWeekSales > 0 ? ((weekSales - prevWeekSales) / prevWeekSales * 100) : 0;
  const monthChange = prevMonthSales > 0 ? ((monthSales - prevMonthSales) / prevMonthSales * 100) : 0;
  const yearChange = prevYearSales > 0 ? ((yearSales - prevYearSales) / prevYearSales * 100) : 0;
  const avgTicketChange = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket * 100) : 0;
  const totalChange = prevTotalDelivered > 0 ? ((totalDelivered - prevTotalDelivered) / prevTotalDelivered * 100) : 0;
  
  // Actualizar UI - Hoy
  document.getElementById('salesToday').textContent = formatCurrency(todaySales);
  document.getElementById('salesTodayChange').textContent = formatPercentChange(todayChange);
  document.getElementById('salesTodayTrend').textContent = todayChange >= 0 ? 'trending_up' : 'trending_down';
  document.getElementById('salesTodayChange').className = `text-[10px] font-bold ${todayChange >= 0 ? 'text-green-600' : 'text-red-500'}`;
  
  // Actualizar UI - Semanal
  document.getElementById('salesWeekly').textContent = formatCurrency(weekSales);
  document.getElementById('salesWeeklyChange').textContent = formatPercentChange(weekChange);
  document.getElementById('salesWeeklyTrend').textContent = weekChange >= 0 ? 'trending_up' : 'trending_down';
  document.getElementById('salesWeeklyChange').className = `text-[10px] font-bold ${weekChange >= 0 ? 'text-green-600' : 'text-red-500'}`;
  
  // Actualizar UI - Mensual
  document.getElementById('salesMonthly').textContent = formatCurrency(monthSales);
  document.getElementById('salesMonthlyChange').textContent = formatPercentChange(monthChange);
  document.getElementById('salesMonthlyTrend').textContent = monthChange >= 0 ? 'trending_up' : 'trending_down';
  document.getElementById('salesMonthlyChange').className = `text-[10px] font-bold ${monthChange >= 0 ? 'text-green-600' : 'text-red-500'}`;
  
  // Actualizar UI - Anual
  document.getElementById('salesAnnual').textContent = formatCurrency(yearSales);
  document.getElementById('salesAnnualChange').textContent = formatPercentChange(yearChange);
  document.getElementById('salesAnnualTrend').textContent = yearChange >= 0 ? 'trending_up' : 'trending_down';
  document.getElementById('salesAnnualChange').className = `text-[10px] font-bold ${yearChange >= 0 ? 'text-green-600' : 'text-red-500'}`;
  
  // Actualizar UI - Ticket Promedio
  document.getElementById('avgTicket').textContent = formatCurrency(avgTicket);
  document.getElementById('avgTicketChange').textContent = formatPercentChange(avgTicketChange);
  document.getElementById('avgTicketTrend').textContent = avgTicketChange >= 0 ? 'trending_up' : 'trending_down';
  document.getElementById('avgTicketChange').className = `text-[10px] font-bold ${avgTicketChange >= 0 ? 'text-green-600' : 'text-red-500'}`;
  
  // Actualizar UI - Total Pedidos
  document.getElementById('totalOrders').textContent = totalDelivered.toLocaleString();
  document.getElementById('totalOrdersChange').textContent = formatPercentChange(totalChange);
  document.getElementById('totalOrdersTrend').textContent = totalChange >= 0 ? 'trending_up' : 'trending_down';
  document.getElementById('totalOrdersChange').className = `text-[10px] font-bold ${totalChange >= 0 ? 'text-green-600' : 'text-red-500'}`;
}

// Actualizar gráfico de ventas
function updateSalesChart() {
  const canvas = document.getElementById('salesChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destruir gráfico anterior si existe
  if (salesChart) {
    salesChart.destroy();
  }
  
  const deliveredOrders = salesData.filter(o => o.status === 'entregado');
  let labels = [];
  let data = [];
  let revenue = 0;
  
  if (currentSalesPeriod === 'daily') {
    // Últimos 7 días
    labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const now = Date.now();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - (i * 24 * 60 * 60 * 1000));
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayOrders = deliveredOrders.filter(o => 
        o.createdAt >= dayStart.getTime() && o.createdAt <= dayEnd.getTime()
      );
      const daySales = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      data.push(daySales);
      revenue += daySales;
    }
  } else {
    // Últimas 4 semanas
    labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    const now = Date.now();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = now - ((i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = now - (i * 7 * 24 * 60 * 60 * 1000);
      
      const weekOrders = deliveredOrders.filter(o => 
        o.createdAt >= weekStart && o.createdAt < weekEnd
      );
      const weekSales = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      data.push(weekSales);
      revenue += weekSales;
    }
  }
  
  // Actualizar texto de rendimiento
  document.getElementById('revenuePerformance').textContent = formatCurrency(revenue);
  
  // Calcular comparación con período anterior
  const prevPeriodData = currentSalesPeriod === 'daily' 
    ? calculatePreviousWeekSales(deliveredOrders)
    : calculatePreviousMonthSales(deliveredOrders);
  const prevRevenue = prevPeriodData.reduce((sum, val) => sum + val, 0);
  const comparison = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100) : 0;
  
  document.getElementById('revenueComparison').textContent = `${comparison >= 0 ? '+' : ''}${comparison.toFixed(1)}% vs prev`;
  document.getElementById('revenueComparison').className = `text-xs font-bold ${comparison >= 0 ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-red-600 bg-red-100 dark:bg-red-900/30'} px-2 py-1 rounded-md`;
  
  // Crear gráfico
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ventas',
        data: data,
        borderColor: '#b5352c',
        backgroundColor: 'rgba(181, 53, 44, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#b5352c',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 12,
            weight: 'bold'
          },
          bodyFont: {
            size: 11
          },
          callbacks: {
            label: function(context) {
              return formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              size: 10
            },
            callback: function(value) {
              if (value >= 1000) {
                return '$' + (value / 1000).toFixed(1) + 'k';
              }
              return '$' + value;
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 10
            }
          }
        }
      }
    }
  });
}

// Calcular ventas de la semana anterior
function calculatePreviousWeekSales(deliveredOrders) {
  const now = Date.now();
  const data = [];
  
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - ((i + 7) * 24 * 60 * 60 * 1000));
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayOrders = deliveredOrders.filter(o => 
      o.createdAt >= dayStart.getTime() && o.createdAt <= dayEnd.getTime()
    );
    const daySales = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    data.push(daySales);
  }
  
  return data;
}

// Calcular ventas del mes anterior
function calculatePreviousMonthSales(deliveredOrders) {
  const now = Date.now();
  const data = [];
  
  for (let i = 3; i >= 0; i--) {
    const weekStart = now - ((i + 5) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = now - ((i + 4) * 7 * 24 * 60 * 60 * 1000);
    
    const weekOrders = deliveredOrders.filter(o => 
      o.createdAt >= weekStart && o.createdAt < weekEnd
    );
    const weekSales = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    data.push(weekSales);
  }
  
  return data;
}

// Actualizar top productos
function updateTopProducts() {
  const container = document.getElementById('topProductsList');
  if (!container) return;
  
  const deliveredOrders = salesData.filter(o => o.status === 'entregado');
  const productCounts = {};
  
  deliveredOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const productName = item.name || 'Producto sin nombre';
        const quantity = item.quantity || 1;
        productCounts[productName] = (productCounts[productName] || 0) + quantity;
      });
    }
  });
  
  // Ordenar por cantidad
  const sortedProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const maxOrders = sortedProducts.length > 0 ? sortedProducts[0][1] : 1;
  
  let html = '';
  sortedProducts.forEach(([productName, count]) => {
    const percentage = (count / maxOrders) * 100;
    html += `
      <div class="space-y-2">
        <div class="flex justify-between text-xs font-bold">
          <span class="truncate max-w-[60%]">${escapeHtml(productName)}</span>
          <span>${count} pedidos</span>
        </div>
        <div class="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div class="h-full bg-primary rounded-full transition-all" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  });
  
  if (html === '') {
    html = '<p class="text-sm text-gray-400 text-center py-4">No hay datos disponibles</p>';
  }
  
  container.innerHTML = html;
}

// Actualizar métodos de pago
function updatePaymentMethods() {
  const canvas = document.getElementById('paymentChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destruir gráfico anterior si existe
  if (paymentChart) {
    paymentChart.destroy();
  }
  
  const deliveredOrders = salesData.filter(o => o.status === 'entregado');
  const paymentMethods = {};
  
  deliveredOrders.forEach(order => {
    const method = order.paymentMethod || 'efectivo';
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
  });
  
  const total = deliveredOrders.length;
  const labels = Object.keys(paymentMethods);
  const data = Object.values(paymentMethods);
  const colors = ['#b5352c', '#e57373', '#ffb74d', '#81c784'];
  
  // Actualizar lista de métodos
  const container = document.getElementById('paymentMethodsList');
  if (container) {
    let html = '';
    labels.forEach((method, index) => {
      const count = data[index];
      const percentage = total > 0 ? (count / total * 100).toFixed(0) : 0;
      const methodNames = {
        'efectivo': 'Efectivo',
        'tarjeta': 'Tarjeta',
        'transferencia': 'Transferencia'
      };
      html += `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" style="background-color: ${colors[index % colors.length]}"></div>
          <span class="text-[9px] font-bold">${methodNames[method] || method} (${percentage}%)</span>
        </div>
      `;
    });
    container.innerHTML = html || '<p class="text-[9px] text-gray-400">No hay datos</p>';
  }
  
  if (total === 0) {
    return;
  }
  
  // Crear gráfico de dona
  paymentChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(m => {
        const methodNames = {
          'efectivo': 'Efectivo',
          'tarjeta': 'Tarjeta',
          'transferencia': 'Transferencia'
        };
        return methodNames[m] || m;
      }),
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          callbacks: {
            label: function(context) {
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

// Actualizar tipos de entrega
function updateDeliveryTypes() {
  const deliveredOrders = salesData.filter(o => o.status === 'entregado');
  const deliveryTypes = {
    retiro: 0,
    despacho: 0
  };
  
  deliveredOrders.forEach(order => {
    const type = order.deliveryType || 'retiro';
    deliveryTypes[type] = (deliveryTypes[type] || 0) + 1;
  });
  
  const total = deliveryTypes.retiro + deliveryTypes.despacho;
  const maxCount = Math.max(deliveryTypes.retiro, deliveryTypes.despacho);
  
  const pickupBar = document.getElementById('pickupBar');
  const deliveryBar = document.getElementById('deliveryBar');
  
  if (pickupBar && deliveryBar && maxCount > 0) {
    const pickupHeight = (deliveryTypes.retiro / maxCount) * 100;
    const deliveryHeight = (deliveryTypes.despacho / maxCount) * 100;
    
    pickupBar.style.height = `${Math.max(pickupHeight, 10)}px`;
    deliveryBar.style.height = `${Math.max(deliveryHeight, 10)}px`;
  } else if (pickupBar && deliveryBar) {
    pickupBar.style.height = '10px';
    deliveryBar.style.height = '10px';
  }
}

// Actualizar meta mensual
function updateMonthlyTarget() {
  const targetElement = document.getElementById('monthlyTarget');
  const targetBar = document.getElementById('monthlyTargetBar');
  const targetText = document.getElementById('monthlyTargetText');
  
  if (!targetElement || !targetBar || !targetText) return;
  
  // Meta mensual por defecto (puede ser configurable)
  const monthlyTarget = 50000; // $50,000 CLP
  
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const deliveredOrders = salesData.filter(o => 
    o.status === 'entregado' && o.createdAt >= monthStart.getTime()
  );
  
  const monthSales = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const percentage = monthlyTarget > 0 ? (monthSales / monthlyTarget * 100) : 0;
  const remaining = Math.max(0, monthlyTarget - monthSales);
  
  targetElement.textContent = `${Math.min(100, Math.round(percentage))}% Alcanzado`;
  targetBar.style.width = `${Math.min(100, percentage)}%`;
  
  if (remaining > 0) {
    targetText.textContent = `¡Necesitas $${formatNumber(remaining)} más para alcanzar la meta!`;
  } else {
    targetText.textContent = '¡Meta mensual alcanzada! 🎉';
  }
}

// Establecer período de ventas
function setSalesPeriod(period) {
  currentSalesPeriod = period;
  
  // Actualizar botones
  const dailyBtn = document.getElementById('salesPeriodDaily');
  const weeklyBtn = document.getElementById('salesPeriodWeekly');
  
  if (dailyBtn && weeklyBtn) {
    if (period === 'daily') {
      dailyBtn.classList.remove('bg-gray-200', 'dark:bg-white/10', 'text-gray-600', 'dark:text-gray-300');
      dailyBtn.classList.add('bg-primary', 'text-white');
      weeklyBtn.classList.remove('bg-primary', 'text-white');
      weeklyBtn.classList.add('bg-gray-200', 'dark:bg-white/10', 'text-gray-600', 'dark:text-gray-300');
    } else {
      weeklyBtn.classList.remove('bg-gray-200', 'dark:bg-white/10', 'text-gray-600', 'dark:text-gray-300');
      weeklyBtn.classList.add('bg-primary', 'text-white');
      dailyBtn.classList.remove('bg-primary', 'text-white');
      dailyBtn.classList.add('bg-gray-200', 'dark:bg-white/10', 'text-gray-600', 'dark:text-gray-300');
    }
  }
  
  // Actualizar etiquetas del gráfico
  const chartLabels = document.getElementById('chartLabels');
  if (chartLabels) {
    if (period === 'daily') {
      chartLabels.innerHTML = `
        <p class="text-[10px] font-bold text-gray-400">LUN</p>
        <p class="text-[10px] font-bold text-gray-400">MAR</p>
        <p class="text-[10px] font-bold text-gray-400">MIE</p>
        <p class="text-[10px] font-bold text-gray-400">JUE</p>
        <p class="text-[10px] font-bold text-gray-400">VIE</p>
        <p class="text-[10px] font-bold text-gray-400">SAB</p>
        <p class="text-[10px] font-bold text-gray-400">DOM</p>
      `;
    } else {
      chartLabels.innerHTML = `
        <p class="text-[10px] font-bold text-gray-400">Sem 1</p>
        <p class="text-[10px] font-bold text-gray-400">Sem 2</p>
        <p class="text-[10px] font-bold text-gray-400">Sem 3</p>
        <p class="text-[10px] font-bold text-gray-400">Sem 4</p>
      `;
    }
  }
  
  updateSalesChart();
}

// Funciones auxiliares
function formatCurrency(amount) {
  if (amount === 0) return '$0';
  return '$' + Math.round(amount).toLocaleString('es-CL');
}

function formatNumber(num) {
  return Math.round(num).toLocaleString('es-CL');
}

function formatPercentChange(change) {
  if (change === 0) return '0%';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

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

// Exportar funciones
window.initAdminSales = initAdminSales;
window.setSalesPeriod = setSalesPeriod;
