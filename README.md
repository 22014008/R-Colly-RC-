# R Colly(RC) Fashion E-commerce Store

A modern, fully-featured e-commerce clothing store built with HTML, CSS, JavaScript, Node.js, and SQLite.

## Features

### Customer Features
- **Modern Responsive Design**: Clean, mobile-first design with brand colors
- **Product Browsing**: Filter by categories (Caps, Hoodies, Pants, T-Shirts)
- **Shopping Cart**: Add, remove, update quantities
- **Checkout System**: Complete order process with WhatsApp integration
- **User Authentication**: Register and login functionality
- **Order Tracking**: Track orders via WhatsApp
- **About & Contact Pages**: Store information and contact methods

### Admin Features
- **Admin Dashboard**: Sales stats, order overview, low stock alerts
- **Product Management**: Add, edit, delete products with image upload
- **Order Management**: View orders, update status (Pending → Shipped → Delivered)
- **Inventory Tracking**: Monitor stock levels

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT tokens, bcrypt for password hashing
- **File Upload**: Multer for image handling
- **Styling**: Custom CSS with CSS Grid and Flexbox

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   # or
   node server.js
   ```

3. **Access the Application**
   - Frontend: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## Default Admin Account

- **Username**: admin
- **Password**: admin123

## Database Schema

The application automatically creates the following tables:
- `users` - User accounts and authentication
- `categories` - Product categories
- `products` - Product catalog with images and inventory
- `orders` - Customer orders
- `order_items` - Individual items within orders

## API Endpoints

### Public Routes
- `POST /api/register` - User registration
- `POST /api/login` - User authentication
- `GET /api/categories` - Get all categories
- `GET /api/products` - Get all products (with optional category filter)
- `GET /api/products/:id` - Get single product
- `POST /api/orders` - Create new order

### Admin Routes (Require Authentication)
- `GET /api/admin/products` - Get all products for admin
- `POST /api/admin/products` - Add new product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id` - Update order status
- `GET /api/admin/stats` - Get dashboard statistics

## Features In Detail

### Shopping Cart
- Persistent cart using localStorage
- Size selection for products
- Quantity management
- Real-time total calculation

### WhatsApp Integration
- Direct order placement via WhatsApp
- Order tracking through WhatsApp
- Customer support integration

### Responsive Design
- Mobile-first approach
- Optimized for tablets and desktops
- Touch-friendly interface

### Security
- JWT authentication
- Password hashing with bcrypt
- SQL injection protection
- XSS protection

## File Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies
├── database/             
│   └── store.db          # SQLite database (auto-created)
├── frontend/
│   ├── index.html        # Homepage
│   ├── shop.html         # Product listing
│   ├── cart.html         # Shopping cart
│   ├── checkout.html     # Checkout process
│   ├── about.html        # About page
│   ├── contact.html      # Contact page
│   ├── login.html        # Authentication
│   ├── css/
│   │   └── style.css     # Main stylesheet
│   ├── js/
│   │   ├── main.js       # Core functionality
│   │   ├── cart.js       # Cart management
│   │   ├── shop.js       # Product browsing
│   │   ├── checkout.js   # Checkout process
│   │   └── auth.js       # Authentication
│   ├── admin/
│   │   ├── index.html    # Admin dashboard
│   │   ├── css/
│   │   │   └── admin.css # Admin styles
│   │   └── js/
│   │       └── admin.js  # Admin functionality
│   └── images/           # Product images
└── uploads/              # User uploaded files
```

## Development

### Adding New Products
1. Login as admin
2. Go to Admin Panel → Products
3. Click "Add New Product"
4. Fill in product details and upload image
5. Save product

### Managing Orders
1. View orders in Admin Panel → Orders
2. Filter by status if needed
3. Update order status using dropdown
4. View order details by clicking "View"

## Production Deployment

1. Set environment variables for production
2. Update JWT_SECRET in server.js
3. Configure proper CORS settings
4. Set up SSL/HTTPS
5. Use a production database (PostgreSQL/MySQL)
6. Set up proper file storage (AWS S3, etc.)

## Support

For support, contact:
- Email: rcollyfashion@gmail.com
- WhatsApp: +27793757047
- Instagram: @rcollyfashion

## Store Location

**R Colly(RC) Fashion Clothes Store**  
Plaza Taxi rank St  
Thohoyandou, 0950  
Limpopo, South Africa  

**Hours**: Mon–Sat, 9am–6pm