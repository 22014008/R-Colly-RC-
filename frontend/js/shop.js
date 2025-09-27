// Shop page functionality
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('shop.html')) {
        initializeShopPage();
    }
});

let allProducts = [];
let currentFilter = 'all';

async function initializeShopPage() {
    // Load products
    await loadAllProducts();
    
    // Initialize filters
    initializeFilters();
    
    // Check for category filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('category');
    if (categoryFilter) {
        currentFilter = categoryFilter;
        updateActiveFilter();
        filterProducts();
    }
    
    // Initialize product modal
    initializeProductModal();
}

async function loadAllProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        const products = await apiRequest('/api/products');
        allProducts = products;
        
        if (products.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No products available</h3></div>';
            return;
        }
        
        displayProducts(products);
        
    } catch (error) {
        console.error('Failed to load products:', error);
        container.innerHTML = '<div class="message error">Failed to load products. Please try again later.</div>';
    }
}

function displayProducts(products) {
    const container = document.getElementById('products-container');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No products found</h3><p>Try adjusting your filters.</p></div>';
        return;
    }
    
    container.innerHTML = products.map(product => createProductCard(product)).join('');
    
    // Add click handlers for product cards
    container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('select') && !e.target.closest('a')) {
                const productId = card.dataset.productId;
                showProductModal(productId);
            }
        });
    });
}

function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            currentFilter = category;
            updateActiveFilter();
            filterProducts();
        });
    });
}

function updateActiveFilter() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = document.querySelector(`[data-category="${currentFilter}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

function filterProducts() {
    let filteredProducts = allProducts;
    
    if (currentFilter !== 'all') {
        filteredProducts = allProducts.filter(product => {
            return product.category_name && product.category_name.toLowerCase() === getCategoryName(currentFilter);
        });
    }
    
    displayProducts(filteredProducts);
}

function getCategoryName(slug) {
    const categoryMap = {
        'caps': 'caps',
        'hoodies': 'hoodies',  
        'pants': 'pants',
        'tshirts': 't-shirts'
    };
    
    return categoryMap[slug] || slug;
}

function initializeProductModal() {
    const modal = document.getElementById('productModal');
    const closeBtn = modal.querySelector('.close');
    
    // Close modal when clicking close button
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

// Search functionality (can be added later)
function searchProducts(query) {
    const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase())
    );
    
    displayProducts(filteredProducts);
}

// Sort functionality (can be added later)
function sortProducts(sortBy) {
    let sortedProducts = [...allProducts];
    
    switch (sortBy) {
        case 'price-low':
            sortedProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sortedProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'newest':
            sortedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        default:
            // Default order from API
            break;
    }
    
    displayProducts(sortedProducts);
}