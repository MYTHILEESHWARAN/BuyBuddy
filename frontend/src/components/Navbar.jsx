import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getProducts } from '../services/productService';

import { formatINR } from '../utils/formatCurrency';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchWrapRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  // Live search suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await getProducts({ search: searchQuery });
        setSuggestions((data.products || []).slice(0, 5));
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__container">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-icon">🛍</span>
          <span className="navbar__logo-text">ShopNow</span>
        </Link>

        {/* Live Search Bar */}
        <div className="navbar__search-wrap" ref={searchWrapRef}>
          <form onSubmit={handleSearchSubmit} className="navbar__search-form">
            <input
              type="text"
              placeholder="Search products, categories..."
              className="navbar__search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
            />
            <button type="submit" className="navbar__search-btn" aria-label="Search">
              🔍
            </button>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="navbar__suggestions">
              {suggestions.map((p) => (
                <Link
                  key={p._id}
                  to={`/products/${p._id}`}
                  className="navbar__suggestion-item"
                  onClick={() => {
                    setShowSuggestions(false);
                    setSearchQuery('');
                  }}
                >
                  <img src={p.image} alt={p.name} className="navbar__suggestion-img" />
                  <div className="navbar__suggestion-info">
                    <span className="navbar__suggestion-title">{p.name}</span>
                    <span className="navbar__suggestion-price">{formatINR(p.price)} • {p.category}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Nav Links */}
        <div className="navbar__links">
          <Link to="/" className={`navbar__link ${location.pathname === '/' ? 'navbar__link--active' : ''}`}>Home</Link>
          <Link to="/products" className={`navbar__link ${location.pathname === '/products' ? 'navbar__link--active' : ''}`}>Products</Link>
          <Link to="/ai-tutor" className={`navbar__link ${location.pathname === '/ai-tutor' ? 'navbar__link--active' : ''}`}>AI Tutor 🤖</Link>
        </div>

        {/* Right Actions */}
        <div className="navbar__actions">
          {/* Wishlist */}
          <Link to="/wishlist" className="navbar__icon-link" aria-label="Wishlist" title="Wishlist">
            <span style={{ fontSize: '1.2rem' }}>❤️</span>
            {wishlistCount > 0 && <span className="navbar__badge">{wishlistCount}</span>}
          </Link>

          {/* Cart */}
          <Link to="/cart" className="navbar__cart" aria-label="Shopping cart" title="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {cartCount > 0 && <span className="navbar__cart-badge">{cartCount}</span>}
          </Link>

          {/* Auth / Account Menu */}
          {isAuthenticated ? (
            <div className="navbar__user-dropdown-wrap">
              <Link to="/profile" className="btn btn--outline btn--sm navbar__profile-btn">
                👤 {user?.name?.split(' ')[0]}
              </Link>
              <div className="navbar__user-dropdown">
                <Link to="/profile" className="dropdown-item">👤 My Profile</Link>
                <Link to="/my-orders" className="dropdown-item">📦 My Orders</Link>
                <Link to="/wishlist" className="dropdown-item">❤️ Wishlist ({wishlistCount})</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="dropdown-item dropdown-item--admin">🛡 Admin Panel</Link>
                )}
                <div className="dropdown-divider" />
                <button className="dropdown-item dropdown-item--logout" onClick={handleLogout}>Logout</button>
              </div>
            </div>
          ) : (
            <div className="navbar__auth">
              <Link to="/login" className="btn btn--ghost btn--sm">Login</Link>
              <Link to="/register" className="btn btn--primary btn--sm">Register</Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button className="navbar__hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`navbar__mobile-menu ${menuOpen ? 'navbar__mobile-menu--open' : ''}`}>
        <Link to="/" className="mobile-link">Home</Link>
        <Link to="/products" className="mobile-link">Products</Link>
        <Link to="/ai-tutor" className="mobile-link">AI Tutor 🤖</Link>
        <Link to="/wishlist" className="mobile-link">Wishlist ({wishlistCount})</Link>
        <Link to="/cart" className="mobile-link">Cart ({cartCount})</Link>
        {isAuthenticated ? (
          <>
            <Link to="/profile" className="mobile-link">My Profile</Link>
            <Link to="/my-orders" className="mobile-link">My Orders</Link>
            {user?.role === 'admin' && <Link to="/admin" className="mobile-link mobile-link--admin">Admin Panel</Link>}
            <button className="mobile-link mobile-link--btn" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="mobile-link">Login</Link>
            <Link to="/register" className="mobile-link">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
