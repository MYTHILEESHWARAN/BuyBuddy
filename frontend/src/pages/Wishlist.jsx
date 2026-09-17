import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import Footer from '../components/Footer';
import { formatINR } from '../utils/formatCurrency';

const Wishlist = () => {
  const { wishlistItems, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleMoveToCart = (product) => {
    addToCart(product, 1);
    removeFromWishlist(product._id);
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="wishlist-page">
        <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
          <div className="empty-state">
            <span style={{ fontSize: '5rem' }}>❤️</span>
            <h2 className="page-title">Your Wishlist is Empty</h2>
            <p className="page-subtitle">Save items you love to view or buy them later.</p>
            <Link to="/products" className="btn btn--primary btn--lg">Explore Products →</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
        <div className="wishlist-header">
          <div>
            <h1 className="page-title">My Wishlist ❤️</h1>
            <p className="page-subtitle">{wishlistItems.length} saved item{wishlistItems.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={clearWishlist}>
            Clear Wishlist
          </button>
        </div>

        <div className="products-grid">
          {wishlistItems.map((p) => {
            const isOos = p.stock === 0;
            return (
              <div key={p._id} className="product-card">
                {p.discountPercent > 0 && (
                  <span className="product-card__badge">-{p.discountPercent}%</span>
                )}
                <button
                  className="product-card__wishlist-btn active"
                  onClick={() => removeFromWishlist(p._id)}
                  title="Remove from Wishlist"
                >
                  ❤️
                </button>
                <div className="product-card__image-wrap">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="product-card__image"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'; }}
                  />
                </div>
                <div className="product-card__content">
                  <span className="product-card__category">{p.category}</span>
                  <h3 className="product-card__title">
                    <Link to={`/products/${p._id}`}>{p.name}</Link>
                  </h3>
                  <div className="product-card__price-row">
                    <span className="product-card__price">{formatINR(p.price)}</span>
                    {p.originalPrice && (
                      <span className="product-card__original-price">{formatINR(p.originalPrice)}</span>
                    )}
                  </div>
                  <div className="product-card__stock">
                    {isOos ? '❌ Out of Stock' : `✅ In Stock (${p.stock})`}
                  </div>
                  <div className="product-card__actions" style={{ marginTop: '1rem' }}>
                    <button
                      className={`btn btn--primary btn--full ${isOos ? 'btn--disabled' : ''}`}
                      onClick={() => handleMoveToCart(p)}
                      disabled={isOos}
                    >
                      🛒 Move to Cart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Wishlist;
