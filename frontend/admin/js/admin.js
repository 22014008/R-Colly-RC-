// Admin panel functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check admin authentication
    checkAdminAuth();
    
    // Initialize admin panel
    initializeAdminPanel();
    
    // Load dashboard data
    loadDashboardStats();
});

function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!token || !user || !user.is_admin) {
        alert('Admin access required. Please login as admin.');
        window.location.href = '../login.html';
        return;
    }
    
    // Update admin username display
    document.getElementById('admin-username').textContent = user.username;
}

function initializeAdminPanel() {
    // Initialize section navigation
    const menuLinks = document.querySelectorAll('.menu-link');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.dataset.section) {
                e.preventDefault();
                showSection(link.dataset.section);
                
                // Update active menu item
                menuLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
    
    // Initialize forms
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleProductSubmit);
    }
    
    // Initialize order status filter
    const orderStatusFilter = document.getElementById('order-status-filter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', loadOrders);
    }
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Load section-specific data
    switch (sectionName) {
        case 'dashboard':
            loadDashboardStats();
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

async function loadDashboardStats() {
    try {
        const stats = await apiRequest('/api/admin/stats');
        
        document.getElementById('total-sales').textContent = `R${stats.totalSales.toFixed(2)}`;
        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('low-stock-count').textContent = stats.lowStockProducts.length;
        
        // Update total users if element exists
        const totalUsersElement = document.getElementById('total-users');
        if (totalUsersElement) {
            totalUsersElement.textContent = stats.totalUsers;
        }
        
        // Display low stock products
        const lowStockList = document.getElementById('low-stock-list');
        if (stats.lowStockProducts.length === 0) {
            lowStockList.innerHTML = '<p style="color: var(--success-color); font-weight: bold;">✅ All products are well stocked!</p>';
        } else {
            lowStockList.innerHTML = stats.lowStockProducts.map(product => `
                <div class="low-stock-item ${product.stock_quantity < 5 ? 'critical' : ''}">
                    <span><strong>${product.name}</strong></span>
                    <span class="stock-count">${product.stock_quantity} remaining</span>
                </div>
            `).join('');
        }
        
        // Display recent orders if element exists
        const recentOrdersList = document.getElementById('recent-orders-list');
        if (recentOrdersList && stats.recentOrders) {
            if (stats.recentOrders.length === 0) {
                recentOrdersList.innerHTML = '<p style="color: var(--gray-color);">No recent orders</p>';
            } else {
                recentOrdersList.innerHTML = stats.recentOrders.map(order => `
                    <div class="recent-order-item">
                        <div>
                            <strong>Order #${order.id}</strong>
                            <span>${order.customer_name}</span>
                        </div>
                        <div>
                            <span class="order-amount">R${order.total_amount}</span>
                            <span class="order-date">${new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        showMessage('Failed to load dashboard statistics.', 'error');
    }
}

async function loadProducts() {
    const tableBody = document.getElementById('products-table-body');
    
    try {
        tableBody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div></td></tr>';
        
        const products = await apiRequest('/api/admin/products');
        
        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="admin-empty-state">No products found. <a href="#" onclick="showAddProductModal()">Add your first product</a></td></tr>';
            return;
        }
        
        tableBody.innerHTML = products.map(product => `
            <tr>
                <td>
                    <img src="${product.image_url}" alt="${product.name}" class="product-image-small" onerror="this.src='../images/placeholder.jpg'">
                </td>
                <td><strong>${product.name}</strong></td>
                <td>${product.category_name || 'Uncategorized'}</td>
                <td>R${product.price}</td>
                <td>
                    <span class="${product.stock_quantity < 10 ? 'text-warning' : ''}">
                        ${product.stock_quantity}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-small btn-edit" onclick="editProduct(${product.id})">Edit</button>
                        <button class="btn btn-small btn-delete" onclick="deleteProduct(${product.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load products:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="admin-message error">Failed to load products. Please try again.</td></tr>';
    }
}

async function loadOrders() {
    const tableBody = document.getElementById('orders-table-body');
    const statusFilter = document.getElementById('order-status-filter').value;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div></td></tr>';
        
        const orders = await apiRequest('/api/admin/orders');
        
        // Filter orders by status if filter is applied
        const filteredOrders = statusFilter ? 
            orders.filter(order => order.status === statusFilter) : 
            orders;
        
        if (filteredOrders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="admin-empty-state">No orders found.</td></tr>';
            return;
        }
        
        tableBody.innerHTML = filteredOrders.map(order => `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${order.customer_name}</td>
                <td>${order.customer_email}</td>
                <td><strong>R${parseFloat(order.total_amount).toFixed(2)}</strong></td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-small btn-view" onclick="viewOrderDetails(${order.id})">View</button>
                        <select onchange="updateOrderStatus(${order.id}, this.value)" class="btn-small">
                            <option value="">Update Status</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load orders:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="admin-message error">Failed to load orders. Please try again.</td></tr>';
    }
}

// Product Management Functions
function showAddProductModal() {
    const modal = document.getElementById('addProductModal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('add-product-form');
    const submitBtn = document.getElementById('product-submit-btn');
    
    // Reset form and modal for adding
    form.reset();
    document.getElementById('edit-product-id').value = '';
    title.textContent = 'Add New Product';
    submitBtn.textContent = 'Add Product';
    
    modal.style.display = 'block';
}

function closeAddProductModal() {
    document.getElementById('addProductModal').style.display = 'none';
}

async function editProduct(productId) {
    try {
        const product = await apiRequest(`/api/products/${productId}`);
        
        // Fill form with product data
        document.getElementById('edit-product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category_id;
        document.getElementById('product-stock').value = product.stock_quantity;
        document.getElementById('product-sizes').value = product.sizes || '';
        
        // Update modal title and button
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-submit-btn').textContent = 'Update Product';
        
        // Show modal
        document.getElementById('addProductModal').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load product for editing:', error);
        alert('Failed to load product details.');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }
    
    try {
        await apiRequest(`/api/admin/products/${productId}`, {
            method: 'DELETE'
        });
        
        showMessage('Product deleted successfully!', 'success');
        loadProducts(); // Reload products table
        
    } catch (error) {
        console.error('Failed to delete product:', error);
        showMessage('Failed to delete product.', 'error');
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productId = formData.get('productId');
    const isEdit = !!productId;
    
    const submitBtn = document.getElementById('product-submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Updating...' : 'Adding...';
    
    try {
        const url = isEdit ? `/api/admin/products/${productId}` : '/api/admin/products';
        const method = isEdit ? 'PUT' : 'POST';
        
        await fetch(`http://localhost:3000${url}`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        closeAddProductModal();
        showMessage(`Product ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
        loadProducts(); // Reload products table
        
    } catch (error) {
        console.error('Failed to save product:', error);
        showMessage(`Failed to ${isEdit ? 'update' : 'add'} product.`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Order Management Functions
async function viewOrderDetails(orderId) {
    try {
        const modal = document.getElementById('orderDetailsModal');
        const content = document.getElementById('order-details-content');
        
        content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        modal.style.display = 'block';
        
        // Load actual order details
        const orderDetails = await apiRequest(`/api/admin/orders/${orderId}`);
        
        content.innerHTML = `
            <div class="order-details">
                <div class="order-info">
                    <div class="order-info-section">
                        <h4>Customer Information</h4>
                        <p><strong>Name:</strong> ${orderDetails.customer_name}</p>
                        <p><strong>Email:</strong> ${orderDetails.customer_email}</p>
                        <p><strong>Address:</strong></p>
                        <p style="white-space: pre-line; margin-left: 1rem;">${orderDetails.customer_address}</p>
                    </div>
                    
                    <div class="order-info-section">
                        <h4>Order Information</h4>
                        <p><strong>Order ID:</strong> #${orderDetails.id}</p>
                        <p><strong>Status:</strong> <span class="status-badge status-${orderDetails.status}">${orderDetails.status}</span></p>
                        <p><strong>Order Date:</strong> ${new Date(orderDetails.created_at).toLocaleString()}</p>
                        <p><strong>Total Amount:</strong> <strong>R${parseFloat(orderDetails.total_amount).toFixed(2)}</strong></p>
                    </div>
                </div>
                
                <div class="order-items">
                    <h4>Order Items</h4>
                    ${orderDetails.items.map(item => `
                        <div class="order-item">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">` : ''}
                                <div>
                                    <strong>${item.name || 'Product'}</strong>
                                    <div style="color: var(--gray-color); font-size: 0.9rem;">Size: ${item.size} | Qty: ${item.quantity}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div>R${parseFloat(item.price).toFixed(2)} each</div>
                                <div><strong>R${(parseFloat(item.price) * item.quantity).toFixed(2)}</strong></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="status-update">
                    <h4>Update Order Status</h4>
                    <select id="order-status-update-${orderId}" class="btn-small">
                        <option value="pending" ${orderDetails.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${orderDetails.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="shipped" ${orderDetails.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${orderDetails.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                    <button class="btn btn-primary" onclick="updateOrderStatusFromModal(${orderId})">Update Status</button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Failed to load order details:', error);
        content.innerHTML = '<div class="admin-message error">Failed to load order details. Please try again.</div>';
    }
}

function closeOrderDetailsModal() {
    document.getElementById('orderDetailsModal').style.display = 'none';
}

// Update order status from modal
window.updateOrderStatusFromModal = async function(orderId) {
    const statusSelect = document.getElementById(`order-status-update-${orderId}`);
    const newStatus = statusSelect.value;
    
    if (!newStatus) return;
    
    try {
        await apiRequest(`/api/admin/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        showMessage('Order status updated successfully!', 'success');
        closeOrderDetailsModal();
        loadOrders(); // Reload orders table
        loadDashboardStats(); // Refresh dashboard stats
        
    } catch (error) {
        console.error('Failed to update order status:', error);
        showMessage('Failed to update order status.', 'error');
    }
};

async function updateOrderStatus(orderId, newStatus) {
    if (!newStatus) return;
    
    try {
        await apiRequest(`/api/admin/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        showMessage('Order status updated successfully!', 'success');
        loadOrders(); // Reload orders table
        loadDashboardStats(); // Refresh dashboard stats
        
    } catch (error) {
        console.error('Failed to update order status:', error);
        showMessage('Failed to update order status.', 'error');
    }
}

async function loadUsers() {
    const tableBody = document.getElementById('users-table-body');
    
    try {
        tableBody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div></td></tr>';
        
        const users = await apiRequest('/api/admin/users');
        
        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="admin-empty-state">No registered users found.</td></tr>';
            return;
        }
        
        tableBody.innerHTML = users.map(user => `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>${user.email}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>${user.order_count || 0}</td>
                <td>R${parseFloat(user.total_spent || 0).toFixed(2)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-small btn-view" onclick="viewUserOrders('${user.email}')">View Orders</button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load users:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="admin-message error">Failed to load users. Please try again.</td></tr>';
    }
}

// View user orders
window.viewUserOrders = function(userEmail) {
    // Switch to orders section and filter by user email
    showSection('orders');
    document.querySelector('[data-section="orders"]').click();
    
    // You could implement a user-specific filter here
    showMessage(`Showing orders for ${userEmail}`, 'info');
};

// Utility Functions
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `admin-message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at top of main content
    const mainContent = document.querySelector('.admin-main');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Global logout function
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../login.html';
    }
};

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});