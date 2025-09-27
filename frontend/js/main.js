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
        const baseUrl = window.location.hostname === 'localhost' ? 
            'http://localhost:3000' : 
            window.location.origin;
            
        const response = await fetch(`${baseUrl}${url}`, config);
        
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
                            <button class="btn btn-primary" onclick="orderViaWhatsApp(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price})" style="flex: 1;">Order via WhatsApp</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modal-body').innerHTML = modalContent;
        document.getElementById('productModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
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

// Enhanced WhatsApp order function
window.orderViaWhatsApp = async function(productId, productName, productPrice) {
    try {
        // Get product details if not provided
        if (!productName || !productPrice) {
            const product = await apiRequest(`/api/products/${productId}`);
            productName = product.name;
            productPrice = product.price;
        }
        
        // Get selected size
        const sizeSelect = document.getElementById(`size-${productId}`) || 
                          document.getElementById(`modal-size-${productId}`);
        const selectedSize = sizeSelect ? sizeSelect.value : 'One Size';
        
        // Create comprehensive WhatsApp message
        const message = createWhatsAppOrderMessage(productName, productPrice, selectedSize);
        
        // Open WhatsApp with the message
        const whatsappUrl = `https://wa.me/+27793757047?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Show confirmation to user
        showWhatsAppOrderConfirmation(productName);
        
    } catch (error) {
        console.error('Error creating WhatsApp order:', error);
        alert('Unable to create WhatsApp order. Please try again.');
    }
};

// Create detailed WhatsApp message
function createWhatsAppOrderMessage(productName, productPrice, selectedSize) {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    return `🛍️ *NEW ORDER REQUEST*

📅 Date: ${currentDate}
⏰ Time: ${currentTime}

👕 *PRODUCT DETAILS:*
• Product: ${productName}
• Size: ${selectedSize}
• Price: R${productPrice}

👤 *CUSTOMER INFORMATION:*
Please provide the following details:
• Full Name: 
• Phone Number: 
• Email Address: 
• Delivery Address: 

💳 *PAYMENT METHOD:*
Please specify your preferred payment method:
• Bank Transfer
• Cash on Delivery
• EFT

📦 *DELIVERY OPTIONS:*
• Standard Delivery (3-7 days): FREE
• Express Delivery (1-2 days): R50
• Collection from Store: FREE

📍 *STORE LOCATION:*
R Colly(RC) Fashion Clothes Store
Plaza Taxi rank St, Thohoyandou, 0950

✅ Please confirm your order by providing all the required information above.

Thank you for choosing R Colly(RC) Fashion! 🙏`;
}

// Show WhatsApp order confirmation
function showWhatsAppOrderConfirmation(productName) {
    const confirmationHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); 
                    z-index: 10000; max-width: 400px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
            <h3 style="color: var(--success-color); margin-bottom: 1rem;">WhatsApp Order Initiated!</h3>
            <p style="margin-bottom: 1.5rem; line-height: 1.6;">
                Your order for <strong>${productName}</strong> has been prepared for WhatsApp. 
                Please complete your order details in the WhatsApp chat.
            </p>
            <div style="background: #e8f5e8; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <p style="margin: 0; font-size: 0.9rem; color: #155724;">
                    💬 A WhatsApp chat has opened with your order details.<br>
                    📝 Please fill in your information to complete the order.<br>
                    📞 Our team will confirm your order within 30 minutes.
                </p>
            </div>
            <button onclick="this.parentElement.remove()" 
                    style="background: var(--primary-color); color: var(--dark-color); 
                           border: none; padding: 0.8rem 2rem; border-radius: 25px; 
                           font-weight: bold; cursor: pointer;">
                Got it!
            </button>
        </div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.5); z-index: 9999;" 
             onclick="this.nextElementSibling.remove(); this.remove();"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', confirmationHTML);
}

// Enhanced cart WhatsApp order function
window.orderCartViaWhatsApp = async function() {
    try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (cart.length === 0) {
            alert('Your cart is empty. Add some products first!');
            return;
        }
        
        // Load product details for cart items
        const products = await Promise.all(
            cart.map(async (item) => {
                try {
                    const product = await apiRequest(`/api/products/${item.productId}`);
                    return { ...item, ...product };
                } catch (error) {
                    console.error(`Failed to load product ${item.productId}:`, error);
                    return null;
                }
            })
        );
        
        const validProducts = products.filter(product => product !== null);
        const total = validProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
        
        // Create cart WhatsApp message
        const message = createCartWhatsAppMessage(validProducts, total);
        
        // Open WhatsApp
        const whatsappUrl = `https://wa.me/+27793757047?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Show confirmation
        showCartWhatsAppConfirmation(validProducts.length, total);
        
    } catch (error) {
        console.error('Error creating cart WhatsApp order:', error);
        alert('Unable to create WhatsApp order. Please try again.');
    }
};

// Create cart WhatsApp message
function createCartWhatsAppMessage(products, total) {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    let itemsList = '';
    products.forEach((product, index) => {
        itemsList += `${index + 1}. ${product.name}
   • Size: ${product.size}
   • Quantity: ${product.quantity}
   • Price: R${product.price} each
   • Subtotal: R${(product.price * product.quantity).toFixed(2)}

`;
    });
    
    return `🛒 *CART ORDER REQUEST*

📅 Date: ${currentDate}
⏰ Time: ${currentTime}

🛍️ *ORDER ITEMS (${products.length} items):*
${itemsList}
💰 *TOTAL AMOUNT: R${total.toFixed(2)}*

👤 *CUSTOMER INFORMATION:*
Please provide the following details:
• Full Name: 
• Phone Number: 
• Email Address: 
• Delivery Address: 

💳 *PAYMENT METHOD:*
Please specify your preferred payment method:
• Bank Transfer
• Cash on Delivery
• EFT

📦 *DELIVERY OPTIONS:*
• Standard Delivery (3-7 days): FREE
• Express Delivery (1-2 days): R50
• Collection from Store: FREE

📍 *STORE LOCATION:*
R Colly(RC) Fashion Clothes Store
Plaza Taxi rank St, Thohoyandou, 0950

✅ Please confirm your order by providing all the required information above.

Thank you for choosing R Colly(RC) Fashion! 🙏`;
}

// Show cart WhatsApp confirmation
function showCartWhatsAppConfirmation(itemCount, total) {
    const confirmationHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); 
                    z-index: 10000; max-width: 400px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🛒</div>
            <h3 style="color: var(--success-color); margin-bottom: 1rem;">Cart Order Sent!</h3>
            <p style="margin-bottom: 1.5rem; line-height: 1.6;">
                Your cart with <strong>${itemCount} items</strong> (Total: <strong>R${total.toFixed(2)}</strong>) 
                has been sent via WhatsApp.
            </p>
            <div style="background: #e8f5e8; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <p style="margin: 0; font-size: 0.9rem; color: #155724;">
                    💬 WhatsApp opened with your complete order details<br>
                    📝 Fill in your information to complete the order<br>
                    📞 We'll confirm your order within 30 minutes<br>
                    🚚 Delivery options and payment methods included
                </p>
            </div>
            <button onclick="this.parentElement.remove(); document.querySelector('.whatsapp-overlay').remove();" 
                    style="background: var(--primary-color); color: var(--dark-color); 
                           border: none; padding: 0.8rem 2rem; border-radius: 25px; 
                           font-weight: bold; cursor: pointer;">
                Perfect!
            </button>
        </div>
        <div class="whatsapp-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.5); z-index: 9999;" 
             onclick="this.previousElementSibling.remove(); this.remove();"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', confirmationHTML);
}
window.updateCartCount = function() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    document.querySelectorAll('#cart-count').forEach(element => {
        element.textContent = totalItems;
    });
};