import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAddresses, addAddress, deleteAddress } from '../services/authService';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newAddr, setNewAddr] = useState({
    fullName: user?.name || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    landmark: '',
    isDefault: false,
  });

  const fetchUserAddresses = async () => {
    try {
      const { data } = await getAddresses();
      setAddresses(data.addresses || []);
    } catch {
      // silent fail
    }
  };

  useEffect(() => {
    fetchUserAddresses();
  }, []);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddr.fullName || !newAddr.phone || !newAddr.address || !newAddr.city || !newAddr.state || !newAddr.postalCode) {
      toast.error('Please fill in all required address fields');
      return;
    }

    setLoading(true);
    try {
      const { data } = await addAddress(newAddr);
      setAddresses(data.addresses);
      toast.success('Address saved successfully!');
      setShowAddModal(false);
      setNewAddr({ fullName: user?.name || '', phone: '', address: '', city: '', state: '', postalCode: '', landmark: '', isDefault: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      const { data } = await deleteAddress(id);
      setAddresses(data.addresses);
      toast.success('Address removed');
    } catch {
      toast.error('Failed to delete address');
    }
  };

  return (
    <div className="profile-page">
      <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
        <div className="profile-header">
          <div className="profile-avatar">👤</div>
          <div>
            <h1 className="page-title">{user?.name}</h1>
            <p className="page-subtitle">{user?.email} • {user?.role === 'admin' ? '🛡 Administrator' : 'Customer Account'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Personal Info
          </button>
          <button
            className={`profile-tab ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            📍 Saved Addresses ({addresses.length})
          </button>
          <Link to="/my-orders" className="profile-tab">
            📦 My Orders
          </Link>
          <Link to="/wishlist" className="profile-tab">
            ❤️ My Wishlist
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="profile-tab profile-tab--admin">
              🛡 Admin Dashboard
            </Link>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="profile-card">
            <h2 className="section-title">Account Details</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Full Name</span>
                <span className="info-value">{user?.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email Address</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Account Role</span>
                <span className="info-value">{user?.role === 'admin' ? 'Administrator' : 'Standard Customer'}</span>
              </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <button className="btn btn--outline" onClick={logout}>Logout Account</button>
            </div>
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="profile-card">
            <div className="section-header-row">
              <h2 className="section-title">Saved Shipping Addresses</h2>
              <button className="btn btn--primary btn--sm" onClick={() => setShowAddModal(true)}>
                + Add New Address
              </button>
            </div>

            {showAddModal && (
              <form onSubmit={handleAddAddress} className="add-address-form">
                <h3>Add New Address</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" className="input" value={newAddr.fullName} onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input type="tel" className="input" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Street Address *</label>
                  <input type="text" className="input" value={newAddr.address} onChange={(e) => setNewAddr({ ...newAddr, address: e.target.value })} required />
                </div>
                <div className="form-row form-row--3">
                  <div className="form-group">
                    <label>City *</label>
                    <input type="text" className="input" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <input type="text" className="input" value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Postal Code *</label>
                    <input type="text" className="input" value={newAddr.postalCode} onChange={(e) => setNewAddr({ ...newAddr, postalCode: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Landmark (Optional)</label>
                  <input type="text" className="input" value={newAddr.landmark} onChange={(e) => setNewAddr({ ...newAddr, landmark: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn--primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Address'}
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {addresses.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', padding: '2rem 0' }}>
                No saved addresses yet. Add one to speed up checkout!
              </p>
            ) : (
              <div className="address-grid">
                {addresses.map((a) => (
                  <div key={a._id} className={`address-card ${a.isDefault ? 'default' : ''}`}>
                    {a.isDefault && <span className="address-badge">Default Address</span>}
                    <h4 className="address-name">{a.fullName}</h4>
                    <p className="address-line">{a.address}</p>
                    <p className="address-line">{a.city}, {a.state} - {a.postalCode}</p>
                    {a.landmark && <p className="address-line">Landmark: {a.landmark}</p>}
                    <p className="address-phone">📞 {a.phone}</p>
                    <button className="btn btn--ghost btn--sm" onClick={() => handleDeleteAddress(a._id)} style={{ marginTop: '0.75rem', color: 'var(--red)' }}>
                      🗑 Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
