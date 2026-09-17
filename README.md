# 🛍 ShopNow — Simple E-Commerce Store

> **CodeAlpha Full Stack Development Internship — Task 1**

A complete, production-quality full-stack e-commerce web application built with React, Node.js, Express.js, and MongoDB.

---

## 📸 Features

### 🔐 Authentication (2-Step OTP Login)
- User registration with validation
- **Email OTP two-factor login** — password verification → OTP sent via email → JWT issued
- JWT-based session management
- Protected routes for authenticated users only
- Resend OTP support

### 🛍 Shopping
- Full product catalog loaded from MongoDB
- Product search, category filter, price range filter, and sort
- Product detail page with stock-aware quantity selector
- Add to cart with stock enforcement
- Persistent cart (localStorage)

### 🛒 Cart & Checkout
- Quantity increase/decrease with stock limits
- Remove items, clear cart
- Checkout with shipping form validation
- **Server-side price calculation** — backend recalculates total; frontend totals are display-only

### 📦 Orders
- Order creation with MongoDB transactions (atomic stock reduction)
- Order confirmation page
- My Orders history (user-scoped)
- Individual order detail page

### 🎨 UI/UX
- Dark theme with indigo accent — premium modern design
- Fully responsive (mobile + desktop)
- Loading skeletons, empty states, error states
- Toast notifications (react-hot-toast)
- Glassmorphism navbar, animated hero section

---

## 🏗 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| State | Context API + localStorage |
| HTTP | Axios |
| Notifications | react-hot-toast |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT + bcryptjs |
| OTP Email | Nodemailer (Gmail SMTP) |
| Validation | express-validator |

---

## 📁 Project Structure

```
TASK-1 E-Commerce/
├── frontend/
│   └── src/
│       ├── components/     # Navbar, ProductCard, Footer, ProtectedRoute
│       ├── context/        # AuthContext, CartContext
│       ├── pages/          # Home, Products, ProductDetail, Login, Register, Cart, Checkout, Orders
│       └── services/       # api.js, authService, productService, orderService
│
├── backend/
│   ├── config/             # db.js (MongoDB connection)
│   ├── controllers/        # authController, productController, orderController
│   ├── middleware/         # auth.js (JWT verification)
│   ├── models/             # User, Product, Order, OTP
│   ├── routes/             # auth.js, products.js, orders.js
│   ├── scripts/            # seed.js
│   ├── utils/              # email.js, seedData.js
│   └── server.js
│
└── README.md
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
MONGO_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
```

> **Gmail App Password**: Go to [Google Account Security](https://myaccount.google.com/security) → 2-Step Verification → App passwords → Generate one for "Mail".

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Gmail account with 2FA + App Password (for OTP emails)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/CodeAlpha_Simple-Ecommerce-Store.git
cd CodeAlpha_Simple-Ecommerce-Store
```

### 2. Set up the backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS
```

### 3. Set up the frontend
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with VITE_API_URL if needed
```

### 4. Seed the database
```bash
cd backend
npm run seed
# Inserts 12 sample products into MongoDB
```

---

## ▶️ Running the Application

### Start the backend (terminal 1)
```bash
cd backend
npm run dev     # Development with nodemon
# OR
npm start       # Production
```

> Backend runs on **http://localhost:5000**

### Start the frontend (terminal 2)
```bash
cd frontend
npm run dev
```

> Frontend runs on **http://localhost:5173**

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Verify password → send OTP | No |
| POST | `/api/auth/verify-otp` | Verify OTP → return JWT | No |
| POST | `/api/auth/resend-otp` | Resend OTP to email | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Products
| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|-------------|
| GET | `/api/products` | Get all products | `search`, `category`, `minPrice`, `maxPrice`, `sort` |
| GET | `/api/products/:id` | Get single product | - |
| POST | `/api/products` | Create product (seeding) | - |
| PUT | `/api/products/:id` | Update product | - |
| DELETE | `/api/products/:id` | Delete product | - |

### Orders
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/orders` | Create order | Yes |
| GET | `/api/orders/my-orders` | Get user's orders | Yes |
| GET | `/api/orders/:id` | Get single order (user-scoped) | Yes |

---

## 🔐 Security Features

- Passwords hashed with **bcryptjs** (12 salt rounds)
- **JWT** authentication with 7-day expiry
- **Email OTP** 2nd factor — expires in 10 minutes (MongoDB TTL index)
- Auth middleware verifies JWT on every protected route
- Users can only access their own orders (server-enforced)
- **Server-side price calculation** — frontend totals are never trusted
- Mongoose validation on all models
- CORS configured for frontend origin only
- No secrets exposed in API responses

---

## 🗄️ Database Schemas

### User
| Field | Type | Notes |
|-------|------|-------|
| name | String | Required, 2–50 chars |
| email | String | Unique, validated |
| password | String | bcrypt hashed, never returned |
| createdAt | Date | Auto |

### Product
| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| description | String | Required |
| price | Number | Required, min 0 |
| image | String | URL |
| category | String | Required |
| stock | Number | Required, min 0 |

### Order
| Field | Type | Notes |
|-------|------|-------|
| user | ObjectId | Ref to User |
| items | Array | Snapshot of product name/price/image + qty |
| totalAmount | Number | Server-calculated |
| shippingAddress | Object | fullName, phone, address, city, state, postalCode |
| status | String | Pending/Processing/Shipped/Delivered/Cancelled |

---

## 🌱 Seed Data

Run `npm run seed` in the `/backend` directory to populate the database with 12 sample products across categories:
- **Electronics**: AirPods Pro, Sony Headphones, Samsung TV, MacBook Pro, Canon Camera
- **Footwear**: Nike Air Max 270
- **Accessories**: Leather Bag, Minimalist Watch
- **Clothing**: Levi's 501 Jeans
- **Kitchen**: Vitamix Blender, Instant Pot
- **Sports**: Yoga Mat Pro

---

## 🔮 Future Improvements

- Admin dashboard for product/order management
- Product reviews and ratings
- Wishlist functionality
- Payment gateway integration (Stripe)
- Email order confirmation
- Real-time order tracking
- Product image upload (Cloudinary)
- Pagination for products

---

## 📝 Internship Context

This project was developed as **Task 1: Simple E-Commerce Store** for the **CodeAlpha Full Stack Development Internship**.

Repository name: `CodeAlpha_Simple-Ecommerce-Store`

---

## 📄 License

MIT License — feel free to use this project for learning purposes.
