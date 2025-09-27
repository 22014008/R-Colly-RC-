const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        [process.env.FRONTEND_URL, 'https://*.railway.app'] : 
        ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('frontend'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Create database directory if it doesn't exist
if (!fs.existsSync('database')) {
    fs.mkdirSync('database');
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Database initialization
const db = new sqlite3.Database('./database/store.db');

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category_id INTEGER,
        image_url TEXT,
        stock_quantity INTEGER DEFAULT 0,
        sizes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method TEXT DEFAULT 'credit-card',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Order items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL,
        size TEXT,
        price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    // Insert default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run('INSERT OR IGNORE INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)', 
           ['admin', 'admin@rcolly.com', adminPassword, 1]);

    // Insert default categories
    const categories = [
        ['Caps', 'caps'],
        ['Hoodies', 'hoodies'],
        ['Pants', 'pants'],
        ['T-Shirts', 'tshirts']
    ];
    
    categories.forEach(([name, slug]) => {
        db.run('INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    });

    // Insert sample products
    const products = [
        ['Lalies Signature Cap', 'Premium streetwear cap with signature design', 120, 1, '/images/cap.jpg', 10, 'S,M,L,XL'],
        ['Classic Black Cap', 'Classic black cap for everyday wear', 100, 1, '/images/cap1.jpg', 15, 'S,M,L,XL'],
        ['Street Fusion Cap', 'Urban street fusion design cap', 110, 1, '/images/cap2.jpg', 12, 'S,M,L,XL'],
        ['Urban Edge Cap', 'Modern urban edge streetwear cap', 130, 1, '/images/cap3.jpg', 8, 'S,M,L,XL'],
        ['Fusion Hoodie', 'Comfortable streetwear hoodie', 250, 2, '/images/hood.jpg', 20, 'S,M,L,XL'],
        ['Urban Zip Hoodie', 'Premium zip-up hoodie', 270, 2, '/images/hood1.jpg', 18, 'S,M,L,XL'],
        ['Streetwear Hoodie', 'Classic streetwear hoodie design', 260, 2, '/images/hood2.jpg', 22, 'S,M,L,XL'],
        ['Bold Print Hoodie', 'Eye-catching bold print hoodie', 280, 2, '/images/hood3.jpg', 16, 'S,M,L,XL'],
        ['Slim Fit Pants', 'Modern slim fit streetwear pants', 200, 3, '/images/pants1.jpg', 25, '28,30,32,34'],
        ['Cargo Street Pants', 'Functional cargo street pants', 220, 3, '/images/pants2.jpg', 20, '28,30,32,34'],
        ['Fusion Joggers', 'Comfortable fusion design joggers', 210, 3, '/images/pants3.jpg', 30, '28,30,32,34'],
        ['Tapered Fit Pants', 'Stylish tapered fit pants', 230, 3, '/images/pants4.jpg', 18, '28,30,32,34'],
        ['Graphic Tee', 'Unique graphic design t-shirt', 150, 4, '/images/tshirt1.jpg', 35, 'S,M,L,XL'],
        ['Fusion Logo Tee', 'Brand fusion logo t-shirt', 160, 4, '/images/tshirt2.jpg', 40, 'S,M,L,XL'],
        ['Minimalist Tee', 'Clean minimalist design tee', 140, 4, '/images/tshirt3.jpg', 45, 'S,M,L,XL'],
        ['Oversized Street Tee', 'Trendy oversized street tee', 170, 4, '/images/tshirt4.jpg', 32, 'S,M,L,XL']
    ];

    products.forEach(product => {
        db.run('INSERT OR IGNORE INTO products (name, description, price, category_id, image_url, stock_quantity, sizes) VALUES (?, ?, ?, ?, ?, ?, ?)', 
               product);
    });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
    if (!req.user.is_admin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Routes
// User registration
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
               [username, email, hashedPassword], function(err) {
            if (err) {
                return res.status(400).json({ message: 'User already exists' });
            }
            res.status(201).json({ message: 'User created successfully' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// User login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ 
            id: user.id, 
            username: user.username, 
            is_admin: user.is_admin 
        }, JWT_SECRET);
        
        res.json({ token, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
    });
});

// Get all categories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY name', (err, categories) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        res.json(categories);
    });
});

// Get all products
app.get('/api/products', (req, res) => {
    const { category } = req.query;
    let query = `SELECT p.*, c.name as category_name FROM products p 
                 LEFT JOIN categories c ON p.category_id = c.id`;
    let params = [];
    
    if (category) {
        query += ' WHERE c.slug = ?';
        params.push(category);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    db.all(query, params, (err, products) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        res.json(products);
    });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
    db.get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', 
           [req.params.id], (err, product) => {
        if (err || !product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    });
});

