// Checkout page functionality
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('checkout.html')) {
        initializeCheckoutPage();
    }
});

async function initializeCheckoutPage() {
    // Load checkout items
    await loadCheckoutItems();
    
    // Initialize checkout form
    initializeCheckoutForm();
    
    // Check if cart is empty
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        document.querySelector('.checkout-content').innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <h3>Your cart is empty</h3>
                <p>Add some products before checkout!</p>
                <a href="shop.html" class="btn btn-primary" style="margin-top: 1rem;">Shop Now</a>
            </div>
        `;
    }
}

async function loadCheckoutItems() {
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutSubtotal = document.getElementById('checkout-subtotal');
    const checkoutTotal = document.getElementById('checkout-total');
    
    if (!checkoutItems) return;
    
    try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (cart.length === 0) {
            checkoutItems.innerHTML = '<p>No items in cart</p>';
            checkoutSubtotal.textContent = 'R0.00';
            checkoutTotal.textContent = 'R0.00';
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
        
        // Display checkout items
        checkoutItems.innerHTML = validProducts.map(product => `
            <div class="checkout-item">
                <div class="checkout-item-info">
                    <img src="${product.image_url}" alt="${product.name}" class="checkout-item-image" onerror="this.src='/images/placeholder.jpg'">
                    <div>
                        <div style="font-weight: bold;">${product.name}</div>
                        <div style="color: var(--gray-color); font-size: 0.9rem;">Size: ${product.size}</div>
                        <div style="color: var(--gray-color); font-size: 0.9rem;">Qty: ${product.quantity}</div>
                    </div>
                </div>
                <div style="font-weight: bold; color: var(--primary-color);">R${(product.price * product.quantity).toFixed(2)}</div>
            </div>
        `).join('');
        
        // Calculate totals
        const subtotal = validProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
        
        checkoutSubtotal.textContent = `R${subtotal.toFixed(2)}`;
        checkoutTotal.textContent = `R${subtotal.toFixed(2)}`;
        
        // Store items for form submission
        window.checkoutItems = validProducts;
        window.checkoutTotal = subtotal;
        
    } catch (error) {
        console.error('Failed to load checkout items:', error);
        checkoutItems.innerHTML = '<div class="message error">Failed to load items. Please try again.</div>';
    }
}

function initializeCheckoutForm() {
    const form = document.getElementById('checkout-form');
    
    if (!form) return;
    
    form.addEventListener('submit', handleCheckoutSubmission);
    
    // Auto-fill user data if logged in
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
        const emailField = document.getElementById('customer-email');
        if (emailField && user.email) {
            emailField.value = user.email;
        }
    }
}

async function handleCheckoutSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const customerName = formData.get('customerName');
    const customerEmail = formData.get('customerEmail');
    const customerPhone = formData.get('customerPhone');
    const customerAddress = formData.get('customerAddress');
    const paymentMethod = formData.get('paymentMethod');
    
    // Validate form
    if (!customerName || !customerEmail || !customerPhone || !customerAddress || !paymentMethod) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Get cart items and total
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }
    
    if (!window.checkoutItems || !window.checkoutTotal) {
        alert('Error loading cart items. Please refresh and try again.');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing Order...';
    
    try {
        // Create order data
        const orderData = {
            customerName,
            customerEmail,
            customerAddress: `${customerAddress}\nPhone: ${customerPhone}`,
            items: window.checkoutItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                size: item.size,
                price: item.price
            })),
            totalAmount: window.checkoutTotal,
            paymentMethod: paymentMethod
        };
        
        // Process payment based on method
        await processPayment(orderData, paymentMethod);
        
    } catch (error) {
        console.error('Checkout failed:', error);
        alert('Checkout failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function processPayment(orderData, paymentMethod) {
    try {
        // Simulate payment processing
        await simulatePaymentProcessing(paymentMethod);
        
        // Save order to database
        const response = await apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        
        if (response.orderId) {
            // Clear cart and show success
            clearCart();
            showOrderSuccess(response.orderId, orderData, paymentMethod);
            updateCartCount();
        } else {
            throw new Error('Failed to create order');
        }
        
    } catch (error) {
        console.error('Payment processing failed:', error);
        throw error;
    }
}

async function simulatePaymentProcessing(paymentMethod) {
    // Simulate payment processing delay
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate payment success (90% success rate for demo)
            if (Math.random() > 0.1) {
                resolve();
            } else {
                reject(new Error('Payment failed. Please try again.'));
            }
        }, 2000);
    });
}

function showOrderSuccess(orderId, orderData, paymentMethod) {
    const container = document.querySelector('.checkout-content');
    
    const paymentMethodNames = {
        'credit-card': 'Credit Card',
        'bank-transfer': 'Bank Transfer',
        'cash-delivery': 'Cash on Delivery'
    };
    
    const confirmationHTML = `
        <div class="order-confirmation" style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
            <div class="success-icon" style="font-size: 4rem; color: var(--success-color); margin-bottom: 1rem;">✅</div>
            <h2 style="color: var(--success-color); margin-bottom: 2rem;">Payment Successful!</h2>
            
            <div style="background: var(--light-gray); padding: 2rem; border-radius: 10px; margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">Order Details</h3>
                <div style="display: grid; gap: 0.5rem; text-align: left; max-width: 400px; margin: 0 auto;">
                    <div><strong>Order ID:</strong> #${orderId}</div>
                    <div><strong>Customer:</strong> ${orderData.customerName}</div>
                    <div><strong>Email:</strong> ${orderData.customerEmail}</div>
                    <div><strong>Total Amount:</strong> <span style="color: var(--primary-color); font-weight: bold;">R${orderData.totalAmount.toFixed(2)}</span></div>
                    <div><strong>Payment Method:</strong> ${paymentMethodNames[paymentMethod] || paymentMethod}</div>
                    <div><strong>Status:</strong> <span style="color: var(--success-color);">Confirmed</span></div>
                </div>
            </div>
            
            <div style="background: #e8f5e8; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem; border-left: 4px solid var(--success-color);">
                <h4 style="margin-bottom: 1rem;">What happens next?</h4>
                <ol style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <li>Order confirmation email sent</li>
                    <li>Order processing begins</li>
                    <li>Items prepared for shipping</li>
                    <li>Tracking information provided</li>
                    <li>Delivery within 3-7 business days</li>
                </ol>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2rem;">
                <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
                <a href="index.html" class="btn btn-secondary">Back to Home</a>
                <a href="https://wa.me/+27793757047?text=Hi%20I'd%20like%20to%20track%20order%20%23${orderId}" target="_blank" class="track-btn">Track Order</a>
            </div>
            
            <div style="padding: 1rem; background: var(--light-gray); border-radius: 8px; font-size: 0.9rem; color: var(--gray-color);">
                <p style="margin: 0;">
                    📧 Confirmation email sent to ${orderData.customerEmail}<br>
                    📱 Track your order anytime via WhatsApp<br>
                    🏪 Visit our store for any assistance
                </p>
            </div>
        </div>
    `;
    
    container.innerHTML = confirmationHTML;
    
    // Scroll to top to show confirmation
    window.scrollTo({ top: 0, behavior: 'smooth' });
}