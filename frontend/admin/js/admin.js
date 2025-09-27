// Admin Panel JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!checkAdminAuth()) {
        return;
    }
    
    // Initialize admin panel
    initializeAdminPanel();
    
    // Load initial data
    loadDashboardData();
});

// Authentication check
function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!token || !user || !user.is_admin) {
        alert('Admin access required. Please login as admin.');
        window.location.href = '../login.html';
        return false;
    }
    
    // Update admin username display
    const adminUsername = document.getElementById('admin-username');
    if (adminUsername) {
        adminUsername.textContent = user.username;
    }
    
    return true;
}

// Initialize admin panel
function initializeAdminPanel() {
    // Initialize navigation
    initializeNavigation();
    
    // Initialize modals
    initializeModals();
    
    // Initialize filters
    initializeFilters();
    
    console.log('Admin panel initialized successfully');
}

// Navigation handling
function initializeNavigation() {
    const menuLinks = document.querySelectorAll('.menu-link[data-section]');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
            
            // Update active menu item
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch(sectionName) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'products':
                loadProducts();
                break;
            case 'orders':
                loadOrders();
                break;
            case 'users':
                loadUsers();
                break;
        }
    }
}

// API helper with better error handling
async function adminApiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('No authentication token found');
    }
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        ...options
    };
    
    try {
        const baseUrl = window.location.hostname === 'localhost' ? 
            'http://localhost:3000' : 
            window.location.origin;
            
        const response = await fetch(`${baseUrl}${url}`, config);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading('dashboard');
        
        const stats = await adminApiRequest('/api/admin/stats');
        
        // Update statistics
        document.getElementById('total-sales').textContent = `R${stats.totalSales.toFixed(2)}`;
        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('low-stock-count').textContent = stats.lowStockProducts.length;
        document.getElementById('total-users').textContent = stats.totalUsers;
        
        // Load recent orders
        const recentOrdersList = document.getElementById('recent-orders-list');
        if (stats.recentOrders && stats.recentOrders.length > 0) {
            recentOrdersList.innerHTML = stats.recentOrders.map(order => `
                <div class="recent-order-item">
                    <div class="order-info">
                        <strong>Order #${order.id}</strong>
                        <span>${order.customer_name}</span>
                    </div>
                    <div class="order-amount">R${order.total_amount}</div>
                </div>
            `).join('');
        } else {
            recentOrdersList.innerHTML = '<p>No recent orders</p>';
        }
        
        // Load low stock products
        const lowStockList = document.getElementById('low-stock-list');
        if (stats.lowStockProducts && stats.lowStockProducts.length > 0) {
            lowStockList.innerHTML = stats.lowStockProducts.map(product => `
                <div class="low-stock-item ${product.stock_quantity < 5 ? 'critical' : ''}">
                    <span>${product.name}</span>
                    <span class="stock-count">${product.stock_quantity} left</span>
                </div>
            `).join('');
        } else {
            lowStockList.innerHTML = '<p>All products are well stocked</p>';
        }
        
        hideLoading('dashboard');
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        hideLoading('dashboard');
        showError('Failed to load dashboard data. Please try again.');
    }
}

