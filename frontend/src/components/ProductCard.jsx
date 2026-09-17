import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatINR } from '../utils/formatCurrency';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  const isOutOfStock = product.stock === 0;
  const inWishlist = isInWishlist(product._id);

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(product._id);
    } else {
      addToWishlist(product);
    }
  };

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      addToCart(product, 1);
      navigate('/checkout');
    }
  };

  return (
    <div className="product-card">
      {/* Discount Badge */}
      {product.discountPercent > 0 && (
        <span className="product-card__discount-badge">-{product.discountPercent}%</span>
      )}

      {/* Wishlist Heart Button */}
      <button
        className={`product-card__wishlist-btn ${inWishlist ? 'active' : ''}`}
        onClick={handleWishlistToggle}
        aria-label="Wishlist toggle"
        title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
      >
        {inWishlist ? '❤️' : '🤍'}
      </button>

      <Link to={`/products/${product._id}`} className="product-card__image-wrap">
        <img
          src={product.image}
          alt={product.name}
          className="product-card__image"
          loading="lazy"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'; }}
        />
        <div className="product-card__overlay">
          <span className="product-card__view-btn">View Details</span>
        </div>
        {isOutOfStock && <div className="product-card__badge product-card__badge--oos">Out of Stock</div>}
        {!isOutOfStock && product.stock <= 5 && (
          <div className="product-card__badge product-card__badge--low">Only {product.stock} left</div>
        )}
      </Link>

      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="product-card__category">{product.category}</span>
          <span className="product-card__rating">
            ★ {product.rating ? product.rating.toFixed(1) : '4.5'}
            {product.numReviews > 0 && <span className="product-card__review-count">({product.numReviews})</span>}
          </span>
        </div>

        <h3 className="product-card__name">
          <Link to={`/products/${product._id}`}>{product.name}</Link>
        </h3>
        <p className="product-card__desc">{product.description.substring(0, 85)}...</p>

        <div className="product-card__price-row">
          <span className="product-card__price">{formatINR(product.price)}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="product-card__original-price">{formatINR(product.originalPrice)}</span>
          )}
        </div>

        <div className="product-card__actions-row">
          <button
            className={`btn btn--primary btn--sm ${isOutOfStock ? 'btn--disabled' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              !isOutOfStock && addToCart(product, 1);
            }}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? 'Out of Stock' : '+ Cart'}
          </button>
          <button
            className={`btn btn--outline btn--sm ${isOutOfStock ? 'btn--disabled' : ''}`}
            onClick={handleBuyNow}
            disabled={isOutOfStock}
          >
            ⚡ Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