// Create order
app.post('/api/orders', (req, res) => {
    const { customerName, customerEmail, customerAddress, items, totalAmount, paymentMethod } = req.body;
    
    // Validate required fields
    if (!customerName || !customerEmail || !customerAddress || !items || !totalAmount) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Order must contain at least one item' });
    }
    
    // Add payment method to orders table
    db.run('INSERT INTO orders (customer_name, customer_email, customer_address, total_amount, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)',
           [customerName, customerEmail, customerAddress, totalAmount, paymentMethod || 'credit-card', 'confirmed'], function(err) {
        if (err) {
            console.error('Database error creating order:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        
        const orderId = this.lastID;
        
        // Insert order items
        const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, size, price) VALUES (?, ?, ?, ?, ?)');
        let itemsInserted = 0;
        
        items.forEach(item => {
            stmt.run([orderId, item.productId, item.quantity, item.size, item.price], function(err) {
                if (err) {
                    console.error('Error inserting order item:', err);
                } else {
                    itemsInserted++;
                    
                    // Update product stock
                    db.run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', 
                           [item.quantity, item.productId], function(err) {
                        if (err) {
                            console.error('Error updating stock for product', item.productId, ':', err);
                        }
                    });
                }
            });
        });
        stmt.finalize();
        
        console.log(`Order ${orderId} created successfully with ${items.length} items`);
        res.status(201).json({ orderId, message: 'Order created successfully' });
    });
});

// Admin routes
// Get all products (admin)
app.get('/api/admin/products', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT p.*, c.name as category_name FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC`, (err, products) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        res.json(products);
    });
});

// Add new product (admin)
app.post('/api/admin/products', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
    const { name, description, price, categoryId, stockQuantity, sizes } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    db.run('INSERT INTO products (name, description, price, category_id, image_url, stock_quantity, sizes) VALUES (?, ?, ?, ?, ?, ?, ?)',
           [name, description, price, categoryId, imageUrl, stockQuantity, sizes], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        res.status(201).json({ id: this.lastID, message: 'Product created successfully' });
    });
});

// Update product (admin)
app.put('/api/admin/products/:id', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
    const { name, description, price, categoryId, stockQuantity, sizes } = req.body;
    let query = 'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, stock_quantity = ?, sizes = ?';
    let params = [name, description, price, categoryId, stockQuantity, sizes];
    
    if (req.file) {
        query += ', image_url = ?';
        params.push(`/uploads/${req.file.filename}`);
    }
    
    query += ' WHERE id = ?';
    params.push(req.params.id);
    
    db.run(query, params, function(err) {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        res.json({ message: 'Product updated successfully' });
    });
});

// Delete product (admin)
app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        res.json({ message: 'Product deleted successfully' });
    });
});

// Get all orders (admin)
app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT o.*, 
            GROUP_CONCAT(p.name || ' (Size: ' || oi.size || ') x' || oi.quantity) as items_summary,
            COUNT(oi.id) as item_count
            FROM orders o 
            LEFT JOIN order_items oi ON o.id = oi.order_id 
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id 
            ORDER BY o.created_at DESC`, (err, orders) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        res.json(orders);
    });
});

// Update order status (admin)
app.put('/api/admin/orders/:id', authenticateToken, requireAdmin, (req, res) => {
    const { status } = req.body;
    
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        res.json({ message: 'Order status updated successfully' });
    });
});

// Get dashboard stats (admin)
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    const stats = {};
    
    // Get total sales
    db.get('SELECT SUM(total_amount) as totalSales, COUNT(*) as totalOrders FROM orders', (err, result) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        stats.totalSales = result.totalSales || 0;
        stats.totalOrders = result.totalOrders || 0;
        
        // Get low stock products
        db.all('SELECT name, stock_quantity FROM products WHERE stock_quantity < 10 ORDER BY stock_quantity ASC', (err, products) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            stats.lowStockProducts = products || [];
            
            // Get recent orders
            db.all('SELECT id, customer_name, total_amount, created_at FROM orders ORDER BY created_at DESC LIMIT 5', (err, recentOrders) => {
                if (err) return res.status(500).json({ message: 'Server error' });
                stats.recentOrders = recentOrders || [];
                
                // Get total users
                db.get('SELECT COUNT(*) as totalUsers FROM users WHERE is_admin = 0', (err, result) => {
                    if (err) return res.status(500).json({ message: 'Server error' });
                    stats.totalUsers = result.totalUsers || 0;
                    
                    res.json(stats);
                });
            });
        });
    });
});

// Get all users (admin)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT id, username, email, created_at, 
            (SELECT COUNT(*) FROM orders WHERE customer_email = users.email) as order_count,
            (SELECT SUM(total_amount) FROM orders WHERE customer_email = users.email) as total_spent
            FROM users 
            WHERE is_admin = 0 
            ORDER BY created_at DESC`, (err, users) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        res.json(users);
    });
});

// Get order details (admin)
app.get('/api/admin/orders/:id', authenticateToken, requireAdmin, (req, res) => {
    const orderId = req.params.id;
    
    // Get order details
    db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err || !order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Get order items with product details
        db.all(`SELECT oi.*, p.name, p.image_url 
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?`, [orderId], (err, items) => {
            if (err) {
                return res.status(500).json({ message: 'Server error' });
            }
            
            res.json({ ...order, items });
        });
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});