// Load products
async function loadProducts() {
    try {
        showLoading('products');
        
        const products = await adminApiRequest('/api/admin/products');
        const tbody = document.getElementById('products-table-body');
        
        if (products && products.length > 0) {
            tbody.innerHTML = products.map(product => `
                <tr>
                    <td>
                        <img src="${product.image_url}" alt="${product.name}" class="product-image-small" onerror="this.src='/images/placeholder.jpg'">
                    </td>
                    <td>${product.name}</td>
                    <td>${product.category_name || 'N/A'}</td>
                    <td>R${product.price}</td>
                    <td>
                        <span class="${product.stock_quantity < 10 ? 'low-stock' : ''}">${product.stock_quantity}</span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-small btn-edit" onclick="editProduct(${product.id})">Edit</button>
                            <button class="btn btn-small btn-delete" onclick="deleteProduct(${product.id})">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No products found</td></tr>';
        }
        
        hideLoading('products');
        
    } catch (error) {
        console.error('Failed to load products:', error);
        hideLoading('products');
        showError('Failed to load products. Please try again.');
    }
}

// Load orders
async function loadOrders() {
    try {
        showLoading('orders');
        
        const orders = await adminApiRequest('/api/admin/orders');
        const tbody = document.getElementById('orders-table-body');
        
        if (orders && orders.length > 0) {
            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td>#${order.id}</td>
                    <td>${order.customer_name}</td>
                    <td>${order.customer_email}</td>
                    <td>R${order.total_amount}</td>
                    <td>
                        <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </td>
                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-small btn-view" onclick="viewOrderDetails(${order.id})">View</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
        }
        
        hideLoading('orders');
        
    } catch (error) {
        console.error('Failed to load orders:', error);
        hideLoading('orders');
        showError('Failed to load orders. Please try again.');
    }
}

// Load users
async function loadUsers() {
    try {
        showLoading('users');
        
        const users = await adminApiRequest('/api/admin/users');
        const tbody = document.getElementById('users-table-body');
        
        if (users && users.length > 0) {
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>${user.order_count || 0}</td>
                    <td>R${(user.total_spent || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn btn-small btn-view" onclick="viewUserDetails('${user.email}')">View Orders</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
        }
        
        hideLoading('users');
        
    } catch (error) {
        console.error('Failed to load users:', error);
        hideLoading('users');
        showError('Failed to load users. Please try again.');
    }
}

// Product management functions
window.showAddProductModal = function() {
    document.getElementById('product-modal-title').textContent = 'Add New Product';
    document.getElementById('product-submit-btn').textContent = 'Add Product';
    document.getElementById('add-product-form').reset();
    document.getElementById('edit-product-id').value = '';
    document.getElementById('addProductModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
};

window.closeAddProductModal = function() {
    document.getElementById('addProductModal').style.display = 'none';
    document.body.style.overflow = 'auto';
};

window.editProduct = async function(productId) {
    try {
        const product = await adminApiRequest(`/api/products/${productId}`);
        
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-submit-btn').textContent = 'Update Product';
        document.getElementById('edit-product-id').value = productId;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category_id;
        document.getElementById('product-stock').value = product.stock_quantity;
        document.getElementById('product-sizes').value = product.sizes || '';
        
        document.getElementById('addProductModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Failed to load product for editing:', error);
        showError('Failed to load product details.');
    }
};

window.deleteProduct = async function(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        await adminApiRequest(`/api/admin/products/${productId}`, {
            method: 'DELETE'
        });
        
        showSuccess('Product deleted successfully');
        loadProducts();
        
    } catch (error) {
        console.error('Failed to delete product:', error);
        showError('Failed to delete product.');
    }
};

// Order management functions
window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        await adminApiRequest(`/api/admin/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        showSuccess('Order status updated successfully');
        loadDashboardData(); // Refresh dashboard stats
        
    } catch (error) {
        console.error('Failed to update order status:', error);
        showError('Failed to update order status.');
    }
};

window.viewOrderDetails = async function(orderId) {
    try {
        const order = await adminApiRequest(`/api/admin/orders/${orderId}`);
        
        const modalContent = `
            <div class="order-details">
                <div class="order-info">
                    <div class="order-info-section">
                        <h4>Order Information</h4>
                        <p><strong>Order ID:</strong> #${order.id}</p>
                        <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></p>
                        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                        <p><strong>Total:</strong> R${order.total_amount}</p>
                        <p><strong>Payment Method:</strong> ${order.payment_method || 'N/A'}</p>
                    </div>
                    
                    <div class="order-info-section">
                        <h4>Customer Information</h4>
                        <p><strong>Name:</strong> ${order.customer_name}</p>
                        <p><strong>Email:</strong> ${order.customer_email}</p>
                        <p><strong>Address:</strong> ${order.customer_address}</p>
                    </div>
                </div>
                
                <div class="order-items">
                    <h4>Order Items</h4>
                    ${order.items ? order.items.map(item => `
                        <div class="order-item">
                            <div class="item-info">
                                <img src="${item.image_url}" alt="${item.name}" class="item-image" onerror="this.src='/images/placeholder.jpg'">
                                <div>
                                    <strong>${item.name}</strong><br>
                                    Size: ${item.size}<br>
                                    Quantity: ${item.quantity}
                                </div>
                            </div>
                            <div class="item-price">R${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                    `).join('') : '<p>No items found</p>'}
                </div>
            </div>
        `;
        
        document.getElementById('order-details-content').innerHTML = modalContent;
        document.getElementById('orderDetailsModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Failed to load order details:', error);
        showError('Failed to load order details.');
    }
};

window.closeOrderDetailsModal = function() {
    document.getElementById('orderDetailsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
};

// Form handling
function initializeModals() {
    // Product form submission
    const productForm = document.getElementById('add-product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmission);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="block"]');
            if (openModal) {
                openModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });
}

async function handleProductSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productId = formData.get('productId');
    const isEdit = productId && productId !== '';
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Updating...' : 'Adding...';
    
    try {
        const url = isEdit ? `/api/admin/products/${productId}` : '/api/admin/products';
        const method = isEdit ? 'PUT' : 'POST';
        
        await adminApiRequest(url, {
            method: method,
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        showSuccess(isEdit ? 'Product updated successfully' : 'Product added successfully');
        closeAddProductModal();
        loadProducts();
        
    } catch (error) {
        console.error('Failed to save product:', error);
        showError('Failed to save product. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Filter handling
function initializeFilters() {
    const statusFilter = document.getElementById('order-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filterOrders(e.target.value);
        });
    }
}

function filterOrders(status) {
    const rows = document.querySelectorAll('#orders-table-body tr');
    
    rows.forEach(row => {
        if (!status) {
            row.style.display = '';
        } else {
            const statusCell = row.querySelector('.status-select');
            if (statusCell && statusCell.value === status) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// Utility functions
function showLoading(section) {
    const container = document.querySelector(`#${section} .admin-section, #${section}`);
    if (container) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = '<div class="spinner"></div>';
        container.style.position = 'relative';
        container.appendChild(loadingDiv);
    }
}

function hideLoading(section) {
    const container = document.querySelector(`#${section} .admin-section, #${section}`);
    if (container) {
        const loadingDiv = container.querySelector('.loading-overlay');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
}

function showSuccess(message) {
    showMessage(message, 'success');
}

function showError(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessage = document.querySelector('.admin-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `admin-message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at top of main content
    const mainContent = document.querySelector('.admin-main');
    if (mainContent) {
        mainContent.insertBefore(messageDiv, mainContent.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Logout function
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../login.html';
    }
};

// User details function
window.viewUserDetails = function(email) {
    alert(`User details for ${email} - Feature coming soon!`);
};