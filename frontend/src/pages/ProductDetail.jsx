import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductById, getProducts, createProductReview } from '../services/productService';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/formatCurrency';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Review Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Pincode state
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState(null);

  useEffect(() => {
    const fetchProductData = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await getProductById(id);
        const p = data.product;
        setProduct(p);
        setSelectedImage(p.image);

        // Fetch related products in same category
        if (p.category) {
          const relRes = await getProducts({ category: p.category });
          setRelated((relRes.data.products || []).filter((item) => item._id !== p._id).slice(0, 4));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProductData();
  }, [id]);

  const inWishlist = product ? isInWishlist(product._id) : false;

  const handleAddToCart = () => {
    if (quantity > product.stock) {
      toast.error(`Only ${product.stock} units available`);
      return;
    }
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    if (quantity > product.stock) {
      toast.error(`Only ${product.stock} units available`);
      return;
    }
    addToCart(product, quantity);
    navigate('/checkout');
  };

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product._id);
    } else {
      addToWishlist(product);
    }
  };

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > (product?.stock || 1)) return product.stock;
      return next;
    });
  };

  const handleCheckPincode = (e) => {
    e.preventDefault();
    if (!pincode || pincode.length !== 6) {
      toast.error('Enter a valid 6-digit Indian Pincode');
      return;
    }
    setPincodeStatus('checking');
    setTimeout(() => {
      setPincodeStatus('available');
    }, 1000);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to leave a review');
      navigate('/login');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please enter a review comment');
      return;
    }

    setSubmittingReview(true);
    try {
      const { data } = await createProductReview(product._id, { rating, comment });
      toast.success('Review submitted successfully!');
      setProduct(data.product);
      setComment('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 1rem' }}>
        <div className="product-detail-skeleton">
          <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 32, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 24 }} />
            <div className="skeleton" style={{ height: 48, width: '40%', marginBottom: 32 }} />
            <div className="skeleton" style={{ height: 100 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div className="error-state">
          <span className="error-state__icon">😕</span>
          <h2>Product Not Found</h2>
          <p>{error || 'The requested item does not exist.'}</p>
          <Link to="/products" className="btn btn--primary">Back to Products</Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock === 0;
  const imageGallery = product.images && product.images.length > 0 ? product.images : [product.image];

  return (
    <div className="product-detail-page">
      <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
        <Link to="/products" className="back-link">← Back to Products</Link>

        <div className="product-detail">
          {/* Left Column: Image Gallery */}
          <div className="product-detail__gallery">
            <div className="product-detail__image-wrap">
              <img
                src={selectedImage || product.image}
                alt={product.name}
                className="product-detail__image"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/600x400?text=No+Image'; }}
              />
              {isOutOfStock && <div className="product-detail__oos-banner">Out of Stock</div>}
              {product.discountPercent > 0 && (
                <span className="product-detail__discount-badge">-{product.discountPercent}% OFF</span>
              )}
            </div>

            {/* Thumbnail selector */}
            {imageGallery.length > 1 && (
              <div className="product-detail__thumbs">
                {imageGallery.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    className={`thumb-btn ${selectedImage === imgUrl ? 'active' : ''}`}
                    onClick={() => setSelectedImage(imgUrl)}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Info & Actions */}
          <div className="product-detail__info">
            <div className="product-detail__meta">
              <span className="product-card__category">{product.category}</span>
              <span className="product-detail__rating-badge">
                ★ {product.rating ? product.rating.toFixed(1) : '4.5'} ({product.numReviews || 0} customer reviews)
              </span>
            </div>

            <h1 className="product-detail__name">{product.name}</h1>

            <div className="product-detail__price-row">
              <span className="product-detail__price">{formatINR(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="product-detail__original-price">{formatINR(product.originalPrice)}</span>
              )}
            </div>

            <div className={`product-detail__stock ${isOutOfStock ? 'oos' : product.stock <= 5 ? 'low' : 'in'}`}>
              {isOutOfStock
                ? '❌ Out of Stock'
                : product.stock <= 5
                ? `⚠️ Only ${product.stock} units left in stock`
                : `✅ In Stock (${product.stock} available)`}
            </div>

            <p className="product-detail__description">{product.description}</p>
            
            {/* Delivery Pincode Checker */}
            <div className="pincode-checker" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-50)', borderRadius: '8px' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>📍 Check Delivery Availability</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter 6-digit Pincode"
                  maxLength="6"
                  value={pincode}
                  onChange={(e) => { setPincode(e.target.value); setPincodeStatus(null); }}
                  style={{ flex: 1 }}
                />
                <button className="btn btn--outline" onClick={handleCheckPincode}>Check</button>
              </div>
              {pincodeStatus === 'checking' && <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Checking delivery options...</p>}
              {pincodeStatus === 'available' && <p className="text-green" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>✅ Delivery available for {pincode}. Usually delivered in 2-4 days.</p>}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="quantity-selector">
                <label className="filter-label">Quantity</label>
                <div className="quantity-controls">
                  <button className="qty-btn" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>−</button>
                  <span className="qty-display">{quantity}</span>
                  <button className="qty-btn" onClick={() => handleQuantityChange(1)} disabled={quantity >= product.stock}>+</button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="product-detail__actions">
              <button
                className={`btn btn--primary btn--lg ${isOutOfStock ? 'btn--disabled' : ''}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
              </button>
              <button
                className={`btn btn--outline btn--lg ${isOutOfStock ? 'btn--disabled' : ''}`}
                onClick={handleBuyNow}
                disabled={isOutOfStock}
              >
                ⚡ Buy Now
              </button>
              <button
                className={`btn btn--ghost btn--lg ${inWishlist ? 'active' : ''}`}
                onClick={handleWishlistToggle}
                title="Wishlist Toggle"
              >
                {inWishlist ? '❤️ Saved' : '🤍 Wishlist'}
              </button>
            </div>

            {/* Delivery & Return info props */}
            <div className="product-detail__trust-box">
              <div>🚚 <strong>Free Shipping:</strong> On orders over ₹499</div>
              <div>🔄 <strong>Easy Returns:</strong> 7-day hassle-free money back</div>
              <div>🔒 <strong>Security:</strong> 256-Bit Encrypted Checkout</div>
              <div>💵 <strong>Payment Options:</strong> Cash on Delivery, UPI, Cards, Net Banking</div>
            </div>
          </div>
        </div>

        {/* Specifications Tab */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="product-detail__section" style={{ marginTop: '3rem' }}>
            <h2 className="section-title">Product Specifications</h2>
            <div className="specs-table">
              {Object.entries(product.specifications).map(([key, val]) => (
                <div key={key} className="spec-row">
                  <span className="spec-label">{key}</span>
                  <span className="spec-val">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Reviews Section */}
        <div className="product-detail__section" style={{ marginTop: '3rem' }}>
          <h2 className="section-title">Customer Reviews & Ratings ({product.numReviews || 0})</h2>

          <div className="reviews-layout">
            {/* Reviews List */}
            <div className="reviews-list">
              {(!product.reviews || product.reviews.length === 0) ? (
                <p style={{ color: 'var(--text-secondary)' }}>No reviews yet. Be the first to review this product!</p>
              ) : (
                product.reviews.map((rev) => (
                  <div key={rev._id} className="review-card">
                    <div className="review-card__header">
                      <span className="review-card__author">{rev.name}</span>
                      <span className="review-card__stars">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                    </div>
                    <p className="review-card__comment">{rev.comment}</p>
                    <span className="review-card__date">{new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>

            {/* Write Review Form */}
            <div className="review-form-wrap">
              <h3>Write a Review</h3>
              <form onSubmit={handleSubmitReview} className="review-form">
                <div className="form-group">
                  <label>Rating</label>
                  <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    <option value={5}>★★★★★ (5/5) Excellent</option>
                    <option value={4}>★★★★☆ (4/5) Very Good</option>
                    <option value={3}>★★★☆☆ (3/5) Average</option>
                    <option value={2}>★★☆☆☆ (2/5) Poor</option>
                    <option value={1}>★☆☆☆☆ (1/5) Terrible</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Your Review</label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Describe your experience with this product..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn--primary btn--full" disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="product-detail__section" style={{ marginTop: '3rem' }}>
            <h2 className="section-title">Related Products in {product.category}</h2>
            <div className="products-grid">
              {related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;
