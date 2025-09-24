// Main JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation
    initializeNavigation();
    
    // Initialize authentication state
    updateAuthState();
    
    // Load featured products on homepage
    if (document.getElementById('featured-products')) {
        loadFeaturedProducts();
    }
    
    // Update cart count
    updateCartCount();
});

// Navigation functionality
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking on links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });
}

// Authentication state management
function updateAuthState() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const authLink = document.getElementById('auth-link');
    
    if (token && user && authLink) {
        authLink.textContent = `Hello, ${user.username}`;
        authLink.href = '#';
        authLink.addEventListener('click', (e) => {
            e.preventDefault();
            showUserMenu();
        });
    }
}

function showUserMenu() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    const menu = `
        <div style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #ddd; border-radius: 8px; padding: 1rem; box-shadow: 0 5px 15px rgba(0,0,0,0.1); z-index: 1001;">
            ${user.is_admin ? '<a href="admin/index.html" style="display: block; padding: 0.5rem 0; color: #333; text-decoration: none;">Admin Panel</a>' : ''}
            <a href="#" onclick="logout()" style="display: block; padding: 0.5rem 0; color: #333; text-decoration: none;">Logout</a>
        </div>
    `;
    
    // Remove existing menu
    const existingMenu = document.querySelector('.user-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Add new menu
    const authLink = document.getElementById('auth-link');
    authLink.style.position = 'relative';
    authLink.insertAdjacentHTML('afterend', `<div class="user-menu">${menu}</div>`);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!e.target.closest('.user-menu') && !e.target.closest('#auth-link')) {
                const menu = document.querySelector('.user-menu');
                if (menu) menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// API helper functions
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };
    
    try {
        const response = await fetch(`http://localhost:3000${url}`, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Load featured products for homepage
async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        const products = await apiRequest('/api/products');
        
        // Show first 8 products as featured
        const featuredProducts = products.slice(0, 8);
        
        if (featuredProducts.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No products available</h3></div>';
            return;
        }
        
        container.innerHTML = featuredProducts.map(product => createProductCard(product)).join('');
        
        // Add click handlers for product cards
        container.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('select')) {
                    const productId = card.dataset.productId;
                    showProductModal(productId);
                }
            });
        });
        
    } catch (error) {
        console.error('Failed to load featured products:', error);
        container.innerHTML = '<div class="message error">Failed to load products. Please try again later.</div>';
    }
}

// Create product card HTML
function createProductCard(product) {
    const sizes = product.sizes ? product.sizes.split(',') : [];
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                <img src="${product.image_url}" alt="${product.name}" onerror="this.src='/images/placeholder.jpg'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">R${product.price}</p>
                ${sizes.length > 0 ? `
                    <select class="size-select" id="size-${product.id}">
                        ${sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                    </select>
                ` : ''}
                <div class="product-actions">
                    <button class="btn btn-secondary" onclick="addToCart(${product.id})">Add to Cart</button>
                    <a href="https://wa.me/+27793757047?text=Hi%20I'm%20interested%20in%20${encodeURIComponent(product.name)}" target="_blank" class="btn btn-primary">Order via WhatsApp</a>
                </div>
            </div>
        </div>
    `;
}

// Show product modal
async function showProductModal(productId) {
    try {
        const product = await apiRequest(`/api/products/${productId}`);
        const sizes = product.sizes ? product.sizes.split(',') : [];
        
        const modalContent = `
            <div class="product-modal">
                <h2>${product.name}</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1rem;">
                    <div>
                        <img src="${product.image_url}" alt="${product.name}" style="width: 100%; border-radius: 10px;" onerror="this.src='/images/placeholder.jpg'">
                    </div>
                    <div>
                        <p style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 1rem;">R${product.price}</p>
                        <p style="margin-bottom: 1rem; line-height: 1.6;">${product.description || 'No description available.'}</p>
                        <p style="margin-bottom: 1rem;"><strong>Category:</strong> ${product.category_name}</p>
                        <p style="margin-bottom: 1rem;"><strong>Stock:</strong> ${product.stock_quantity} available</p>
                        
                        ${sizes.length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <label for="modal-size-${product.id}"><strong>Size:</strong></label>
                                <select id="modal-size-${product.id}" style="margin-left: 0.5rem; padding: 0.5rem; border-radius: 5px;">
                                    ${sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                                </select>
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                            <button class="btn btn-secondary" onclick="addToCart(${product.id}, true)" style="flex: 1;">Add to Cart</button>
                            <a href="https://wa.me/+27793757047?text=Hi%20I'm%20interested%20in%20${encodeURIComponent(product.name)}" target="_blank" class="btn btn-primary" style="flex: 1; text-align: center;">Order via WhatsApp</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modal-body').innerHTML = modalContent;
        document.getElementById('productModal').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load product details:', error);
        alert('Failed to load product details. Please try again.');
    }
}

// Close modal functionality
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close') || e.target.classList.contains('modal')) {
        document.getElementById('productModal').style.display = 'none';
    }
});

// Global functions for cart management
window.addToCart = function(productId, isModal = false) {
    const sizeSelect = isModal ? 
        document.getElementById(`modal-size-${productId}`) : 
        document.getElementById(`size-${productId}`);
    
    const selectedSize = sizeSelect ? sizeSelect.value : 'One Size';
    
    // Get existing cart
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(item => 
        item.productId === productId && item.size === selectedSize
    );
    
    if (existingItemIndex !== -1) {
        // Increase quantity
        cart[existingItemIndex].quantity += 1;
    } else {
        // Add new item
        cart.push({
            productId: productId,
            size: selectedSize,
            quantity: 1,
            addedAt: new Date().toISOString()
        });
    }
    
    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart count
    updateCartCount();
    
    // Show success message
    const productName = document.querySelector(`[data-product-id="${productId}"] .product-name`)?.textContent || 'Item';
    alert(`${productName} added to cart!`);
    
    // Close modal if open
    if (isModal) {
        document.getElementById('productModal').style.display = 'none';
    }
};

window.updateCartCount = function() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    document.querySelectorAll('#cart-count').forEach(element => {
        element.textContent = totalItems;
    });
};