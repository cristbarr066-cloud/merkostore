/* ==========================================================================
   MERKOSTORE 8.0 - PRODUCTOS & MERCADOS ENGINE & HISTORIAL UNIFICADO
   ========================================================================== */

const API_BASE_URL = (window.location.port === '8080') ? '' : 'http://localhost:8080';

const API = {
    getToken() {
        return sessionStorage.getItem('merkostore_jwt_token');
    },
    setToken(token) {
        if (token) {
            sessionStorage.setItem('merkostore_jwt_token', token);
        } else {
            sessionStorage.removeItem('merkostore_jwt_token');
        }
    },
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            if (response.status === 401 || response.status === 403) {
                if (endpoint.includes('/admin/')) {
                    this.setToken(null);
                    state.isAdminLoggedIn = false;
                    switchView('storefront');
                    showToast('🔒 Sesión expirada o no autorizada.', 'error', '🔒');
                }
            }

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                const errorMsg = data?.message || data?.error || `Error en el servidor (${response.status})`;
                throw new Error(errorMsg);
            }
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            if (error.message && error.message.includes('Failed to fetch')) {
                throw new Error('Servidor backend no detectado en http://localhost:8080. Verifica que Spring Boot esté ejecutándose.');
            }
            throw error;
        }
    },
    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
    patch(endpoint, body) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

