import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (sort) params.sort = sort;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const { data } = await getProducts(params);
      setProducts(data.products);
      setCategories(data.categories);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, minPrice, maxPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setSort('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams({});
  };

  const hasFilters = search || category || sort || minPrice || maxPrice;

  return (
    <div className="products-page">
      <div className="products-page__header">
        <div className="container">
          <h1 className="page-title">All Products</h1>
          <p className="page-subtitle">Discover our curated collection of premium items</p>
        </div>
      </div>

      <div className="container">
        <div className="products-layout">
          {/* Sidebar Filters */}
          <aside className="filters-sidebar">
            <div className="filters-sidebar__header">
              <h3>Filters</h3>
              {hasFilters && (
                <button className="btn btn--ghost btn--sm" onClick={handleClearFilters}>
                  Clear All
                </button>
              )}
            </div>

            {/* Search */}
            <div className="filter-group">
              <label className="filter-label" htmlFor="search-input">Search</label>
              <div className="search-input-wrap">
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input"
                />
                <span className="search-icon">🔍</span>
              </div>
            </div>

            {/* Category */}
            <div className="filter-group">
              <label className="filter-label">Category</label>
              <div className="category-filters">
                <button
                  className={`category-filter-btn ${!category ? 'active' : ''}`}
                  onClick={() => setCategory('')}
                >All</button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`category-filter-btn ${category === cat ? 'active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >{cat}</button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="filter-group">
              <label className="filter-label">Price Range</label>
              <div className="price-range">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="input input--sm"
                  min="0"
                />
                <span className="price-separator">—</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="input input--sm"
                  min="0"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="filter-group">
              <label className="filter-label" htmlFor="sort-select">Sort By</label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="input"
              >
                <option value="">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
              </select>
            </div>
          </aside>

          {/* Product Grid */}
          <main className="products-main">
            <div className="products-main__bar">
              <span className="products-count">
                {loading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
              </span>
            </div>

            {loading ? (
              <div className="products-grid">
                {[...Array(8)].map((_, i) => <div key={i} className="skeleton-card" />)}
              </div>
            ) : error ? (
              <div className="error-state">
                <span className="error-state__icon">⚠️</span>
                <h3>Something went wrong</h3>
                <p>{error}</p>
                <button className="btn btn--primary" onClick={fetchProducts}>Try Again</button>
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">🔍</span>
                <h3>No products found</h3>
                <p>Try adjusting your search or filters.</p>
                <button className="btn btn--primary" onClick={handleClearFilters}>Clear Filters</button>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Products;
