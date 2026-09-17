import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAdminStats, getAdminOrders, updateOrderStatus, createAdminProduct, updateAdminProduct, deleteAdminProduct, uploadImage } from '../services/adminService';
import { getProducts } from '../services/productService';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/formatCurrency';

const INITIAL_PROD_FORM = {
  name: '', description: '', price: '', originalPrice: '', discountPercent: 0, image: '', category: 'Electronics', stock: 10
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Stats
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);

  // Products
  const [products, setProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [prodForm, setProdForm] = useState(INITIAL_PROD_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Orders
  const [orders, setOrders] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Confirmed');

  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [statsRes, ordersRes, prodRes] = await Promise.all([
          getAdminStats(),
          getAdminOrders(),
          getProducts({}),
        ]);
        setStats(statsRes.data.stats);
        setLowStock(statsRes.data.lowStockProducts || []);
        setOrders(ordersRes.data.orders || []);
        setProducts(prodRes.data.products || []);
      }
    } catch (err) {
      console.error('Fetch admin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div className="empty-state">
          <span style={{ fontSize: '5rem' }}>🛡</span>
          <h2 className="page-title">Admin Access Required</h2>
          <p className="page-subtitle">Your user role standard account does not have administrator privileges.</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            To grant admin access for testing, set <code>role: 'admin'</code> in MongoDB for your user document.
          </p>
        </div>
      </div>
    );
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodForm.name || !prodForm.description || !prodForm.price || !prodForm.image || !prodForm.category) {
      toast.error('Please fill in all required product fields');
      return;
    }

    try {
      if (editingProductId) {
        await updateAdminProduct(editingProductId, prodForm);
        toast.success('Product updated successfully!');
      } else {
        await createAdminProduct(prodForm);
        toast.success('New product created!');
      }
      setShowProductModal(false);
      setEditingProductId(null);
      setProdForm(INITIAL_PROD_FORM);
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    
    setUploadingImage(true);
    try {
      const { data } = await uploadImage(formData);
      setProdForm((prev) => ({ ...prev, image: data.imageUrl }));
      toast.success('Image uploaded to Cloudinary');
    } catch (err) {
      toast.error('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditClick = (p) => {
    setEditingProductId(p._id);
    setProdForm({
      name: p.name,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice || '',
      discountPercent: p.discountPercent || 0,
      image: p.image,
      category: p.category,
      stock: p.stock,
    });
    setShowProductModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteAdminProduct(id);
      toast.success('Product deleted');
      fetchDashboardData();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleUpdateStatus = async (orderId) => {
    try {
      await updateOrderStatus(orderId, { status: selectedStatus });
      toast.success(`Order status updated to ${selectedStatus}`);
      setUpdatingOrderId(null);
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
        <div className="admin-header">
          <div>
            <h1 className="page-title">🛡 Admin Dashboard</h1>
            <p className="page-subtitle">ShopNow System Administration & Operations Control</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            📊 Overview Stats
          </button>
          <button className={`profile-tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            📦 Products ({products.length})
          </button>
          <button className={`profile-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            📑 Customer Orders ({orders.length})
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Admin Panel...</div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div>
                <div className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <span className="admin-stat-icon">💰</span>
                    <div>
                      <span className="admin-stat-value">{stats?.totalSales ? formatINR(stats.totalSales) : formatINR(0)}</span>
                      <span className="admin-stat-label">Total Revenue</span>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-icon">📑</span>
                    <div>
                      <span className="admin-stat-value">{stats?.totalOrders || 0}</span>
                      <span className="admin-stat-label">Total Orders</span>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-icon">👥</span>
                    <div>
                      <span className="admin-stat-value">{stats?.totalUsers || 0}</span>
                      <span className="admin-stat-label">Total Registered Users</span>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-icon">⚠️</span>
                    <div>
                      <span className="admin-stat-value">{stats?.lowStockCount || 0}</span>
                      <span className="admin-stat-label">Low Stock Alerts</span>
                    </div>
                  </div>
                </div>

                {/* Low Stock Alert Table */}
                {lowStock.length > 0 && (
                  <div className="profile-card" style={{ marginTop: '2rem' }}>
                    <h3 className="section-title">⚠️ Low Stock Inventory Alert</h3>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStock.map((p) => (
                          <tr key={p._id}>
                            <td><strong>{p.name}</strong></td>
                            <td>{p.category}</td>
                            <td>{formatINR(p.price)}</td>
                            <td><span className="badge badge--red">{p.stock} units left</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div className="profile-card">
                <div className="section-header-row">
                  <h3 className="section-title">Catalog Product Management</h3>
                  <button className="btn btn--primary btn--sm" onClick={() => { setEditingProductId(null); setProdForm(INITIAL_PROD_FORM); setShowProductModal(true); }}>
                    + Create New Product
                  </button>
                </div>

                {showProductModal && (
                  <form onSubmit={handleSaveProduct} className="add-address-form" style={{ marginBottom: '2rem' }}>
                    <h3>{editingProductId ? 'Edit Product' : 'Add New Product'}</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Product Name *</label>
                        <input type="text" className="input" value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Category *</label>
                        <select className="input" value={prodForm.category} onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}>
                          <option value="Electronics">Electronics</option>
                          <option value="Footwear">Footwear</option>
                          <option value="Clothing">Clothing</option>
                          <option value="Accessories">Accessories</option>
                          <option value="Kitchen">Kitchen</option>
                          <option value="Sports">Sports</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row form-row--3">
                      <div className="form-group">
                        <label>Price (₹) *</label>
                        <input type="number" step="0.01" className="input" value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: parseFloat(e.target.value) })} required />
                      </div>
                      <div className="form-group">
                        <label>Original Price (₹)</label>
                        <input type="number" step="0.01" className="input" value={prodForm.originalPrice} onChange={(e) => setProdForm({ ...prodForm, originalPrice: parseFloat(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label>Stock Count *</label>
                        <input type="number" className="input" value={prodForm.stock} onChange={(e) => setProdForm({ ...prodForm, stock: parseInt(e.target.value, 10) })} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Product Image *</label>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input type="file" accept="image/*" className="input" onChange={handleImageUpload} disabled={uploadingImage} style={{ flex: 1 }} />
                        {uploadingImage && <span className="text-muted">Uploading...</span>}
                      </div>
                      {prodForm.image && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <img src={prodForm.image} alt="Preview" style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: 4 }} />
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Description *</label>
                      <textarea className="input" rows={3} value={prodForm.description} onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} required />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn--primary">Save Product</button>
                      <button type="button" className="btn btn--ghost" onClick={() => setShowProductModal(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <img src={p.image} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                          </td>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.category}</td>
                          <td>{formatINR(p.price)}</td>
                          <td>{p.stock <= 5 ? <span className="badge badge--red">{p.stock}</span> : <span className="badge badge--green">{p.stock}</span>}</td>
                          <td>
                            <button className="btn btn--ghost btn--sm" onClick={() => handleEditClick(p)}>✏️ Edit</button>
                            <button className="btn btn--ghost btn--sm" onClick={() => handleDeleteClick(p._id)} style={{ color: 'var(--red)' }}>🗑 Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="profile-card">
                <h3 className="section-title">Customer Orders Management</h3>
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status Timeline</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o._id}>
                          <td><code>{o._id.substring(0, 8)}...</code></td>
                          <td>{o.user?.name || 'Customer'}<br /><span className="text-muted">{o.user?.email}</span></td>
                          <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                          <td><strong>{formatINR(o.totalAmount)}</strong></td>
                          <td><span className="badge badge--indigo">{o.paymentMethod || 'COD'}</span></td>
                          <td>
                            <span className={`badge ${o.status === 'Delivered' ? 'badge--green' : o.status === 'Cancelled' ? 'badge--red' : 'badge--amber'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td>
                            {updatingOrderId === o._id ? (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select className="input input--sm" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                                  <option value="Pending">Pending</option>
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Shipped">Shipped</option>
                                  <option value="Out for Delivery">Out for Delivery</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                                <button className="btn btn--primary btn--sm" onClick={() => handleUpdateStatus(o._id)}>Save</button>
                                <button className="btn btn--ghost btn--sm" onClick={() => setUpdatingOrderId(null)}>X</button>
                              </div>
                            ) : (
                              <button className="btn btn--outline btn--sm" onClick={() => { setUpdatingOrderId(o._id); setSelectedStatus(o.status); }}>
                                Update Status
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
