// Cart functionality
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('cart.html')) {
        loadCartItems();
    }
});

async function loadCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (!cartItemsContainer) return;
    
    try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Your cart is empty</h3>
                    <p>Add some products to get started!</p>
                    <a href="shop.html" class="btn btn-primary" style="margin-top: 1rem;">Shop Now</a>
                </div>
            `;
            cartSubtotal.textContent = 'R0.00';
            cartTotal.textContent = 'R0.00';
            checkoutBtn.disabled = true;
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
        
        // Filter out failed products
        const validProducts = products.filter(product => product !== null);
        
        // Update cart in localStorage to remove invalid items
        const validCart = validProducts.map(product => ({
            productId: product.productId,
            size: product.size,
            quantity: product.quantity,
            addedAt: product.addedAt
        }));
        localStorage.setItem('cart', JSON.stringify(validCart));
        
        // Render cart items
        cartItemsContainer.innerHTML = validProducts.map(product => createCartItemHTML(product)).join('');
        
        // Calculate totals
        const subtotal = validProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
        
        cartSubtotal.textContent = `R${subtotal.toFixed(2)}`;
        cartTotal.textContent = `R${subtotal.toFixed(2)}`;
        
        // Enable checkout button
        checkoutBtn.disabled = false;
        checkoutBtn.addEventListener('click', () => {
            window.location.href = 'checkout.html';
        });
        
    } catch (error) {
        console.error('Failed to load cart items:', error);
        cartItemsContainer.innerHTML = '<div class="message error">Failed to load cart items. Please try again.</div>';
    }
}

function createCartItemHTML(product) {
    return `
        <div class="cart-item" data-product-id="${product.productId}" data-size="${product.size}">
            <img src="${product.image_url}" alt="${product.name}" class="cart-item-image" onerror="this.src='/images/placeholder.jpg'">
            <div class="cart-item-details">
                <div class="cart-item-name">${product.name}</div>
                <div class="cart-item-size">Size: ${product.size}</div>
                <div class="cart-item-price">R${product.price}</div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${product.productId}, '${product.size}', -1)">-</button>
                    <span class="quantity-display">${product.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${product.productId}, '${product.size}', 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${product.productId}, '${product.size}')">Remove</button>
            </div>
        </div>
    `;
}

window.updateQuantity = function(productId, size, change) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    const itemIndex = cart.findIndex(item => item.productId === productId && item.size === size);
    
    if (itemIndex !== -1) {
        cart[itemIndex].quantity += change;
        
        // Remove item if quantity is 0 or less
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        loadCartItems(); // Reload cart display
    }
};

window.removeFromCart = function(productId, size) {
    if (confirm('Are you sure you want to remove this item from your cart?')) {
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        cart = cart.filter(item => !(item.productId === productId && item.size === size));
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        loadCartItems(); // Reload cart display
    }
};

// Export cart functions for use in checkout
window.getCartItems = function() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
};

window.clearCart = function() {
    localStorage.removeItem('cart');
    updateCartCount();
};

window.getCartTotal = async function() {
    const cart = getCartItems();
    
    if (cart.length === 0) return 0;
    
    try {
        const products = await Promise.all(
            cart.map(async (item) => {
                const product = await apiRequest(`/api/products/${item.productId}`);
                return { ...item, price: product.price };
            })
        );
        
        return products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    } catch (error) {
        console.error('Failed to calculate cart total:', error);
        return 0;
    }
};