const state = {
    isAdminLoggedIn: false,
    currentView: 'storefront', // 'storefront' | 'admin'
    currentAdminSubTab: 'dashboard', // 'dashboard' | 'products' | 'productEditor' | 'orders' | 'categories' | 'config'
    currentCartStep: 1, // 1 | 2 | 3
    selectedCategory: 'ALL',
    searchQuery: '',
    adminStockFilter: 'ALL', // 'ALL' | 'IN_STOCK' | 'SOLD_OUT' | 'LOW_STOCK'
    editingProductId: null, // Product ID currently being edited

    // Historial Filters State
    historialTypeFilter: 'ALL', // 'ALL' | 'DETAL' | 'MERCADO'
    historialStatusFilter: 'ALL', // 'ALL' | 'RECEIVED' | 'PREPARING' | 'READY' | 'ON_WAY' | 'DELIVERED' | 'CANCELLED'
    historialPeriodFilter: 'ALL', // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | '30DAYS'
    historialSearchQuery: '',

    // Store Configuration
    storeConfig: {
        storeName: 'Don Pedro - Tienda de Barrio',
        whatsappPhone: '573001234567',
        address: 'Calle 45 # 23 - 10 Barrio El Prado',
        fulfillmentType: 'DELIVERY',
        deliveryFee: 3000,
        minimumOrder: 10000,
        isStoreOpen: true
    },
    
    // Cart: { productId: quantity }
    cart: {},

    // Categories
    categories: [
        { id: 'ALL', name: '✨ Todos los Productos', icon: '🛒', bgColor: '#fee2e2' },
        { id: 'cat1', name: '🔴 Precios Rojos', icon: '🏷️', bgColor: '#fef2f2' },
        { id: 'cat2', name: '🥛 Lácteos y Huevos', icon: '🥛', bgColor: '#e0f2fe' },
        { id: 'cat3', name: '🍺 Cervezas y Bebidas', icon: '🍺', bgColor: '#fef3c7' },
        { id: 'cat4', name: '🌾 Abarrotes y Granos', icon: '🌾', bgColor: '#dcfce7' },
        { id: 'cat5', name: '🧼 Cuidado Personal', icon: '🧼', bgColor: '#f3e8ff' }
    ],

    // Products & Mercados
    products: [
        // PRODUCTOS AL DETAL
        {
            id: 'p1',
            type: 'DETAL',
            categoryId: 'cat2',
            sku: 'HUE-001',
            name: 'Huevo Kikes Rojo AA X30 Unds',
            unitCalc: 'Unidad a $ 653.33',
            costPrice: 13500,
            price: 24500,
            discountPrice: 14700,
            discountPercent: '-40%',
            stock: 35,
            imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500',
            isAvailable: true
        },
        {
            id: 'p2',
            type: 'DETAL',
            categoryId: 'cat4',
            sku: 'CAF-002',
            name: 'CAFE SELLO ROJO 425G',
            unitCalc: 'Gramo a $ 51.74',
            costPrice: 16500,
            price: 21990,
            discountPrice: null,
            discountPercent: null,
            stock: 20,
            imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500',
            isAvailable: true
        },
        {
            id: 'p3',
            type: 'DETAL',
            categoryId: 'cat4',
            sku: 'PAN-003',
            name: 'Harina Pan De Maíz Blanco 1 Kg',
            unitCalc: 'Gramo a $ 3.60',
            costPrice: 2800,
            price: 4800,
            discountPrice: 3600,
            discountPercent: '-25%',
            stock: 50,
            imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
            isAvailable: true
        },
        {
            id: 'p4',
            type: 'DETAL',
            categoryId: 'cat4',
            sku: 'ACE-004',
            name: 'Aceite Medalla De Oro Mezcla 3 Lt',
            unitCalc: 'Gramo a $ 3.96',
            costPrice: 14200,
            price: 19490,
            discountPercent: null,
            discountPrice: null,
            stock: 14,
            imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500',
            isAvailable: true
        },
        {
            id: 'p5',
            type: 'DETAL',
            categoryId: 'cat4',
            sku: 'AZU-005',
            name: 'Azúcar Blanca 2.5 Kg',
            unitCalc: 'Gramo a $ 3.96',
            costPrice: 7200,
            price: 9900,
            discountPrice: null,
            discountPercent: null,
            stock: 28,
            imageUrl: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500',
            isAvailable: true
        },
        {
            id: 'p6',
            type: 'DETAL',
            categoryId: 'cat3',
            sku: 'CER-006',
            name: 'Cerveza Club Colombia Dorada 330ml x6',
            unitCalc: 'Mililitro a $ 10.50',
            costPrice: 18000,
            price: 24900,
            discountPrice: 21500,
            discountPercent: '-13%',
            stock: 15,
            imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500',
            isAvailable: true
        },

        // MERCADOS (COMBOS / KITS)
        {
            id: 'm1',
            type: 'MERCADO',
            categoryId: 'cat4',
            sku: 'MER-001',
            name: 'Mercado Familiar Esencial',
            unitCalc: 'Combo 5 Productos Detal',
            costPrice: 32000,
            price: 54000,
            discountPrice: 44900,
            discountPercent: '-17%',
            stock: 14, // Sincronizado automáticamente
            imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
            isAvailable: true,
            bundleItems: [
                { productId: 'p1', quantity: 1 }, // 1x Huevo
                { productId: 'p3', quantity: 2 }, // 2x Harina Pan
                { productId: 'p4', quantity: 1 }, // 1x Aceite
                { productId: 'p5', quantity: 1 }  // 1x Azúcar
            ]
        },
        {
            id: 'm2',
            type: 'MERCADO',
            categoryId: 'cat2',
            sku: 'MER-002',
            name: 'Mercado Desayuno Completo',
            unitCalc: 'Combo 3 Productos Desayuno',
            costPrice: 24000,
            price: 39900,
            discountPrice: 34500,
            discountPercent: '-13%',
            stock: 20, // Sincronizado automáticamente
            imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
            isAvailable: true,
            bundleItems: [
                { productId: 'p1', quantity: 1 }, // 1x Huevo
                { productId: 'p2', quantity: 1 }, // 1x Café
                { productId: 'p3', quantity: 1 }  // 1x Harina Pan
            ]
        }
    ],

    orders: [
        {
            id: 'ord-7329',
            orderNumber: 'ISV-7329',
            customerName: 'Yuri Fernández',
            customerPhone: '573017924481',
            customerEmail: 'yuriwayne15@gmail.com',
            deliveryAddress: 'Calle principal de villa estrella, entrando por el callejón sin salida de la ferretería relámpago.',
            cityNeighborhood: 'Cartagena - Villa estrella',
            fulfillmentType: 'DELIVERY',
            items: [
                { productId: 'p_shampoo', name: 'Shampoo ISIVI', type: 'DETAL', qty: 1, unitPrice: 35000, subtotal: 35000, imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500' },
                { productId: 'p_acond', name: 'Acondicionador ISIVI', type: 'DETAL', qty: 1, unitPrice: 35000, subtotal: 35000, imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500' },
                { productId: 'p_trat', name: 'Tratamiento ISIVI', type: 'DETAL', qty: 1, unitPrice: 20000, subtotal: 20000, imageUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500' }
            ],
            subtotal: 90000,
            deliveryFee: 0,
            total: 90000,
            paymentMethod: 'Pasarela Wompi Bancolombia',
            paymentStatus: 'PAID',
            paymentStatusLabel: 'APROBADO & COBRADO',
            status: 'DELIVERED', // 'RECEIVED', 'PREPARING', 'READY', 'ON_WAY', 'DELIVERED', 'CANCELLED'
            createdAt: '2026-09-12 11:20',
            dateOnly: '2026-09-12',
            archivedDate: '2026-09-12'
        },
        {
            id: 'ord-1088',
            orderNumber: 'MS-1088',
            customerName: 'Juan Pablo Pérez',
            customerPhone: '573009876543',
            customerEmail: 'juan.pablo@gmail.com',
            deliveryAddress: 'Carrera 15 # 45 - 20 Apto 402',
            cityNeighborhood: 'El Prado',
            fulfillmentType: 'DELIVERY',
            items: [
                { productId: 'm1', name: 'Mercado Familiar Esencial', type: 'MERCADO', qty: 1, unitPrice: 44900, subtotal: 44900, imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500' }
            ],
            subtotal: 44900,
            deliveryFee: 0,
            total: 44900,
            paymentMethod: 'Nequi / Daviplata',
            paymentStatus: 'PAID',
            paymentStatusLabel: 'APROBADO & COBRADO',
            status: 'PREPARING',
            createdAt: '2026-10-01 09:10',
            dateOnly: '2026-10-01',
            archivedDate: '2026-10-01'
        },
        {
            id: 'ord-1087',
            orderNumber: 'MS-1087',
            customerName: 'Ana María Gómez',
            customerPhone: '573158889900',
            customerEmail: 'anamaria@hotmail.com',
            deliveryAddress: 'Calle 10 # 5 - 30',
            cityNeighborhood: 'Centro',
            fulfillmentType: 'PICKUP',
            items: [
                { productId: 'p1', name: 'Huevo Kikes Rojo AA X30 Unds', type: 'DETAL', qty: 1, unitPrice: 14700, subtotal: 14700, imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500' }
            ],
            subtotal: 14700,
            deliveryFee: 0,
            total: 14700,
            paymentMethod: 'Efectivo Contra Entrega',
            paymentStatus: 'PENDING',
            paymentStatusLabel: 'PENDIENTE DE PAGO',
            status: 'RECEIVED',
            createdAt: '2026-10-01 08:30',
            dateOnly: '2026-10-01',
            archivedDate: '2026-10-01'
        }
    ]
};

function getGreetingByTime() {
    const hour = new Date().getHours();
    if (hour < 12) return 'BUENOS DÍAS 👋';
    if (hour < 18) return 'BUENAS TARDES 👋';
    return 'BUENAS NOCHES 👋';
}

function refreshDashboardData() {
    updateDashboardKPIs();
    renderDashboardContent();
    showToast('🔄 Datos del Dashboard actualizados', 'info', '🔄');
}

function updateDashboardKPIs() {
    if (!state) return;

    const today = new Date().toISOString().slice(0, 10);
    const ordersList = Array.isArray(state.orders) ? state.orders : [];
    const todayOrders = ordersList.filter(o => o.status !== 'CANCELLED' && ((o.createdAt && o.createdAt.startsWith(today)) || o.dateOnly === today));
    const todaySalesSum = todayOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const todayCount = todayOrders.length;

    const activeOrders = ordersList.filter(o => ['RECEIVED', 'PREPARING', 'READY', 'ON_WAY'].includes(o.status));
    const pendingOrders = ordersList.filter(o => o.status === 'RECEIVED' || o.paymentStatus === 'PENDING');

    const productsList = Array.isArray(state.products) ? state.products : [];
    const lowStockProds = productsList.filter(p => (Number(p.stock) || 0) <= 5 || p.isAvailable === false);

    const validOrders = ordersList.filter(o => o.status !== 'CANCELLED');
    const ticketAvg = validOrders.length > 0 ? Math.round(validOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0) / validOrders.length) : 0;

    const kpiSales = document.getElementById('kpiSales');
    const kpiSalesSubtext = document.getElementById('kpiSalesSubtext');
    const kpiOrders = document.getElementById('kpiOrders');
    const kpiPending = document.getElementById('kpiPending');
    const kpiLowStock = document.getElementById('kpiLowStock');
    const kpiTicketAvg = document.getElementById('kpiTicketAvg');
    const kpiAlertText = document.getElementById('kpiAlertText');

    if (kpiSales) kpiSales.textContent = `$ ${todaySalesSum.toLocaleString('es-CO')}`;
    if (kpiSalesSubtext) kpiSalesSubtext.textContent = `↑ ${todayCount} ventas en el día`;
    if (kpiOrders) kpiOrders.textContent = activeOrders.length;
    if (kpiPending) kpiPending.textContent = pendingOrders.length;
    if (kpiLowStock) kpiLowStock.textContent = lowStockProds.length;
    if (kpiTicketAvg) kpiTicketAvg.textContent = `$ ${ticketAvg.toLocaleString('es-CO')}`;
    if (kpiAlertText) kpiAlertText.textContent = `Productos por agotar: ${lowStockProds.length} ítems con stock bajo o sin existencias.`;

    renderDashboardContent();
}

function renderDashboardContent() {
    // 1. Greeting
    const greetingEl = document.getElementById('dashGreeting');
    if (greetingEl) greetingEl.textContent = getGreetingByTime();

    // 2. Active Orders List (Left Panel 1)
    const activeOrdersContainer = document.getElementById('dashActiveOrdersList');
    if (activeOrdersContainer) {
        const activeOrders = state.orders.filter(o => ['RECEIVED', 'PREPARING', 'READY', 'ON_WAY'].includes(o.status));
        if (activeOrders.length === 0) {
            activeOrdersContainer.innerHTML = `
                <div style="text-align:center; padding:32px 16px; color:var(--admin-text-muted); font-size:0.88rem;">
                    ✨ No hay pedidos activos en este momento.
                </div>`;
        } else {
            activeOrdersContainer.innerHTML = activeOrders.slice(0, 4).map(o => `
                <div class="dash-order-card">
                    <div class="dash-order-info">
                        <div class="dash-order-num">📦 ${o.orderNumber} <span style="font-size:0.75rem; font-weight:600; color:#a1a1aa; margin-left:8px;">${o.createdAt || ''}</span></div>
                        <div class="dash-order-customer">👤 ${o.customerName} • 📞 ${o.customerPhone}</div>
                        <div style="font-size:0.78rem; color:#d4d4d8;">${(o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}</div>
                    </div>
                    <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                        <div class="dash-order-total">$ ${(o.total || 0).toLocaleString('es-CO')}</div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn-merko-outline" style="padding:4px 10px; font-size:0.72rem;" onclick="advanceOrderStatusFromDashboard('${o.id}')">
                                ⏩ Avanzar (${o.status})
                            </button>
                            <button class="btn-merko-outline" style="padding:4px 8px; font-size:0.72rem; color:#25D366; border-color:#25D366;" onclick="contactCustomerWhatsApp('${o.customerPhone}', '${o.orderNumber}')">
                                💬 WA
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 3. Action Requests List (Left Panel 2)
    const actionRequestsContainer = document.getElementById('dashActionRequestsList');
    if (actionRequestsContainer) {
        const pendingOrders = state.orders.filter(o => o.status === 'RECEIVED' || o.paymentStatus === 'PENDING');
        const lowStock = state.products.filter(p => (p.stock || 0) <= 5);

        let requestsHTML = '';
        pendingOrders.forEach(o => {
            requestsHTML += `
                <div class="dash-order-card" style="border-left: 3px solid #f59e0b;">
                    <div>
                        <div style="font-weight:800; font-size:0.88rem; color:#ffffff;">📲 Confirmación por WhatsApp requerida (${o.orderNumber})</div>
                        <div style="font-size:0.78rem; color:var(--admin-text-muted);">Cliente: ${o.customerName} • Tel: ${o.customerPhone}</div>
                    </div>
                    <button class="btn-merko-primary" style="padding:5px 12px; font-size:0.75rem;" onclick="switchAdminSubTab('orders')">
                        Atender Pedido ➔
                    </button>
                </div>`;
        });

        lowStock.forEach(p => {
            requestsHTML += `
                <div class="dash-order-card" style="border-left: 3px solid #ef4444;">
                    <div>
                        <div style="font-weight:800; font-size:0.88rem; color:#ffffff;">⚠️ Stock Crítico: ${p.name}</div>
                        <div style="font-size:0.78rem; color:#ef4444;">Quedan solo ${p.stock || 0} unidades en inventario.</div>
                    </div>
                    <button class="btn-merko-outline" style="padding:5px 12px; font-size:0.75rem;" onclick="quickEditStockFromDashboard('${p.id}')">
                        ✏️ Reponer Stock
                    </button>
                </div>`;
        });

        if (!requestsHTML) {
            requestsHTML = `
                <div style="text-align:center; padding:28px 16px; color:var(--admin-text-muted); font-size:0.88rem;">
                    ✅ No hay solicitudes pendientes de acción urgente.
                </div>`;
        }
        actionRequestsContainer.innerHTML = requestsHTML;
    }

    // 4. Low Stock Product List (Right Panel 1)
    const lowStockContainer = document.getElementById('dashLowStockList');
    if (lowStockContainer) {
        const lowStockProducts = state.products.filter(p => (p.stock || 0) <= 5).slice(0, 4);
        if (lowStockProducts.length === 0) {
            lowStockContainer.innerHTML = `
                <div style="text-align:center; padding:24px 16px; color:var(--admin-text-muted); font-size:0.85rem;">
                    🎉 Todo el inventario tiene existencias suficientes.
                </div>`;
        } else {
            lowStockContainer.innerHTML = lowStockProducts.map(p => `
                <div class="dash-stock-item">
                    <img src="${p.imageUrl}" alt="${p.name}" class="dash-stock-img">
                    <div style="flex:1;">
                        <div class="dash-stock-name">${p.name}</div>
                        <div class="dash-stock-price">$ ${(p.price || 0).toLocaleString('es-CO')}</div>
                    </div>
                    <span class="dash-stock-badge ${p.stock <= 0 ? 'agotado' : 'bajo'}">
                        ${p.stock <= 0 ? 'Agotado' : `${p.stock} und.`}
                    </span>
                    <button class="btn-merko-outline" style="padding:4px 8px; font-size:0.72rem;" onclick="quickEditStockFromDashboard('${p.id}')" title="Editar stock">
                        ✏️
                    </button>
                </div>
            `).join('');
        }
    }

    // 5. Sales Summary & 7-Day Chart (Right Panel 2)
    const salesTodayEl = document.getElementById('dashSalesToday');
    const salesWeekEl = document.getElementById('dashSalesWeek');
    const salesMonthEl = document.getElementById('dashSalesMonth');
    const chartContainer = document.getElementById('dash7DaysChart');

    const totalOrders = state.orders.filter(o => o.status !== 'CANCELLED');
    const todayStr = new Date().toISOString().slice(0, 10);
    
    const sumToday = totalOrders.filter(o => (o.createdAt && o.createdAt.startsWith(todayStr)) || o.dateOnly === todayStr).reduce((s, o) => s + (Number(o.total) || 0), 0);
    const sumTotal = totalOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

    if (salesTodayEl) salesTodayEl.textContent = `$ ${sumToday.toLocaleString('es-CO')}`;
    if (salesWeekEl) salesWeekEl.textContent = `$ ${sumTotal.toLocaleString('es-CO')}`;
    if (salesMonthEl) salesMonthEl.textContent = `$ ${sumTotal.toLocaleString('es-CO')}`;

    // 7 Days Chart
    if (chartContainer) {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const val = totalOrders.filter(o => (o.createdAt && o.createdAt.startsWith(dateStr)) || o.dateOnly === dateStr).reduce((s, o) => s + (Number(o.total) || 0), 0);
            last7Days.push({
                dayName: days[d.getDay()],
                val: val
            });
        }

        const maxVal = Math.max(...last7Days.map(d => d.val), 50000);

        chartContainer.innerHTML = last7Days.map(d => {
            const heightPercent = Math.max((d.val / maxVal) * 100, 12);
            return `
                <div class="dash-chart-bar-wrap">
                    <div class="dash-chart-bar" style="height:${heightPercent}%;" title="${d.dayName}: $ ${d.val.toLocaleString('es-CO')}"></div>
                    <span class="dash-chart-label">${d.dayName}</span>
                </div>
            `;
        }).join('');
    }
}

function advanceOrderStatusFromDashboard(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const transitions = {
        'RECEIVED': 'PREPARING',
        'PREPARING': 'READY',
        'READY': 'ON_WAY',
        'ON_WAY': 'DELIVERED'
    };

    if (transitions[order.status]) {
        order.status = transitions[order.status];
        updateDashboardKPIs();
        renderHistorialUnificadoTable();
        showToast(`📦 Pedido ${order.orderNumber} avanzado a "${order.status}"`, 'success', '📦');
    }
}

function quickEditStockFromDashboard(productId) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;

    switchAdminSubTab('productEditor');
    if (typeof editProductInEditor === 'function') {
        editProductInEditor(productId);
    }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    recalculateMercadoStocks();
    renderCategoryBadges();
    renderCategoryOptions();
    renderEmojiPickers();
    renderProducts();
    updateLivePreview();
    renderAdminProductsTable();
    renderAdminCategoriesTable();
    renderHistorialUnificadoTable();
    updateDashboardKPIs();
    syncStoreConfigUI();
    renderMercadoItemsChecklist();
});

// FLOATING TOAST NOTIFICATION ENGINE (ULTRA-LUXURY)
function showToast(message, type = 'success', icon = null) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    let defaultIcon = '✅';
    if (type === 'info') defaultIcon = 'ℹ️';
    if (type === 'warning') defaultIcon = '⚠️';
    if (type === 'error') defaultIcon = '❌';

    const toastIcon = icon || defaultIcon;

    const toast = document.createElement('div');
    toast.className = `merko-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon-badge">${toastIcon}</div>
        <div class="toast-content">
            <div class="toast-title">${message}</div>
        </div>
        <button class="toast-close" onclick="closeToast(this.parentElement)" title="Cerrar notificación">✕</button>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    const timer = setTimeout(() => {
        closeToast(toast);
    }, 3500);

    toast._toastTimer = timer;
}

function closeToast(toast) {
    if (!toast || toast.classList.contains('toast-exit')) return;
    if (toast._toastTimer) clearTimeout(toast._toastTimer);
    toast.classList.add('toast-exit');
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 380);
}

// FLUID DRAGGABLE FLOATING EMOJIS (MOUSE & TOUCH DRAG ENGINE)
function startDragEmoji(e, element) {
    e.preventDefault();
    element.classList.add('dragging');

    let startX = e.clientX || (e.touches && e.touches[0].clientX);
    let startY = e.clientY || (e.touches && e.touches[0].clientY);

    const rect = element.getBoundingClientRect();
    let initialLeft = rect.left;
    let initialTop = rect.top;

    function onMove(moveEvent) {
        const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
        const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        element.style.left = `${initialLeft + deltaX}px`;
        element.style.top = `${initialTop + deltaY}px`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
    }

    function onEnd() {
        element.classList.remove('dragging');
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
}

// INVENTORY SYNC ENGINE (MERCADO & PRODUCTO DETAL)
function recalculateMercadoStocks() {
    state.products.forEach(p => {
        if (p.type === 'MERCADO' && p.bundleItems && p.bundleItems.length > 0) {
            const possibleCombos = p.bundleItems.map(item => {
                const detal = state.products.find(d => d.id === item.productId && d.type === 'DETAL');
                if (!detal) return 0;
                return Math.floor(detal.stock / item.quantity);
            });
            p.stock = Math.min(...possibleCombos);
        }
    });
}

function deductInventoryForOrderItems(items) {
    items.forEach(item => {
        const prod = state.products.find(p => p.id === item.productId);
        if (!prod) return;

        if (prod.type === 'DETAL') {
            prod.stock = Math.max(0, prod.stock - item.qty);
        } else if (prod.type === 'MERCADO' && prod.bundleItems) {
            prod.bundleItems.forEach(bItem => {
                const detal = state.products.find(d => d.id === bItem.productId && d.type === 'DETAL');
                if (detal) {
                    detal.stock = Math.max(0, detal.stock - (bItem.quantity * item.qty));
                }
            });
        }
    });

    recalculateMercadoStocks();
    renderProducts();
    renderAdminProductsTable();
}

// ROUTING & VIEW SWITCHER
function switchView(view) {
    if (view === 'admin' && !state.isAdminLoggedIn) {
        showToast('🔒 Inicia sesión como administrador para acceder', 'warning', '🔒');
        openAdminLoginModal();
        return;
    }

    state.currentView = view;
    const isStorefront = view === 'storefront';
    const isAdmin = view === 'admin';

    document.getElementById('viewStorefront').style.display = isStorefront ? 'block' : 'none';
    document.getElementById('viewAdmin').style.display = isAdmin ? 'block' : 'none';

    // Toggle storefront components visibility
    const topBar = document.querySelector('.top-bar');
    const appHeader = document.getElementById('appHeader');
    const floatingCartFab = document.getElementById('floatingCartFab');
    const floatingWhatsappBtn = document.getElementById('floatingWhatsappBtn');

    if (topBar) topBar.style.display = isStorefront ? '' : 'none';
    if (appHeader) appHeader.style.display = isStorefront ? '' : 'none';
    if (floatingCartFab) floatingCartFab.style.display = isStorefront ? '' : 'none';
    if (floatingWhatsappBtn) floatingWhatsappBtn.style.display = isStorefront ? '' : 'none';

    if (isAdmin) {
        document.body.classList.add('admin-fullscreen-active');
    } else {
        document.body.classList.remove('admin-fullscreen-active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ADMIN AUTHENTICATION MODAL
function openAdminLoginModal() {
    if (state.isAdminLoggedIn) {
        switchView('admin');
        return;
    }
    const uInput = document.getElementById('loginUser');
    const pInput = document.getElementById('loginPass');
    if (uInput) uInput.value = '';
    if (pInput) pInput.value = '';
    document.getElementById('adminLoginModal').classList.add('active');
}

function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').classList.remove('active');
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;

    try {
        const response = await API.post('/api/v1/auth/login', { username: user, password: pass });
        if (response && response.success && response.data && response.data.token) {
            API.setToken(response.data.token);
            state.isAdminLoggedIn = true;
            closeAdminLoginModal();
            switchView('admin');
            await loadAdminBackendData();
            showToast('🔓 ¡Sesión iniciada exitosamente como Administrador!', 'success', '🔓');
        } else {
            showToast('❌ Credenciales incorrectas.', 'error', '❌');
        }
    } catch (err) {
        showToast(`❌ Error de inicio de sesión: ${err.message}`, 'error', '❌');
    }
}

function logoutAdmin() {
    API.setToken(null);
    state.isAdminLoggedIn = false;
    switchView('storefront');
    showToast('🔒 Sesión de Administrador cerrada correctamente', 'info', '🔒');
}

function scrollToProducts() {
    const title = document.getElementById('productsTitle');
    if (title) title.scrollIntoView({ behavior: 'smooth' });
}

// STOREFRONT CATEGORIES & PRODUCTS
function renderCategoryBadges() {
    const container = document.getElementById('categoryBadgesContainer');
    container.innerHTML = state.categories.map(cat => `
        <div class="cat-badge-card ${state.selectedCategory === cat.id ? 'active' : ''}" onclick="selectCategory('${cat.id}')">
            <div class="cat-badge-icon-box" style="background: ${cat.bgColor || '#f1f5f9'};">
                ${cat.icon}
            </div>
            <span class="cat-badge-label">${cat.name}</span>
        </div>
    `).join('');
}

function selectCategory(catId) {
    state.selectedCategory = catId;
    renderCategoryBadges();
    renderProducts();
}

function filterProducts() {
    state.searchQuery = document.getElementById('searchInput').value.toLowerCase();
    renderProducts();
}

function toggleFavorite(btn, productName) {
    btn.classList.toggle('active');
    const isFav = btn.classList.contains('active');
    btn.innerHTML = isFav ? '❤️' : '♡';
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    let filtered = state.products;

    if (state.selectedCategory !== 'ALL') {
        filtered = filtered.filter(p => p.categoryId === state.selectedCategory);
    }

    if (state.searchQuery) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(state.searchQuery.toLowerCase()));
    }

    const countLabel = document.getElementById('productCountLabel');
    if (countLabel) {
        countLabel.textContent = `Mostrando ${filtered.length} productos y mercados`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 50px;">No se encontraron productos ni mercados en esta categoría.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const activePrice = p.discountPrice || p.price;
        const hasDiscount = !!p.discountPrice;
        const savings = hasDiscount ? (p.price - p.discountPrice) : 0;
        const qty = state.cart[p.id] || 0;
        const isMercado = p.type === 'MERCADO';
        const isSoldOut = p.isAvailable === false || p.stock <= 0;

        return `
            <div class="product-card-bright ${isSoldOut ? 'sold-out' : ''}">
                <div class="card-img-wrap">
                    ${p.discountPercent ? `<span class="discount-tag">${p.discountPercent}</span>` : ''}
                    <span class="card-type-badge ${isMercado ? 'mercado' : 'detal'}">
                        ${isMercado ? '📦 MERCADO' : '🛍️ DETAL'}
                    </span>
                    <span class="stock-status-badge" style="${isSoldOut ? 'background:#ef4444; color:#fff;' : ''}">
                        ${isSoldOut ? 'Agotado' : `${p.stock} dispon.`}
                    </span>
                    <button class="fav-heart-btn" title="Guardar en favoritos" onclick="toggleFavorite(this, '${p.name.replace(/'/g, "\\'")}')">♡</button>
                    <img src="${p.imageUrl}" alt="${p.name}" loading="lazy">
                </div>
                <div class="card-details">
                    <span class="card-unit-info">${p.unitCalc || (isMercado ? 'Combo Mercado' : 'Unidad detal')}</span>
                    <h3 class="card-product-title">${p.name}</h3>
                    
                    ${p.description ? `<p style="font-size:0.78rem; color:var(--text-muted); line-height:1.3; margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${p.description}</p>` : ''}

                    <div class="card-price-block" style="display:flex; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div class="card-sale-price ${hasDiscount ? 'discounted' : ''}">
                            $ ${activePrice.toLocaleString('es-CO')}
                            ${hasDiscount ? `<span class="card-old-price">$ ${p.price.toLocaleString('es-CO')}</span>` : ''}
                        </div>
                        ${hasDiscount ? `
                            <span class="savings-badge">🏷️ AHORRAS $ ${savings.toLocaleString('es-CO')}</span>
                        ` : ''}
                    </div>
                    
                    ${isSoldOut ? `
                        <button class="card-add-btn sold-out-btn" disabled style="margin-top:10px;">
                            <span>Agotado</span>
                        </button>
                    ` : (qty === 0 ? `
                        <button class="card-add-btn" onclick="updateCartQuantity('${p.id}', 1)" style="margin-top:10px;">
                            <span>🛒 Agregar al Carrito</span>
                        </button>
                    ` : `
                        <div class="qty-stepper-card" style="margin-top:10px;">
                            <button class="qty-stepper-btn" onclick="updateCartQuantity('${p.id}', ${qty - 1})">-</button>
                            <div style="text-align:center;">
                                <div style="font-size:0.65rem; font-weight:800; color:#dc2626; line-height:1;">CARRITO</div>
                                <div style="font-weight:900; font-size:1rem; color:#0f172a;">${qty}</div>
                            </div>
                            <button class="qty-stepper-btn" onclick="updateCartQuantity('${p.id}', ${qty + 1})">+</button>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }).join('');
}

// CART ENGINE & CHECKOUT STEP WIZARD
let currentPaymentMethod = 'WHATSAPP';

function updateCartQuantity(productId, newQty) {
    const prod = state.products.find(p => p.id === productId);
    const oldQty = state.cart[productId] || 0;

    if (prod && newQty > prod.stock) {
        showToast(`⚠️ Inventario máximo disponible: ${prod.stock} unidades.`, 'warning', '⚠️');
        return;
    }

    if (newQty <= 0) {
        delete state.cart[productId];
        if (prod) showToast(`🗑️ ${prod.name} eliminado del carrito`, 'info', '🗑️');
    } else {
        state.cart[productId] = newQty;
        if (prod && newQty > oldQty) {
            showToast(`🛒 ${prod.name} agregado al carrito`, 'success', '🛒');
        }
    }
    renderProducts();
    renderCart();
}

function renderCart() {
    const cartList = document.getElementById('cartItemsList');
    const badge = document.getElementById('cartBadge');
    const headerBadge = document.getElementById('cartHeaderBadge');
    const fabBadge = document.getElementById('fabCartBadge');
    const step1Count = document.getElementById('step1ItemCount');
    const itemsCountBadge = document.getElementById('cartItemsCountBadge');

    const cartIds = Object.keys(state.cart);
    const totalItems = Object.values(state.cart).reduce((a, b) => a + b, 0);

    if (badge) badge.textContent = totalItems;
    if (headerBadge) headerBadge.textContent = totalItems;
    if (fabBadge) fabBadge.textContent = totalItems;
    if (step1Count) step1Count.textContent = `${totalItems} ${totalItems === 1 ? 'ítem' : 'ítems'}`;
    if (itemsCountBadge) itemsCountBadge.textContent = `${totalItems} ${totalItems === 1 ? 'Producto' : 'Productos'}`;

    if (cartIds.length === 0) {
        cartList.innerHTML = `
            <div class="cart-empty-state">
                <div class="empty-icon-animated">🛒</div>
                <h4 style="font-size:1.1rem; font-weight:900; color:#0f172a; margin-bottom:6px;">Tu carrito está vacío</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:18px;">Agrega productos y mercados para realizar tu pedido en 3 simples pasos.</p>
                <button class="btn-checkout-next" style="width:auto; padding:10px 24px; font-size:0.88rem;" onclick="toggleCartDrawer(); scrollToProducts();">
                    🛒 Explorar Productos
                </button>
            </div>
        `;
        updateCartTotals(0);
        updateFreeShippingProgress(0);
        renderTicketPreview([]);
        return;
    }

    let subtotal = 0;
    let ticketItems = [];

    cartList.innerHTML = cartIds.map(id => {
        const p = state.products.find(prod => prod.id === id);
        if (!p) return '';

        const qty = state.cart[id];
        const price = p.discountPrice || p.price;
        const sub = price * qty;
        subtotal += sub;

        ticketItems.push({ name: p.name, qty: qty, subtotal: sub });

        return `
            <div class="cart-item-card">
                <img src="${p.imageUrl}" alt="${p.name}" class="cart-item-img">
                
                <div class="cart-item-details">
                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                        <span class="card-type-badge ${p.type === 'MERCADO' ? 'mercado' : 'detal'}" style="position:static; font-size:0.6rem; padding:1px 6px;">
                            ${p.type === 'MERCADO' ? 'MERCADO' : 'PRODUCTO'}
                        </span>
                    </div>
                    <div class="cart-item-title">${p.name}</div>
                    <div class="cart-item-unit">${p.unitCalc || ''}</div>
                    <div class="cart-item-price-unit">$ ${price.toLocaleString('es-CO')} c/u</div>
                </div>

                <div class="cart-item-actions">
                    <div class="cart-item-subtotal">$ ${sub.toLocaleString('es-CO')}</div>
                    
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div class="cart-qty-control">
                            <button class="qty-btn" onclick="updateCartQuantity('${id}', ${qty - 1})">-</button>
                            <span class="qty-num">${qty}</span>
                            <button class="qty-btn" onclick="updateCartQuantity('${id}', ${qty + 1})">+</button>
                        </div>

                        <button class="cart-remove-btn" onclick="updateCartQuantity('${id}', 0)" title="Eliminar ítem">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    updateCartTotals(subtotal);
    updateFreeShippingProgress(subtotal);
    renderTicketPreview(ticketItems);
}

function updateFreeShippingProgress(subtotal) {
    const freeShippingTarget = 30000;
    const banner = document.getElementById('freeShippingBanner');
    const bar = document.getElementById('freeShippingBar');
    const text = document.getElementById('freeShippingText');

    if (!banner || !bar || !text) return;

    if (subtotal >= freeShippingTarget) {
        bar.style.width = '100%';
        bar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        text.textContent = '🎉 ¡Felicidades! Tienes Domicilio GRATIS';
    } else {
        const pct = Math.min(100, Math.round((subtotal / freeShippingTarget) * 100));
        const remaining = freeShippingTarget - subtotal;
        bar.style.width = `${pct}%`;
        bar.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
        text.textContent = `Faltan $ ${remaining.toLocaleString('es-CO')} para envío gratis`;
    }
}

function updateCartTotals(subtotal) {
    const isFree = subtotal >= 30000;
    const rawFee = state.storeConfig.deliveryFee || 3000;
    const fee = (state.storeConfig.fulfillmentType === 'DELIVERY' && !isFree) ? rawFee : 0;
    const total = subtotal + fee;

    const subStep1 = document.getElementById('cartSubtotalStep1');
    const subStep3 = document.getElementById('cartSubtotal');
    const feeSummary = document.getElementById('cartDeliveryFeeSummary');
    const grandTotal = document.getElementById('cartTotal');
    const fabTotal = document.getElementById('fabCartTotal');

    if (subStep1) subStep1.textContent = `$ ${subtotal.toLocaleString('es-CO')}`;
    if (subStep3) subStep3.textContent = `$ ${subtotal.toLocaleString('es-CO')}`;
    if (fabTotal) fabTotal.textContent = `$ ${total.toLocaleString('es-CO')}`;
    
    if (feeSummary) {
        if (state.storeConfig.fulfillmentType === 'PICKUP') {
            feeSummary.textContent = 'GRATIS (Recogida)';
        } else if (isFree) {
            feeSummary.textContent = '¡GRATIS!';
            feeSummary.style.color = '#059669';
            feeSummary.style.fontWeight = '900';
        } else {
            feeSummary.textContent = `$ ${fee.toLocaleString('es-CO')}`;
            feeSummary.style.color = 'inherit';
        }
    }
    
    if (grandTotal) grandTotal.textContent = `$ ${total.toLocaleString('es-CO')}`;
}

function goToCartStep(step) {
    state.currentCartStep = step;
    
    const subtitles = {
        1: 'Paso 1 de 3: Revisa tus productos seleccionados',
        2: 'Paso 2 de 3: Método de envío y datos de entrega',
        3: 'Paso 3 de 3: Confirma tu pedido por WhatsApp'
    };
    const subEl = document.getElementById('cartHeaderSubtitle');
    if (subEl) subEl.textContent = subtitles[step] || 'Checkout Merkostore';

    const fillEl = document.getElementById('stepperProgressFill');
    if (fillEl) {
        const widths = { 1: '0%', 2: '50%', 3: '100%' };
        fillEl.style.width = widths[step] || '0%';
    }

    [1, 2, 3].forEach(s => {
        const pill = document.getElementById(`tabCartStep${s}`);
        const panel = document.getElementById(`wizardStep${s}`);
        
        if (pill) {
            pill.classList.toggle('active', s === step);
            if (s < step) {
                pill.classList.add('completed');
            } else {
                pill.classList.remove('completed');
            }
        }
        
        if (panel) {
            panel.classList.toggle('active', s === step);
        }
    });

    if (step === 3) {
        const nameInput = document.getElementById('custName');
        const addrInput = document.getElementById('custAddress');
        const ticketName = document.getElementById('ticketCustName');
        const ticketAddr = document.getElementById('ticketCustAddress');

        if (ticketName && nameInput) ticketName.textContent = nameInput.value || 'Cliente';
        if (ticketAddr && addrInput) ticketAddr.textContent = addrInput.value || 'Dirección de entrega';
    }

    const viewport = document.querySelector('.wizard-steps-viewport');
    if (viewport) viewport.scrollTop = 0;
}

function selectFulfillment(type) {
    state.storeConfig.fulfillmentType = type;
    
    const optDel = document.getElementById('optDelivery');
    const optPic = document.getElementById('optPickup');
    const radioDel = document.getElementById('radioDelivery');
    const radioPic = document.getElementById('radioPickup');
    const step2Summary = document.getElementById('step2Summary');

    if (type === 'DELIVERY') {
        if (optDel) optDel.classList.add('active');
        if (optPic) optPic.classList.remove('active');
        if (radioDel) radioDel.checked = true;
        if (step2Summary) step2Summary.textContent = 'Domicilio Express';
    } else {
        if (optPic) optPic.classList.add('active');
        if (optDel) optDel.classList.remove('active');
        if (radioPic) radioPic.checked = true;
        if (step2Summary) step2Summary.textContent = 'Recogida Local';
    }

    renderCart();
}

function selectPaymentMethod(method) {
    currentPaymentMethod = method;
    ['WHATSAPP', 'CASH', 'NEQUI'].forEach(m => {
        const card = document.getElementById('optPay' + m.charAt(0) + m.slice(1).toLowerCase());
        if (card) {
            card.classList.toggle('active', m === method);
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = (m === method);
        }
    });
}

function renderTicketPreview(items) {
    const container = document.getElementById('ticketItemsPreview');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted);">No hay ítems en la orden</div>';
        return;
    }

    container.innerHTML = items.map(it => `
        <div class="ticket-item-pill">
            <span>${it.qty}x ${it.name}</span>
            <strong>$ ${it.subtotal.toLocaleString('es-CO')}</strong>
        </div>
    `).join('');
}

function toggleCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    overlay.classList.toggle('active');
    drawer.classList.toggle('active');
}

async function processWhatsAppCheckout() {
    const cartIds = Object.keys(state.cart);
    if (cartIds.length === 0) {
        showToast('⚠️ Tu carrito está vacío. Selecciona productos.', 'warning', '⚠️');
        return;
    }

    const name = document.getElementById('custName')?.value || '';
    const phone = document.getElementById('custPhone')?.value || '';
    const address = document.getElementById('custAddress')?.value || '';
    const notes = document.getElementById('custNotes')?.value || '';

    if (!name || !phone || !address) {
        showToast('⚠️ Por favor completa tu Nombre, Teléfono y Dirección.', 'warning', '⚠️');
        return;
    }

    const itemsRequest = cartIds.map(id => ({
        productId: id,
        quantity: state.cart[id]
    }));

    const orderPayload = {
        storeId: 'default-store',
        items: itemsRequest,
        customer: {
            name: name,
            phone: phone,
            deliveryAddress: address,
            notes: notes
        },
        paymentMethod: currentPaymentMethod,
        fulfillmentType: state.storeConfig.fulfillmentType
    };

    try {
        showToast('⏳ Registrando y verificando pedido en el servidor...', 'info', '⏳');
        const response = await API.post('/api/v1/orders', orderPayload);

        if (response && response.success && response.data) {
            const newOrder = response.data;
            const newOrderCode = newOrder.orderNumber;
            const total = newOrder.total;
            const subtotal = newOrder.subtotal;
            const fee = newOrder.deliveryFee;

            // Save order into local history view
            const mappedOrder = {
                id: newOrder.id,
                orderNumber: newOrderCode,
                customerName: name,
                customerPhone: phone,
                deliveryAddress: address,
                fulfillmentType: newOrder.fulfillmentType,
                items: newOrder.items || [],
                subtotal: subtotal,
                deliveryFee: fee,
                total: total,
                paymentMethod: currentPaymentMethod,
                paymentStatus: 'PENDING',
                paymentStatusLabel: 'PENDIENTE DE CONFIRMACIÓN',
                status: 'RECEIVED',
                createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
            };

            state.orders.unshift(mappedOrder);
            renderHistorialUnificadoTable();

            // Reset Cart
            state.cart = {};
            renderProducts();
            renderCart();
            toggleCartDrawer();

            showToast('🚀 Pedido confirmado en el servidor. Redirigiendo a WhatsApp...', 'success', '📲');

            let itemsText = '';
            if (newOrder.items) {
                newOrder.items.forEach(it => {
                    itemsText += `  • ${it.quantity}x ${it.productName} ($ ${it.subtotal.toLocaleString('es-CO')})\n`;
                });
            }

            const typeLabel = state.storeConfig.fulfillmentType === 'DELIVERY' ? '🚚 Domicilio a casa' : '🏬 Recogida en local';
            const paymentLabels = {
                'WHATSAPP': '📲 Pedido Directo por WhatsApp',
                'CASH': '💵 Efectivo Contra Entrega',
                'NEQUI': '📱 Transferencia Nequi / Daviplata'
            };
            const paymentText = paymentLabels[currentPaymentMethod] || '📲 WhatsApp Directo';

            const message = `🛒 *NUEVO PEDIDO EN MERKOSTORE*\n` +
                            `═════════════════════════\n` +
                            `🔖 *Código Oficial:* ${newOrderCode}\n` +
                            `👤 *Cliente:* ${name}\n` +
                            `📱 *Teléfono:* ${phone}\n` +
                            `📍 *Entrega:* ${typeLabel}\n` +
                            `🏠 *Dirección:* ${address}\n` +
                            `💳 *Pago:* ${paymentText}\n` +
                            (notes ? `📝 *Nota:* ${notes}\n` : '') +
                            `═════════════════════════\n` +
                            `📦 *PRODUCTOS SOLICITADOS:*\n${itemsText}` +
                            `═════════════════════════\n` +
                            `💰 *Subtotal Ítems:* $ ${subtotal.toLocaleString('es-CO')}\n` +
                            `🚚 *Costo Domicilio:* ${fee === 0 ? '¡GRATIS!' : '$ ' + fee.toLocaleString('es-CO')}\n` +
                            `💵 *TOTAL VERIFICADO:* $ ${total.toLocaleString('es-CO')} COP\n\n` +
                            `¡Hola! Confirmo mi pedido registrado con el código *${newOrderCode}*. Quedo atento a la entrega.`;

            window.open(`https://wa.me/${state.storeConfig.whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank');
            loadPublicBackendData();
        } else {
            showToast(`❌ No se pudo registrar el pedido: ${response.message || 'Error en el servidor'}`, 'error', '❌');
        }
    } catch (err) {
        showToast(`❌ Error al procesar el pedido: ${err.message}`, 'error', '❌');
    }
}

// ==========================================================================
// MERKO BRAND ADMIN DASHBOARD & PRODUCTO/MERCADO EDITOR ENGINE
// ==========================================================================

function switchAdminSubTab(tab) {
    state.currentAdminSubTab = tab;

    ['dashboard', 'products', 'productEditor', 'orders', 'categories', 'config', 'users', 'bi'].forEach(t => {
        const btnId = 'tabMerko' + (t === 'bi' ? 'Bi' : t.charAt(0).toUpperCase() + t.slice(1));
        const contentId = 'subtab' + (t === 'bi' ? 'Bi' : t.charAt(0).toUpperCase() + t.slice(1));
        const btn = document.getElementById(btnId);
        const content = document.getElementById(contentId);
        if (btn) btn.classList.toggle('active', t === tab);
        if (content) content.style.display = t === tab ? 'block' : 'none';
    });

    if (tab === 'dashboard') { updateDashboardKPIs(); renderDashboardContent(); }
    if (tab === 'products') renderAdminProductsTable();
    if (tab === 'productEditor') {
        renderMercadoItemsChecklist();
        if (!state.editingProductId) {
            resetProductEditorForm(false);
        }
    }
    if (tab === 'categories') renderAdminCategoriesTable();
    if (tab === 'orders') renderHistorialUnificadoTable();
    if (tab === 'users') loadAdminUsersData();
}

async function loadAdminUsersData() {
    try {
        const res = await API.get('/api/v1/admin/users').catch(() => null);
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            state.users = res.data;
        } else if (!state.users || state.users.length === 0) {
            state.users = [
                { id: 'u1', username: 'mary' },
                { id: 'u2', username: 'duvan' },
                { id: 'u3', username: 'cris' }
            ];
        }
        renderAdminUsersTable();
    } catch (e) {
        if (!state.users || state.users.length === 0) {
            state.users = [
                { id: 'u1', username: 'mary' },
                { id: 'u2', username: 'duvan' },
                { id: 'u3', username: 'cris' }
            ];
        }
        renderAdminUsersTable();
    }
}

function renderAdminUsersTable() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    let usersList = state.users || [];
    if (usersList.length === 0) {
        usersList = [
            { id: 'u1', username: 'mary' },
            { id: 'u2', username: 'duvan' },
            { id: 'u3', username: 'cris' }
        ];
        state.users = usersList;
    }

    tbody.innerHTML = usersList.map(u => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding:16px 20px; font-weight:700; color:#ffffff; font-size:0.95rem;">
                <span style="display:inline-flex; align-items:center; gap:8px;">
                    <span style="color:#FF8F00; font-size:1rem;">👤</span> ${u.username}
                </span>
            </td>
            <td style="padding:16px 20px; text-align:right;">
                <button class="btn-delete-admin-pill" onclick="deleteAdminUser('${u.id}')" style="background:#7f1d1d; color:#fca5a5; border:1px solid rgba(239,68,68,0.3); padding:6px 18px; border-radius:8px; font-size:0.8rem; font-weight:800; cursor:pointer; transition:all 0.2s ease;">
                    🗑️ Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

function openCreateAdminModal() {
    document.getElementById('modalCreateAdmin').classList.add('active');
}

function closeCreateAdminModal() {
    document.getElementById('modalCreateAdmin').classList.remove('active');
}

async function handleCreateAdminUser(e) {
    e.preventDefault();
    const username = document.getElementById('newAdminUsername').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    const name = document.getElementById('newAdminName')?.value.trim() || '';
    const email = document.getElementById('newAdminEmail')?.value.trim() || '';

    if (!username) return;

    const newAdmin = {
        id: 'u-' + Date.now(),
        username: username,
        name: name || username,
        email: email || `${username}@merkostore.com`
    };

    try {
        if (API.getToken()) {
            await API.post('/api/v1/admin/users', {
                username: username,
                password: password,
                name: name,
                email: email
            }).catch(() => {});
        }
    } catch (err) {
        console.warn('API error creating admin, local fallback active', err);
    }

    if (!state.users) state.users = [];
    state.users.push(newAdmin);

    renderAdminUsersTable();
    closeCreateAdminModal();

    document.getElementById('newAdminUsername').value = '';
    document.getElementById('newAdminPassword').value = '';
    if (document.getElementById('newAdminName')) document.getElementById('newAdminName').value = '';
    if (document.getElementById('newAdminEmail')) document.getElementById('newAdminEmail').value = '';

    showToast(`👤 Administrador "${username}" creado exitosamente`, 'success', '👤');
}

async function deleteAdminUser(userId) {
    let usersList = state.users || [];
    if (usersList.length <= 1) {
        showToast('🔒 Por seguridad, el último administrador no se puede eliminar.', 'warning', '🔒');
        return;
    }

    const u = usersList.find(user => user.id === userId);
    const username = u ? u.username : 'seleccionado';

    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${username}"?`)) {
        return;
    }

    try {
        if (API.getToken()) {
            await API.delete(`/api/v1/admin/users/${userId}`).catch(() => {});
        }
    } catch (err) {
        console.warn('API error deleting admin, local fallback active', err);
    }

    state.users = usersList.filter(user => user.id !== userId);
    renderAdminUsersTable();
    showToast(`🗑️ Administrador "${username}" eliminado correctamente`, 'warning', '🗑️');
}

function filterAdminInventoryStock(filter) {
    state.adminStockFilter = filter;

    const filterBtns = {
        'ALL': 'filterStockAll',
        'IN_STOCK': 'filterStockInStock',
        'SOLD_OUT': 'filterStockSoldOut',
        'LOW_STOCK': 'filterStockLow'
    };

    Object.keys(filterBtns).forEach(k => {
        const btn = document.getElementById(filterBtns[k]);
        if (btn) {
            if (k === filter) {
                btn.style.background = 'var(--brand-primary)';
                btn.style.color = '#ffffff';
                btn.style.borderColor = 'var(--brand-primary)';
            } else {
                btn.style.background = '';
                btn.style.color = '';
                btn.style.borderColor = '';
            }
        }
    });

    renderAdminProductsTable();
}

async function toggleProductStockAvailability(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const newStatus = !(product.isAvailable !== false);
    product.isAvailable = newStatus;

    try {
        if (API.getToken()) {
            await API.put(`/api/v1/products/${productId}/availability`, { isAvailable: newStatus }).catch(() => {});
        }
    } catch (err) {
        console.warn('API error toggling availability, local fallback active', err);
    }

    renderAdminProductsTable();
    renderProducts();
    if (typeof updateDashboardKPIs === 'function') {
        updateDashboardKPIs();
    }

    const statusText = newStatus ? '✓ En Stock' : '✕ Agotado';
    const toastType = newStatus ? 'success' : 'warning';
    const icon = newStatus ? '🟢' : '🔴';
    showToast(`Estado de "${product.name}" actualizado a: ${statusText}`, toastType, icon);
}

function renderAdminProductsTable() {
    const tbody = document.getElementById('productsAdminTable');
    if (!tbody) return;

    const searchQuery = (document.getElementById('adminInventorySearchInput')?.value || '').toLowerCase().trim();
    const filter = state.adminStockFilter || 'ALL';

    let list = state.products;

    if (searchQuery) {
        list = list.filter(p => 
            p.name.toLowerCase().includes(searchQuery) ||
            getCategoryName(p.categoryId).toLowerCase().includes(searchQuery)
        );
    }

    if (filter === 'IN_STOCK') {
        list = list.filter(p => p.isAvailable !== false && p.stock > 0);
    } else if (filter === 'SOLD_OUT') {
        list = list.filter(p => p.isAvailable === false || p.stock <= 0);
    } else if (filter === 'LOW_STOCK') {
        list = list.filter(p => p.stock <= 3 && p.stock > 0);
    }

    const badge = document.getElementById('adminInventoryCountBadge');
    if (badge) {
        badge.textContent = `${list.length} DE ${state.products.length}`;
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px; color:var(--admin-text-muted);">
                    No se encontraron productos o mercados con el filtro seleccionado.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(p => {
        const isMercado = p.type === 'MERCADO';
        const isAvailable = p.isAvailable !== false && p.stock > 0;

        return `
            <tr>
                <td>
                    <img src="${p.imageUrl}" alt="${p.name}" style="width:42px; height:42px; border-radius:8px; object-fit:cover; border:1px solid rgba(255,255,255,0.1);">
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <strong style="font-size:0.92rem; color:#ffffff;">${p.name}</strong>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span class="card-type-badge ${isMercado ? 'mercado' : 'detal'}" style="position:static; font-size:0.65rem; padding:2px 6px;">
                                ${isMercado ? 'Mercado' : 'Producto Detal'}
                            </span>
                            <span style="font-size:0.65rem; color:#94a3b8; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px;">Cloudinary</span>
                        </div>
                    </div>
                </td>
                <td style="font-size:0.85rem; color:#cbd5e1;">${getCategoryName(p.categoryId)}</td>
                <td style="font-weight:900; color:#fbbf24; font-size:0.92rem;">$ ${(p.discountPrice || p.price).toLocaleString('es-CO')}</td>
                <td style="font-weight:800; color:#ffffff; font-size:0.95rem;">
                    ${p.stock} ${p.variantInfo ? `<span style="font-size:0.75rem; color:#94a3b8;">(${p.variantInfo})</span>` : ''}
                </td>
                <td>
                    <button class="stock-toggle-pill-btn ${isAvailable ? 'en-stock' : 'agotado'}" onclick="toggleProductStockAvailability('${p.id}')">
                        ${isAvailable ? '✓ En Stock' : '✕ Agotado'}
                    </button>
                </td>
                <td style="text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:6px;">
                        <button class="btn-merko-outline" style="padding:5px 12px; font-size:0.75rem; background:#332924;" onclick="editProduct('${p.id}')">✏️ Editar</button>
                        <button class="btn-merko-outline" style="padding:5px 12px; font-size:0.75rem; color:#f87171; border-color:rgba(239, 68, 68, 0.4); background:rgba(239, 68, 68, 0.15);" onclick="deleteProduct('${p.id}')">🗑️ Eliminar</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getCategoryName(catId) {
    const cat = state.categories.find(c => c.id === catId);
    return cat ? cat.name : catId;
}

function toggleMercadoCompositionForm() {
    const type = document.getElementById('editorType').value;
    const container = document.getElementById('mercadoItemsContainer');
    const lblStock = document.getElementById('lblEditorStock');

    if (type === 'MERCADO') {
        container.style.display = 'block';
        lblStock.textContent = 'Inventario (Calculado Automáticamente)';
        renderMercadoItemsChecklist();
    } else {
        container.style.display = 'none';
        lblStock.textContent = 'Cantidad en Inventario *';
    }
}

function renderMercadoItemsChecklist() {
    const container = document.getElementById('mercadoItemsChecklist');
    if (!container) return;

    const detalProducts = state.products.filter(p => p.type === 'DETAL');
    container.innerHTML = detalProducts.map(p => `
        <div style="display:flex; align-items:center; justify-space-between; background:#18181b; padding:8px 12px; border-radius:8px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#ffffff; cursor:pointer;">
                <input type="checkbox" class="mercado-bundle-check" data-id="${p.id}" checked>
                <span>${p.name} (Stock detal: ${p.stock})</span>
            </label>
            <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.72rem; color:#a1a1aa;">Cant:</span>
                <input type="number" class="mercado-bundle-qty" data-id="${p.id}" value="1" min="1" style="width:55px; padding:4px 6px; font-size:0.8rem; background:#0f172a; color:#fff; border:1px solid #3f3f46; border-radius:4px;">
            </div>
        </div>
    `).join('');
}

function handleProductImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    const fileNameSpan = document.getElementById('editorImageFileName');
    
    if (file) {
        if (fileNameSpan) fileNameSpan.textContent = `🖼️ ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            const imgInput = document.getElementById('editorImage');
            if (imgInput) imgInput.value = dataUrl;
            updateLivePreview();
        };
        reader.readAsDataURL(file);
    } else {
        if (fileNameSpan) fileNameSpan.textContent = 'Ningún archivo seleccionado';
    }
}

function resetProductEditorForm(userCancelled = false) {
    state.editingProductId = null;

    const elType = document.getElementById('editorType');
    const elName = document.getElementById('editorName');
    const elCat = document.getElementById('editorCategory');
    const elUnit = document.getElementById('editorUnit');
    const elPrice = document.getElementById('editorPrice');
    const elDisc = document.getElementById('editorDiscount');
    const elStock = document.getElementById('editorStock');
    const elImg = document.getElementById('editorImage');

    if (elType) elType.value = 'DETAL';
    if (elName) elName.value = '';
    if (elCat) elCat.value = 'cat4';
    if (elUnit) elUnit.value = '';
    if (elPrice) elPrice.value = '';
    if (elDisc) elDisc.value = '';
    if (elStock) elStock.value = '';
    if (elImg) elImg.value = '';

    const fileInput = document.getElementById('editorImageFile');
    if (fileInput) fileInput.value = '';
    const fileNameSpan = document.getElementById('editorImageFileName');
    if (fileNameSpan) fileNameSpan.textContent = 'Ningún archivo seleccionado';

    const titleEl = document.getElementById('editorSubtabTitle');
    if (titleEl) titleEl.textContent = '➕ CREAR PRODUCTO O MERCADO';

    const btnSave = document.getElementById('btnSaveProductEditor');
    if (btnSave) btnSave.innerHTML = '💾 Guardar en el Catálogo';

    const btnCancel = document.getElementById('btnCancelProductEditor');
    if (btnCancel) btnCancel.style.display = 'none';

    toggleMercadoCompositionForm();
    updateLivePreview();

    if (userCancelled) {
        showToast('ℹ️ Edición cancelada. Formulario listo para crear un nuevo producto.', 'info', 'ℹ️');
    }
}

function editProduct(productId) {
    const p = state.products.find(prod => prod.id === productId);
    if (!p) return;

    state.editingProductId = productId;

    const titleEl = document.getElementById('editorSubtabTitle');
    if (titleEl) titleEl.textContent = '✏️ EDITAR PRODUCTO O MERCADO';

    const btnSave = document.getElementById('btnSaveProductEditor');
    if (btnSave) btnSave.innerHTML = '💾 Actualizar Producto / Mercado';

    const btnCancel = document.getElementById('btnCancelProductEditor');
    if (btnCancel) btnCancel.style.display = 'inline-flex';

    document.getElementById('editorType').value = p.type || 'DETAL';
    document.getElementById('editorName').value = p.name || '';
    document.getElementById('editorCategory').value = p.categoryId || 'cat4';
    document.getElementById('editorUnit').value = p.unitCalc || '';
    document.getElementById('editorPrice').value = p.price || '';
    document.getElementById('editorDiscount').value = p.discountPrice || '';
    document.getElementById('editorStock').value = p.stock || 0;
    document.getElementById('editorImage').value = p.imageUrl || '';

    const fileInput = document.getElementById('editorImageFile');
    if (fileInput) fileInput.value = '';
    const fileNameSpan = document.getElementById('editorImageFileName');
    if (fileNameSpan) {
        fileNameSpan.textContent = p.imageUrl ? '🖼️ Imagen actual cargada (haz clic para cambiar)' : 'Ningún archivo seleccionado';
    }

    toggleMercadoCompositionForm();

    if (p.type === 'MERCADO' && p.bundleItems) {
        p.bundleItems.forEach(b => {
            const chk = document.querySelector(`.mercado-bundle-check[data-id="${b.productId}"]`);
            const qtyInp = document.querySelector(`.mercado-bundle-qty[data-id="${b.productId}"]`);
            if (chk) chk.checked = true;
            if (qtyInp) qtyInp.value = b.quantity;
        });
    }

    updateLivePreview();
    switchAdminSubTab('productEditor');
}

function deleteProduct(productId) {
    const p = state.products.find(prod => prod.id === productId);
    if (confirm('¿Estás seguro de eliminar este ítem del catálogo?')) {
        state.products = state.products.filter(prod => prod.id !== productId);
        recalculateMercadoStocks();
        renderProducts();
        renderAdminProductsTable();
        showToast(`🗑️ ${p ? p.name : 'Ítem'} eliminado del catálogo`, 'warning', '🗑️');
    }
}

function updateLivePreview() {
    const type = document.getElementById('editorType')?.value || 'DETAL';
    const name = document.getElementById('editorName')?.value || 'Nombre del Ítem';
    const unit = document.getElementById('editorUnit')?.value || 'Unidad regular';
    const price = parseFloat(document.getElementById('editorPrice')?.value) || 0;
    const discount = parseFloat(document.getElementById('editorDiscount')?.value) || null;
    const image = document.getElementById('editorImage')?.value || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500';

    document.getElementById('prevName').textContent = name;
    document.getElementById('prevUnit').textContent = unit;
    document.getElementById('prevUnitCalc').textContent = unit;
    document.getElementById('prevImg').src = image;

    const badge = document.getElementById('prevTypeBadge');
    if (badge) {
        badge.className = `card-type-badge ${type === 'MERCADO' ? 'mercado' : 'detal'}`;
        badge.textContent = type === 'MERCADO' ? '📦 MERCADO' : '🛍️ DETAL';
    }

    const discountTag = document.getElementById('prevDiscountTag');
    const salePrice = document.getElementById('prevSalePrice');

    if (discount && discount < price) {
        const pct = Math.round(((price - discount) / price) * 100);
        discountTag.textContent = `-${pct}%`;
        discountTag.style.display = 'block';
        salePrice.className = 'card-sale-price discounted';
        salePrice.innerHTML = `$ ${discount.toLocaleString('es-CO')} <span class="card-old-price">$ ${price.toLocaleString('es-CO')}</span>`;
    } else {
        discountTag.style.display = 'none';
        salePrice.className = 'card-sale-price';
        salePrice.textContent = `$ ${price.toLocaleString('es-CO')}`;
    }
}

function saveProductFromEditor() {
    const type = document.getElementById('editorType').value;
    const name = document.getElementById('editorName').value.trim();
    const cat = document.getElementById('editorCategory').value;
    const unit = document.getElementById('editorUnit').value.trim();
    const price = parseFloat(document.getElementById('editorPrice').value);
    const discount = parseFloat(document.getElementById('editorDiscount').value) || null;
    const stock = parseInt(document.getElementById('editorStock').value) || 0;
    const image = document.getElementById('editorImage').value.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500';

    if (!name || isNaN(price)) {
        showToast('⚠️ Por favor completa los campos obligatorios (Nombre y Precio Venta).', 'warning', '⚠️');
        return;
    }

    let bundleItems = [];
    if (type === 'MERCADO') {
        const checks = document.querySelectorAll('.mercado-bundle-check:checked');
        checks.forEach(chk => {
            const pId = chk.getAttribute('data-id');
            const qtyInput = document.querySelector(`.mercado-bundle-qty[data-id="${pId}"]`);
            const qty = parseInt(qtyInput?.value || 1);
            bundleItems.push({ productId: pId, quantity: qty });
        });
    }

    let pct = null;
    if (discount && discount < price) {
        pct = `-${Math.round(((price - discount) / price) * 100)}%`;
    }

    if (state.editingProductId) {
        const existingIndex = state.products.findIndex(p => p.id === state.editingProductId);
        if (existingIndex !== -1) {
            state.products[existingIndex] = {
                ...state.products[existingIndex],
                type: type,
                categoryId: cat,
                name: name,
                unitCalc: unit,
                price: price,
                discountPrice: discount,
                discountPercent: pct,
                stock: stock,
                imageUrl: image,
                bundleItems: bundleItems
            };
            showToast(`✅ ¡"${name}" actualizado exitosamente!`, 'success', '💾');
        }
    } else {
        const newProd = {
            id: (type === 'MERCADO' ? 'm-' : 'p-') + Date.now(),
            type: type,
            categoryId: cat,
            sku: (type === 'MERCADO' ? 'MER-' : 'SKU-') + Math.floor(100 + Math.random() * 900),
            name: name,
            unitCalc: unit,
            costPrice: price * 0.7,
            price: price,
            discountPrice: discount,
            discountPercent: pct,
            stock: stock,
            imageUrl: image,
            isAvailable: true,
            bundleItems: bundleItems
        };
        state.products.unshift(newProd);
        showToast(`✅ ¡${type === 'MERCADO' ? 'Mercado Combo' : 'Producto Detal'} guardado exitosamente!`, 'success', '💾');
    }

    recalculateMercadoStocks();
    renderProducts();
    renderAdminProductsTable();

    resetProductEditorForm();

    switchAdminSubTab('products');
}

// CATEGORIES MANAGEMENT
function renderAdminCategoriesTable() {
    const tbody = document.getElementById('categoriesAdminTable');
    if (!tbody) return;

    tbody.innerHTML = state.categories.map(c => `
        <tr>
            <td style="font-size:1.4rem;">${c.icon}</td>
            <td><strong style="color:#ffffff;">${c.name}</strong></td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn-merko-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="editCategory('${c.id}')">✏️ Editar</button>
                    <button class="btn-merko-outline" style="padding:4px 10px; font-size:0.75rem; color:#ef4444; border-color:#ef4444;" onclick="deleteCategory('${c.id}')">🗑️ Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

const MARKET_EMOJIS = [
    '🌾', '🥛', '🥩', '🍎', '🥦', '🍞', '🧃', '🍺', '🍫', '🧼', 
    '🔴', '📦', '🧀', '🐔', '🐟', '☕', '🧹', '🐶', '🍦', '🧴',
    '🥑', '🍇', '🥕', '🥔', '🍋', '🍿', '🍬', '🧻', '🕯️', '⚡'
];

function renderEmojiPickers() {
    const createPicker = document.getElementById('createEmojiPicker');
    const editPicker = document.getElementById('editEmojiPicker');
    
    const buildGrid = (targetInputId) => MARKET_EMOJIS.map(e => `
        <button type="button" class="emoji-pick-btn" onclick="selectEmojiForInput('${e}', '${targetInputId}')">${e}</button>
    `).join('');

    if (createPicker) createPicker.innerHTML = buildGrid('newCatIcon');
    if (editPicker) editPicker.innerHTML = buildGrid('editCatIcon');
}

function selectEmojiForInput(emoji, inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = emoji;
    }
}

function renderCategoryOptions() {
    const select = document.getElementById('editorCategory');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = state.categories.map(c => `
        <option value="${c.id}">${c.icon} ${c.name}</option>
    `).join('');
    if (currentVal && state.categories.some(c => c.id === currentVal)) {
        select.value = currentVal;
    }
}

function saveNewCategory() {
    const nameInput = document.getElementById('newCatName');
    const name = nameInput ? nameInput.value.trim() : '';
    const icon = (document.getElementById('newCatIcon').value || '🏷️').trim();
    const color = document.getElementById('newCatColor').value || '#fef3c7';

    if (!name) {
        showToast('⚠️ Escribe el nombre de la categoría', 'warning', '⚠️');
        return;
    }

    const newCat = {
        id: 'cat-' + Date.now(),
        name: name,
        icon: icon,
        bgColor: color
    };

    state.categories.push(newCat);
    renderCategoryBadges();
    renderAdminCategoriesTable();
    renderCategoryOptions();
    if (nameInput) nameInput.value = '';
    showToast(`✨ Categoría "${name}" creada exitosamente`, 'success', '✨');
}

function editCategory(catId) {
    const cat = state.categories.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById('editCatId').value = cat.id;
    document.getElementById('editCatName').value = cat.name;
    document.getElementById('editCatIcon').value = cat.icon || '🏷️';
    document.getElementById('editCatColor').value = cat.bgColor || '#fef3c7';

    renderEmojiPickers();
    document.getElementById('editCategoryModal').classList.add('active');
}

function closeEditCategoryModal() {
    document.getElementById('editCategoryModal').classList.remove('active');
}

function handleSaveCategoryEdit(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('editCatId').value;
    const name = document.getElementById('editCatName').value.trim();
    const icon = (document.getElementById('editCatIcon').value || '🏷️').trim();
    const color = document.getElementById('editCatColor').value || '#fef3c7';

    if (!name) {
        showToast('⚠️ Escribe el nombre de la categoría', 'warning', '⚠️');
        return;
    }

    const cat = state.categories.find(c => c.id === id);
    if (cat) {
        cat.name = name;
        cat.icon = icon;
        cat.bgColor = color;
    }

    renderCategoryBadges();
    renderAdminCategoriesTable();
    renderCategoryOptions();
    closeEditCategoryModal();
    showToast(`✨ Categoría "${name}" actualizada con éxito`, 'success', '✨');
}

function deleteCategory(catId) {
    if (state.categories.length <= 1) {
        showToast('⚠️ Debes mantener al menos una categoría.', 'warning', '⚠️');
        return;
    }
    const cat = state.categories.find(c => c.id === catId);
    if (!cat) return;

    state.categories = state.categories.filter(c => c.id !== catId);
    renderCategoryBadges();
    renderAdminCategoriesTable();
    renderCategoryOptions();
    showToast(`🗑️ Categoría "${cat.name}" eliminada`, 'warning', '🗑️');
}

// ==========================================================================
// CONTROL DE PEDIDOS & HISTORIAL UNIFICADO ENGINE (MATCHING IMAGE 1 & 2)
// ==========================================================================

function filterHistorialTipo(tipo) {
    state.historialTypeFilter = tipo;
    ['All', 'Productos', 'Mercados'].forEach(t => {
        const btn = document.getElementById('btnFilterTipo' + t);
        if (btn) {
            const matches = (t === 'All' && tipo === 'ALL') || (t === 'Productos' && tipo === 'DETAL') || (t === 'Mercados' && tipo === 'MERCADO');
            btn.classList.toggle('active', matches);
        }
    });
    renderHistorialUnificadoTable();
}

function filterPeriod(period) {
    state.historialPeriodFilter = period;
    const periods = ['All', 'Today', 'Yesterday', 'Week', 'Month', '30Days'];
    periods.forEach(p => {
        const btn = document.getElementById('btnPeriod' + p);
        if (btn) btn.classList.toggle('active', p.toUpperCase() === period);
    });
    renderHistorialUnificadoTable();
}

function filterHistorialTable() {
    state.historialSearchQuery = document.getElementById('historialSearchInput')?.value.toLowerCase() || '';
    state.historialStatusFilter = document.getElementById('historialStatusSelect')?.value || 'ALL';
    renderHistorialUnificadoTable();
}

function renderHistorialUnificadoTable() {
    updateDashboardKPIs();
    const tbody = document.getElementById('historialUnificadoTableBody');
    if (!tbody) return;

    let filtered = [...state.orders];

    // Filter by Tipo (if order contains product or mercado)
    if (state.historialTypeFilter !== 'ALL') {
        filtered = filtered.filter(o => o.items.some(it => it.type === state.historialTypeFilter));
    }

    // Filter by Status
    if (state.historialStatusFilter !== 'ALL') {
        filtered = filtered.filter(o => o.status === state.historialStatusFilter);
    }

    // Filter by Search Query
    if (state.historialSearchQuery) {
        const q = state.historialSearchQuery;
        filtered = filtered.filter(o => 
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerPhone.toLowerCase().includes(q) ||
            o.items.some(it => it.name.toLowerCase().includes(q))
        );
    }

    // KPI Metrics calculation
    const totalCount = state.orders.length;
    const confirmedCount = state.orders.filter(o => o.status === 'DELIVERED' || o.paymentStatus === 'PAID').length;
    const totalSales = state.orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.total : 0), 0);

    document.getElementById('histKpiRegistros').textContent = totalCount;
    document.getElementById('histKpiConfirmadas').textContent = confirmedCount;
    document.getElementById('histKpiTotal').textContent = `$ ${totalSales.toLocaleString('es-CO')}`;
    document.getElementById('histKpiShowing').textContent = `${filtered.length} de ${totalCount}`;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:32px; color:#a1a1aa;">
                    No hay registros de pedidos o compras para los filtros seleccionados.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(o => {
        const itemsListText = o.items.map(it => `${it.name}`).join(', ');
        const isPaid = o.paymentStatus === 'PAID';
        
        return `
            <tr>
                <td>
                    <div class="code-badge-gold">${o.orderNumber}</div>
                    <div class="client-name-bold">${o.customerName}</div>
                    <div class="client-phone-sub">${o.customerPhone}</div>
                </td>
                <td style="max-width:260px;">
                    <div class="items-solicitud-text">${itemsListText}</div>
                    <div style="margin-top:4px;">
                        ${o.items.map(it => `
                            <span class="card-type-badge ${it.type === 'MERCADO' ? 'mercado' : 'detal'}" style="position:static; font-size:0.6rem; padding:1px 6px;">
                                ${it.type === 'MERCADO' ? 'MERCADO' : 'PRODUCTO'}
                            </span>
                        `).join(' ')}
                    </div>
                </td>
                <td>
                    <div style="font-size:0.8rem; font-weight:700;">Registro:${o.createdAt || o.dateOnly}</div>
                    <div style="font-size:0.75rem; color:#f59e0b; margin-top:2px;">
                        ${o.fulfillmentType === 'DELIVERY' ? '🚚 Envío a domicilio' : '🏬 Recogida local'}
                    </div>
                </td>
                <td style="font-weight:900; color:#10b981; font-size:0.95rem;">
                    $ ${o.total.toLocaleString('es-CO')}
                </td>
                <td>
                    <div class="method-tag-pill">
                        💳 ${o.paymentMethod || 'Wompi - Automático'}
                    </div>
                    <div>
                        <span class="status-tag-pill ${isPaid ? 'delivered' : 'preparing'}">
                            ${isPaid ? '✓ PAGADO' : 'PENDIENTE'}
                        </span>
                    </div>
                </td>
                <td style="font-size:0.78rem; color:#a1a1aa;">
                    ${o.archivedDate || o.dateOnly}
                </td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-merko-outline" style="padding:6px 12px; font-size:0.75rem; border-color:#f59e0b; color:#f59e0b;" onclick="openOrderDetailModal('${o.id}')">
                            👁️ Detalle
                        </button>
                        <button class="btn-merko-outline" style="padding:6px 12px; font-size:0.75rem; color:#ef4444; border-color:#ef4444;" onclick="deleteOrder('${o.id}')">
                            🗑️ Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ORDER DETAIL MODAL (MATCHING IMAGE 2 EXACTLY)
function openOrderDetailModal(orderId) {
    const o = state.orders.find(ord => ord.id === orderId);
    if (!o) return;

    const overlay = document.getElementById('orderDetailModalOverlay');
    const content = document.getElementById('orderDetailModalContent');

    const isDelivered = o.status === 'DELIVERED';
    const isPaid = o.paymentStatus === 'PAID';

    // Steps 1 to 5 mapping
    const steps = [
        { key: 'RECEIVED', num: '1', label: '1. Pagado', icon: '💳' },
        { key: 'PREPARING', num: '2', label: '2. En prep.', icon: '📦' },
        { key: 'READY', num: '3', label: '3. Listo envío', icon: '🏬' },
        { key: 'ON_WAY', num: '4', label: '4. En camino', icon: '🚚' },
        { key: 'DELIVERED', num: '5', label: '5. Entregado', icon: '✓' }
    ];

    const currentStepIndex = steps.findIndex(s => s.key === o.status);

    content.innerHTML = `
        <!-- Modal Header -->
        <div class="order-detail-header">
            <div>
                <div class="order-code-title">
                    <span>${o.orderNumber}</span>
                    <span class="status-tag-pill ${isDelivered ? 'delivered' : 'preparing'}" style="font-size:0.75rem;">
                        ${o.status === 'DELIVERED' ? 'Entregado' : 'En proceso'}
                    </span>
                </div>
                <div class="order-client-sub">
                    ${o.customerName} • ${o.cityNeighborhood || 'Cartagena - Barrio El Prado'}
                </div>
            </div>
            <button class="order-close-btn" onclick="closeOrderDetailModal()" title="Cerrar modal">✕</button>
        </div>

        <!-- Progreso del Pedido Stepper (Image 2) -->
        <div class="order-progreso-box">
            <div class="progreso-box-title">PROGRESO DEL PEDIDO</div>
            <div class="progreso-steps-grid">
                ${steps.map((s, idx) => {
                    const isDone = idx <= currentStepIndex;
                    const isActive = idx === currentStepIndex;
                    return `
                        <div class="progreso-step-pill ${isDone ? 'completed' : ''} ${isActive ? 'active' : ''}" onclick="setOrderStatus('${o.id}', '${s.key}')">
                            <span class="step-icon">${s.icon}</span>
                            <span>${s.label}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Fecha y Datos de Entrega Box -->
        <div class="order-info-card">
            <div class="info-grid-2col">
                <div>
                    <div class="info-label">Fecha de Registro</div>
                    <div class="info-val">${o.createdAt || '2026-09-12'}</div>
                </div>
                <div>
                    <div class="info-label">Teléfono / WhatsApp</div>
                    <div class="info-val">${o.customerPhone}</div>
                </div>
            </div>

            <div>
                <div class="info-label">Correo Electrónico</div>
                <div class="info-val">${o.customerEmail || 'yuriwayne15@gmail.com'}</div>
            </div>

            <div>
                <div class="info-label">Entrega</div>
                <div class="info-val" style="color:#f59e0b; font-size:0.86rem; margin-top:2px;">
                    🚚 Envío a domicilio: <span style="color:#ffffff;">${o.deliveryAddress}</span>
                </div>
            </div>
        </div>

        <!-- Productos Solicitados Section -->
        <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="font-size:0.75rem; font-weight:900; color:#d4d4d8; text-transform:uppercase;">PRODUCTOS SOLICITADOS</div>
            <div class="items-solicitados-list">
                ${o.items.map(it => `
                    <div class="order-item-detail-card">
                        <div class="item-thumb-name">
                            <img src="${it.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'}" class="item-thumb-img">
                            <div>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <strong style="color:#fff; font-size:0.9rem;">${it.name}</strong>
                                    <span class="card-type-badge ${it.type === 'MERCADO' ? 'mercado' : 'detal'}" style="position:static; font-size:0.6rem; padding:1px 6px;">
                                        ${it.type === 'MERCADO' ? 'MERCADO' : 'PRODUCTO'}
                                    </span>
                                </div>
                                <div style="font-size:0.75rem; color:#a1a1aa; margin-top:2px;">
                                    Cantidad: ${it.qty} • $ ${(it.unitPrice || 0).toLocaleString('es-CO')} c/u
                                </div>
                            </div>
                        </div>
                        <div style="font-weight:900; color:#10b981; font-size:0.95rem;">
                            $ ${(it.subtotal || 0).toLocaleString('es-CO')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Payment Details Summary Box -->
        <div class="payment-summary-box">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                <span style="color:#a1a1aa;">Método de Pago:</span>
                <strong style="color:#fff;">${o.paymentMethod || 'Pasarela Wompi Bancolombia'}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; border-top:1px solid #27272a; padding-top:8px;">
                <span style="color:#a1a1aa;">Estado del Pago:</span>
                <span class="status-tag-pill ${isPaid ? 'delivered' : 'preparing'}">
                    ${o.paymentStatusLabel || 'APROBADO & COBRADO'}
                </span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:1.05rem; font-weight:900; border-top:1px dashed #27272a; padding-top:10px; margin-top:4px;">
                <span>Total Pagado:</span>
                <span style="color:#f59e0b; font-size:1.25rem;">$ ${o.total.toLocaleString('es-CO')}</span>
            </div>
        </div>

        <!-- Bottom Action Button: WhatsApp -->
        <div style="display:flex; justify-content:flex-end;">
            <button class="btn-whatsapp-modal" onclick="contactCustomerWhatsApp('${o.customerPhone}', '${o.orderNumber}')">
                <span>💬 WhatsApp</span>
            </button>
        </div>
    `;

    overlay.classList.add('active');
}

function closeOrderDetailModal() {
    document.getElementById('orderDetailModalOverlay').classList.remove('active');
}

async function setOrderStatus(orderId, newStatus) {
    const o = state.orders.find(ord => ord.id === orderId);
    if (!o) return;

    try {
        const response = await API.patch(`/api/v1/admin/orders/${orderId}/status`, { status: newStatus });
        if (response && response.data) {
            o.status = response.data.orderStatus || newStatus;
            o.paymentStatus = response.data.paymentStatus || o.paymentStatus;
        } else {
            o.status = newStatus;
        }

        const statusLabels = { RECEIVED: '1. Pagado/Recibido', PREPARING: '2. En Preparación', READY: '3. Listo Envío', ON_WAY: '4. En Camino', DELIVERED: '5. Entregado', CANCELLED: 'Cancelado' };

        renderHistorialUnificadoTable();
        openOrderDetailModal(orderId);
        showToast(`📦 Estado de pedido ${o.orderNumber} cambiado a: ${statusLabels[newStatus] || newStatus}`, 'success', '📦');
    } catch (e) {
        showToast(`❌ Error al actualizar estado del pedido: ${e.message}`, 'error', '❌');
    }
}

function contactCustomerWhatsApp(phone, orderCode) {
    const num = phone ? phone.replace(/[^0-9]/g, '') : '573001234567';
    const msg = `¡Hola! Te contactamos de Merkostore sobre tu pedido *${orderCode}*.`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

function deleteOrder(orderId) {
    const o = state.orders.find(ord => ord.id === orderId);
    if (confirm('¿Deseas eliminar permanentemente este registro del historial?')) {
        state.orders = state.orders.filter(ord => ord.id !== orderId);
        renderHistorialUnificadoTable();
        showToast(`🗑️ Pedido ${o ? o.orderNumber : ''} eliminado del historial`, 'warning', '🗑️');
    }
}

async function saveStoreConfig() {
    state.storeConfig.storeName = document.getElementById('cfgStoreName').value;
    state.storeConfig.whatsappPhone = document.getElementById('cfgWhatsappPhone').value;
    state.storeConfig.deliveryFee = parseFloat(document.getElementById('cfgDeliveryFee').value);
    state.storeConfig.minimumOrder = parseFloat(document.getElementById('cfgMinOrder').value);
    state.storeConfig.address = document.getElementById('cfgAddress').value;

    try {
        await API.put('/api/v1/admin/store-config', {
            storeId: 'default-store',
            storeName: state.storeConfig.storeName,
            whatsappPhone: state.storeConfig.whatsappPhone,
            deliveryFee: state.storeConfig.deliveryFee,
            minimumOrder: state.storeConfig.minimumOrder,
            address: state.storeConfig.address,
            isStoreOpen: true
        });
        syncStoreConfigUI();
        showToast('⚙️ ¡Configuración del negocio guardada exitosamente en el servidor!', 'success', '⚙️');
    } catch (e) {
        showToast(`❌ Error al guardar configuración: ${e.message}`, 'error', '❌');
    }
}

function openStoreWhatsApp() {
    const num = state.storeConfig.whatsappPhone || '573001234567';
    const msg = '¡Hola! Deseo realizar una consulta o hacer un pedido en Merkostore.';
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

function syncStoreConfigUI() {
    const storeNameEl = document.getElementById('navStoreName');
    if (storeNameEl) storeNameEl.textContent = state.storeConfig.storeName;

    const topBarPhoneEl = document.getElementById('topBarPhone');
    if (topBarPhoneEl) topBarPhoneEl.textContent = `📲 WhatsApp Tienda: ${state.storeConfig.whatsappPhone}`;

    const footerWaEl = document.getElementById('footerWhatsappLink');
    if (footerWaEl) {
        footerWaEl.href = `https://wa.me/${state.storeConfig.whatsappPhone}`;
        footerWaEl.textContent = `💬 +${state.storeConfig.whatsappPhone}`;
    }

    const feeEl = document.getElementById('lblDeliveryFee');
    if (feeEl) feeEl.textContent = `$ ${state.storeConfig.deliveryFee.toLocaleString('es-CO')} COP`;
}

// ==========================================
// ASYNC BACKEND DATA LOADING
// ==========================================
async function loadPublicBackendData() {
    try {
        const catRes = await API.get('/api/v1/public/categories');
        if (catRes && catRes.data && Array.isArray(catRes.data) && catRes.data.length > 0) {
            const fetchedCats = catRes.data.map(c => ({
                id: c.id,
                name: c.name,
                icon: c.icon || '📦',
                bgColor: '#f1f5f9'
            }));
            state.categories = [
                { id: 'ALL', name: '✨ Todos los Productos', icon: '🛒', bgColor: '#fee2e2' },
                ...fetchedCats
            ];
            renderCategoryBadges();
        }

        const prodRes = await API.get('/api/v1/public/products');
        if (prodRes && prodRes.data && Array.isArray(prodRes.data) && prodRes.data.length > 0) {
            state.products = prodRes.data.map(p => ({
                id: p.id,
                type: 'DETAL',
                categoryId: p.categoryId || 'cat1',
                sku: p.sku || 'SKU-001',
                name: p.name,
                unitCalc: p.unit ? `Unidad por ${p.unit}` : 'Unidad',
                costPrice: p.costPrice || 0,
                price: p.price || 0,
                discountPrice: p.discountPrice || null,
                discountPercent: p.discountPrice && p.price ? `-${Math.round((1 - p.discountPrice / p.price) * 100)}%` : null,
                stock: p.stock !== undefined ? p.stock : 10,
                imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
                isAvailable: p.isAvailable !== false
            }));
            renderProducts();
            renderAdminProductsTable();
        }

        const cfgRes = await API.get('/api/v1/admin/store-config').catch(() => null);
        if (cfgRes && cfgRes.data) {
            state.storeConfig = {
                storeName: cfgRes.data.storeName || 'Don Pedro - Tienda de Barrio',
                whatsappPhone: cfgRes.data.whatsappPhone || '573001234567',
                address: cfgRes.data.address || 'Calle 45 # 23 - 10 Barrio El Prado',
                fulfillmentType: 'DELIVERY',
                deliveryFee: cfgRes.data.deliveryFee || 3000,
                minimumOrder: cfgRes.data.minimumOrder || 10000,
                isStoreOpen: cfgRes.data.isStoreOpen !== false
            };
            syncStoreConfigUI();
        }
    } catch (e) {
        console.log('Utilizando estado local por defecto:', e);
    }
}

async function loadAdminBackendData() {
    try {
        const metricsRes = await API.get('/api/v1/admin/dashboard/metrics');
        if (metricsRes && metricsRes.data && metricsRes.data.recentOrders) {
            state.orders = metricsRes.data.recentOrders.map(o => ({
                id: o.id,
                orderNumber: o.orderNumber || 'MS-0000',
                customerName: o.customer ? o.customer.name : 'Cliente',
                customerPhone: o.customer ? o.customer.phone : '',
                deliveryAddress: o.customer ? o.customer.deliveryAddress : '',
                fulfillmentType: o.fulfillmentType || 'DELIVERY',
                items: o.items || [],
                subtotal: o.subtotal || 0,
                deliveryFee: o.deliveryFee || 0,
                total: o.total || 0,
                paymentMethod: o.paymentMethod || 'WHATSAPP',
                paymentStatus: o.paymentStatus || 'PENDING',
                status: o.orderStatus || 'RECEIVED',
                createdAt: o.createdAt ? o.createdAt.toString().slice(0, 16).replace('T', ' ') : ''
            }));
            renderHistorialUnificadoTable();
        }

        const ordersRes = await API.get('/api/v1/admin/orders').catch(() => null);
        if (ordersRes && ordersRes.data && Array.isArray(ordersRes.data)) {
            state.orders = ordersRes.data.map(o => ({
                id: o.id,
                orderNumber: o.orderNumber || 'MS-0000',
                customerName: o.customer ? o.customer.name : 'Cliente',
                customerPhone: o.customer ? o.customer.phone : '',
                deliveryAddress: o.customer ? o.customer.deliveryAddress : '',
                fulfillmentType: o.fulfillmentType || 'DELIVERY',
                items: o.items || [],
                subtotal: o.subtotal || 0,
                deliveryFee: o.deliveryFee || 0,
                total: o.total || 0,
                paymentMethod: o.paymentMethod || 'WHATSAPP',
                paymentStatus: o.paymentStatus || 'PENDING',
                status: o.orderStatus || 'RECEIVED',
                createdAt: o.createdAt ? o.createdAt.toString().slice(0, 16).replace('T', ' ') : ''
            }));
            renderHistorialUnificadoTable();
        }
    } catch (e) {
        console.log('Error al cargar datos administrativos del backend:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadPublicBackendData();
    const existingToken = API.getToken();
    if (existingToken) {
        state.isAdminLoggedIn = true;
        loadAdminBackendData();
    }
});

/* ==========================================================================
   MERKOBOT IA - LÓGICA DE CONTROLADOR Y CLIENTE FRONT-END
   ========================================================================== */

const chatState = {
    isOpen: false,
    conversationId: null,
    isProcessing: false
};

function toggleChatbotDrawer() {
    const container = document.getElementById('chatbotWidgetContainer');
    if (!container) return;

    chatState.isOpen = !chatState.isOpen;
    if (chatState.isOpen) {
        container.classList.add('open');
        setTimeout(() => {
            const input = document.getElementById('chatbotInput');
            if (input) input.focus();
        }, 150);
    } else {
        container.classList.remove('open');
    }
}

function handleChatKeyDown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendUserChatMessage();
    }
}

function sendChatChip(chipText) {
    const input = document.getElementById('chatbotInput');
    if (input) {
        input.value = chipText;
        sendUserChatMessage();
    }
}

async function sendUserChatMessage() {
    const input = document.getElementById('chatbotInput');
    if (!input || chatState.isProcessing) return;

    const rawMessage = input.value.trim();
    if (!rawMessage) return;

    // Limpiar input
    input.value = '';

    // Renderizar mensaje del usuario
    appendChatMessage('user', rawMessage);
    showChatTypingIndicator();
    chatState.isProcessing = true;

    try {
        let replyData = null;

        // Intentar llamada al backend Spring Boot
        try {
            const res = await API.request('/api/v1/public/chat', {
                method: 'POST',
                body: JSON.stringify({
                    message: rawMessage,
                    conversationId: chatState.conversationId,
                    storeId: 'default-store'
                })
            });

            if (res && res.data) {
                replyData = res.data;
            }
        } catch (apiErr) {
            console.warn('Backend chat no disponible, ejecutando fallback local inteligente:', apiErr);
            replyData = generateClientSideFallbackChat(rawMessage);
        }

        hideChatTypingIndicator();

        if (replyData) {
            if (replyData.conversationId) {
                chatState.conversationId = replyData.conversationId;
            }
            appendChatMessage('bot', replyData.reply, replyData.matchedProducts);

            if (replyData.suggestions && Array.isArray(replyData.suggestions)) {
                renderChatChips(replyData.suggestions);
            }
        }
    } catch (err) {
        hideChatTypingIndicator();
        appendChatMessage('bot', '⚠️ Disculpa, hubo un inconveniente al procesar tu solicitud. Por favor intenta de nuevo.');
    } finally {
        chatState.isProcessing = false;
    }
}

function appendChatMessage(role, text, matchedProducts = []) {
    const body = document.getElementById('chatbotMessagesBody');
    if (!body) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role === 'user' ? 'user-message' : 'bot-message'}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Formatear texto simple con negritas y saltos de línea
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

    let productsHtml = '';
    if (matchedProducts && matchedProducts.length > 0) {
        productsHtml = matchedProducts.map(p => `
            <div class="chat-product-card">
                <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}" class="chat-product-img" alt="${p.name}">
                <div class="chat-product-info">
                    <div class="chat-product-name">${p.name}</div>
                    <div class="chat-product-price">$ ${(p.discountPrice || p.price || 0).toLocaleString('es-CO')} COP</div>
                </div>
                <button class="chat-product-btn" onclick="addChatProductToCart('${p.id}')">🛒 Agregar</button>
            </div>
        `).join('');
    }

    msgDiv.innerHTML = `
        <div class="chat-bubble">
            ${formattedText}
            ${productsHtml}
        </div>
        <span class="chat-time">${timeStr}</span>
    `;

    body.appendChild(msgDiv);
    body.scrollTop = body.scrollHeight;
}

function showChatTypingIndicator() {
    const body = document.getElementById('chatbotMessagesBody');
    if (!body || document.getElementById('chatTypingIndicator')) return;

    const typingDiv = document.createElement('div');
    typingDiv.id = 'chatTypingIndicator';
    typingDiv.className = 'chat-message bot-message';
    typingDiv.innerHTML = `
        <div class="chat-typing-bubble">
            <span class="chat-dot"></span>
            <span class="chat-dot"></span>
            <span class="chat-dot"></span>
        </div>
    `;
    body.appendChild(typingDiv);
    body.scrollTop = body.scrollHeight;
}

function hideChatTypingIndicator() {
    const typing = document.getElementById('chatTypingIndicator');
    if (typing) typing.remove();
}

function renderChatChips(suggestions) {
    const container = document.getElementById('chatbotChipsContainer');
    if (!container || !suggestions) return;

    container.innerHTML = suggestions.map(s => `
        <button class="chat-chip" onclick="sendChatChip('${s.replace(/'/g, "\\'")}')">${s}</button>
    `).join('');
}

function clearChatHistory() {
    const body = document.getElementById('chatbotMessagesBody');
    if (!body) return;
    chatState.conversationId = null;
    body.innerHTML = `
        <div class="chat-message bot-message">
            <div class="chat-bubble">
                👋 Conversación reiniciada. ¡Hola de nuevo! Soy <strong>MerkoBot</strong>. ¿En qué te puedo asesorar?
            </div>
            <span class="chat-time">Justo ahora</span>
        </div>
    `;
    renderChatChips([
        '🔥 ¿Qué ofertas y promociones hay hoy?',
        '🥛 ¿Tienen leche y huevos disponibles?',
        '🛵 ¿Cuánto cuesta el domicilio y cuánto tarda?',
        '💳 ¿Cuáles son los métodos de pago?'
    ]);
}

function addChatProductToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (product) {
        addToCart(productId);
        showToast(`✅ "${product.name}" agregado al carrito desde MerkoBot`, 'success', '🤖');
    }
}

/**
 * Fallback cliente si el backend está en modo offline temporal
 */
function generateClientSideFallbackChat(query) {
    const q = query.toLowerCase();
    const products = state.products || [];

    if (q.includes('domicilio') || q.includes('envio') || q.includes('envío')) {
        return {
            reply: "🛵 **Domicilios Merkostore:**\n\n• **Tarifa:** $3.000 COP en el barrio.\n• **Tiempo:** 15 a 25 minutos.\n• **Envío GRATIS** en compras superiores a $30.000 COP.",
            suggestions: ["💳 Métodos de pago", "🔥 Promociones de hoy", "🛒 Ver carrito"]
        };
    }

    if (q.includes('pago') || q.includes('nequi') || q.includes('daviplata')) {
        return {
            reply: "💳 **Métodos de Pago:**\n\n1. **Nequi o Daviplata** directo.\n2. **Efectivo contra-entrega** al recibir tu pedido.\n3. **WhatsApp** acordado con el tendero.",
            suggestions: ["🛵 Costo de envío", "🔥 Promociones de hoy", "🥛 Precios de leche"]
        };
    }

    if (q.includes('oferta') || q.includes('promocion') || q.includes('promoción') || q.includes('descuento')) {
        const promoList = products.filter(p => p.discountPrice && p.discountPrice > 0).slice(0, 3);
        return {
            reply: "🔥 **¡Promociones destacadas de hoy!** Encuentra grandes descuentos en víveres y bebidas.",
            matchedProducts: promoList,
            suggestions: ["🛵 ¿Cuánto vale el envío?", "💳 Métodos de pago", "🥚 ¿Tienen huevos?"]
        };
    }

    // Búsqueda por palabras
    const found = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        return q.split(' ').some(w => w.length > 2 && name.includes(w));
    }).slice(0, 3);

    if (found.length > 0) {
        return {
            reply: `✨ Encontré estos productos para ti en el inventario:`,
            matchedProducts: found,
            suggestions: ["🛵 Pedir a domicilio", "💳 ¿Cómo puedo pagar?", "🔥 Ver más ofertas"]
        };
    }

    return {
        reply: `👋 En **Merkostore** tenemos abarrotes, lácteos, bebidas y aseo. Puedes preguntarme por precios de productos, costo de envíos o promociones.`,
        suggestions: ["🔥 Ofertas de hoy", "🥛 Precios de lácteos", "🛵 Domicilios", "💳 Pagos"]
    };
}


