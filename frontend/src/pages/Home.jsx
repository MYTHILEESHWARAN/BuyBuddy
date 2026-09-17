import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';

const CATEGORIES = [
  { name: 'Electronics', icon: '⚡', desc: 'Audio, Laptops & TV' },
  { name: 'Footwear', icon: '👟', desc: 'Sneakers & Athletic' },
  { name: 'Clothing', icon: '👗', desc: 'Denim & Casuals' },
  { name: 'Accessories', icon: '💍', desc: 'Bags & Watches' },
  { name: 'Kitchen', icon: '🍳', desc: 'Appliances & Tools' },
  { name: 'Sports', icon: '🏋️', desc: 'Fitness & Gear' },
];

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Deal countdown timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await getProducts({});
        const prods = data.products || [];
        setFeatured(prods.slice(0, 4));
        setBestSellers(prods.slice(4, 8));
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="home">
      {/* ── Hero Banner ──────────────────────────── */}
      <section className="hero">
        <div className="hero__bg-blur hero__bg-blur--1" />
        <div className="hero__bg-blur hero__bg-blur--2" />
        <div className="hero__content">
          <div className="hero__badge">🔥 Flash Sale Up To 40% Off</div>
          <h1 className="hero__title">
            Discover Premium,<br />
            <span className="hero__title-accent">Shop Extraordinary</span>
          </h1>
          <p className="hero__subtitle">
            Explore curated tech, fashion, and everyday essentials with lightning-fast delivery and hassle-free returns.
          </p>
          <div className="hero__actions">
            <Link to="/products" className="btn btn--primary btn--lg">
              Explore Store →
            </Link>
            <Link to="/ai-tutor" className="btn btn--ghost btn--lg">
              Ask AI Assistant 🤖
            </Link>
          </div>
          <div className="hero__stats">
            <div className="hero__stat"><span className="hero__stat-num">1,000+</span><span>Products</span></div>
            <div className="hero__stat-divider" />
            <div className="hero__stat"><span className="hero__stat-num">100%</span><span>Buyer Protection</span></div>
            <div className="hero__stat-divider" />
            <div className="hero__stat"><span className="hero__stat-num">4.9★</span><span>Customer Rating</span></div>
          </div>
        </div>
        <div className="hero__visual">
          <div className="hero__card-float hero__card-float--1">
            <span>📦</span> Express Shipping
          </div>
          <div className="hero__card-float hero__card-float--2">
            <span>🔒</span> 256-Bit Security
          </div>
          <div className="hero__card-float hero__card-float--3">
            <span>❤️</span> 30-Day Guarantee
          </div>
          <img
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80"
            alt="ShopNow shopping experience"
            className="hero__image"
          />
        </div>
      </section>

      {/* ── Deal of the Day Banner ──────────────── */}
      <section className="deal-banner">
        <div className="container">
          <div className="deal-banner__wrap">
            <div className="deal-banner__info">
              <span className="deal-badge">⚡ Deal of the Day</span>
              <h2>Special Discount Event</h2>
              <p>Save up to 40% on top-rated audio, smartphones, and fashion staples.</p>
            </div>
            <div className="deal-timer">
              <div className="deal-timer__box">
                <span className="deal-timer__num">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="deal-timer__unit">Hours</span>
              </div>
              <span className="deal-timer__sep">:</span>
              <div className="deal-timer__box">
                <span className="deal-timer__num">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="deal-timer__unit">Mins</span>
              </div>
              <span className="deal-timer__sep">:</span>
              <div className="deal-timer__box">
                <span className="deal-timer__num">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="deal-timer__unit">Secs</span>
              </div>
            </div>
            <Link to="/products?sort=discount_desc" className="btn btn--primary btn--lg">
              Claim Deal →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Shop By Category ────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">Shop By Category</h2>
            <p className="section__subtitle">Browse through our specialized product departments</p>
          </div>
          <div className="categories-grid">
            {CATEGORIES.map((cat) => (
              <Link key={cat.name} to={`/products?category=${cat.name}`} className="category-card">
                <span className="category-card__icon">{cat.icon}</span>
                <span className="category-card__name">{cat.name}</span>
                <span className="category-card__desc">{cat.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ────────────────────── */}
      <section className="section section--dark">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">Featured Products</h2>
            <p className="section__subtitle">Handpicked highlights with highest customer reviews</p>
          </div>
          {loading ? (
            <div className="loading-grid">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : (
            <div className="products-grid">
              {featured.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
          <div className="section__cta">
            <Link to="/products" className="btn btn--primary btn--lg">View All Products →</Link>
          </div>
        </div>
      </section>

      {/* ── Best Sellers ────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">Best Sellers</h2>
            <p className="section__subtitle">Top trending items ordered by thousands of customers</p>
          </div>
          {loading ? (
            <div className="loading-grid">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : (
            <div className="products-grid">
              {bestSellers.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Value Propositions ──────────────────── */}
      <section className="section section--dark">
        <div className="container">
          <div className="value-props">
            {[
              { icon: '🚚', title: 'Free Express Shipping', desc: 'On orders over ₹499' },
              { icon: '🔄', title: '30-Day Hassle-Free Returns', desc: 'Easy refund guarantee' },
              { icon: '🔐', title: 'Protected Checkout', desc: 'JWT Encrypted Security' },
              { icon: '🤖', title: 'AI Assistant Support', desc: '24/7 Intelligent Tutor' },
            ].map((vp) => (
              <div key={vp.title} className="value-card">
                <span className="value-card__icon">{vp.icon}</span>
                <h3 className="value-card__title">{vp.title}</h3>
                <p className="value-card__desc">{vp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
