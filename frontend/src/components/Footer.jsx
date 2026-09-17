import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__brand">
          <div className="footer__logo">🛍 ShopNow</div>
          <p className="footer__tagline">Premium products, seamless shopping experience.</p>
          <div className="footer__social">
            <a href="#" aria-label="Twitter" className="footer__social-link">𝕏</a>
            <a href="#" aria-label="Instagram" className="footer__social-link">📸</a>
            <a href="#" aria-label="Facebook" className="footer__social-link">f</a>
          </div>
        </div>

        <div className="footer__col">
          <h4>Shop</h4>
          <Link to="/products">All Products</Link>
          <Link to="/products?category=Electronics">Electronics</Link>
          <Link to="/products?category=Clothing">Clothing</Link>
          <Link to="/products?category=Accessories">Accessories</Link>
        </div>

        <div className="footer__col">
          <h4>Account</h4>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/my-orders">My Orders</Link>
          <Link to="/cart">Cart</Link>
        </div>

        <div className="footer__col">
          <h4>Support</h4>
          <a href="#">Help Center</a>
          <a href="#">Returns</a>
          <a href="#">Shipping Info</a>
          <a href="#">Contact Us</a>
        </div>
      </div>

      <div className="footer__bottom">
        <p>© {new Date().getFullYear()} ShopNow E-Commerce. Built for CodeAlpha Full Stack Internship — Task 1.</p>
      </div>
    </footer>
  );
};

export default Footer;
