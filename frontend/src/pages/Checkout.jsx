import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/orderService';
import { getAddresses } from '../services/authService';
import { validateCoupon } from '../services/couponService';
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/paymentService';
import { formatINR } from '../utils/formatCurrency';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';

const INITIAL_SHIPPING = {
  fullName: '', phone: '', address: '', city: '', state: '', postalCode: '', landmark: '',
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [shipping, setShipping] = useState({ ...INITIAL_SHIPPING, fullName: user?.name || '' });
  const [selectedAddrId, setSelectedAddrId] = useState('new');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Coupon State
  const initialCoupon = location.state?.appliedCoupon || null;
  const [couponCode, setCouponCode] = useState(initialCoupon ? initialCoupon.code : '');
  const [appliedCoupon, setAppliedCoupon] = useState(initialCoupon);
  const [isApplying, setIsApplying] = useState(false);
  
  // Pincode State
  const [pincodeStatus, setPincodeStatus] = useState(null);

  // Load Razorpay Script dynamically
  useEffect(() => {
    const loadRazorpay = () => {
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
      }
    };
    loadRazorpay();
  }, []);

  useEffect(() => {
    const fetchUserAddresses = async () => {
      try {
        const { data } = await getAddresses();
        const addrs = data.addresses || [];
        setSavedAddresses(addrs);
        if (addrs.length > 0) {
          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
          setSelectedAddrId(defaultAddr._id);
          setShipping({
            fullName: defaultAddr.fullName,
            phone: defaultAddr.phone,
            address: defaultAddr.address,
            city: defaultAddr.city,
            state: defaultAddr.state,
            postalCode: defaultAddr.postalCode,
            landmark: defaultAddr.landmark || '',
          });
        }
      } catch {
        // silent fail
      }
    };
    fetchUserAddresses();
  }, [user]);

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddrId(addr._id);
    setShipping({
      fullName: addr.fullName,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      landmark: addr.landmark || '',
    });
    setErrors({});
    setPincodeStatus(null);
  };

  const handleSelectNewAddress = () => {
    setSelectedAddrId('new');
    setShipping({ ...INITIAL_SHIPPING, fullName: user?.name || '' });
    setErrors({});
    setPincodeStatus(null);
  };
  
  const handleCheckPincode = (e) => {
    e.preventDefault();
    if (!shipping.postalCode || shipping.postalCode.length !== 6) {
      toast.error('Enter a valid 6-digit Indian Pincode');
      return;
    }
    // Demo delivery checker logic
    setPincodeStatus('checking');
    setTimeout(() => {
      setPincodeStatus('available');
    }, 1000);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setIsApplying(true);
    try {
      const data = await validateCoupon(couponCode, cartTotal);
      setAppliedCoupon(data);
      toast.success('Coupon applied successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('Coupon removed');
  };

  const validate = () => {
    const errs = {};
    if (!shipping.fullName.trim()) errs.fullName = 'Full name is required';
    if (!shipping.phone.trim() || !/^\+?[\d\s-]{10,15}$/.test(shipping.phone.trim())) errs.phone = 'Enter a valid phone number';
    if (!shipping.address.trim()) errs.address = 'Address is required';
    if (!shipping.city.trim()) errs.city = 'City is required';
    if (!shipping.state.trim()) errs.state = 'State is required';
    if (!shipping.postalCode.trim() || shipping.postalCode.length !== 6) errs.postalCode = 'Enter a valid 6-digit Pincode';
    return errs;
  };

  const handleChange = (e) => {
    setShipping((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    if (e.target.name === 'postalCode') {
      setPincodeStatus(null);
    }
  };

  const discountAmount = appliedCoupon?.discountAmount || 0;
  const shippingFee = cartTotal > 499 ? 0 : 50;
  const estimatedTax = (cartTotal - discountAmount) * 0.18; // 18% GST Demo
  const grandTotal = cartTotal - discountAmount + shippingFee + estimatedTax;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      // 1. Create the pending order in our database first
      const orderData = {
        items: cartItems.map((item) => ({ product: item._id, quantity: item.quantity })),
        shippingAddress: shipping,
        paymentMethod,
        totalAmount: grandTotal,
        paymentStatus: 'Pending'
      };
      
      const { data: orderRes } = await createOrder(orderData);
      const createdOrder = orderRes.order;

      // 2. If COD, we are done
      if (paymentMethod === 'COD') {
        clearCart();
        toast.success('Order placed successfully!');
        navigate(`/order-confirmation/${createdOrder._id}`, { state: { order: createdOrder } });
        setLoading(false);
        return;
      }

      // 3. For online payments, initiate Razorpay
      const { data: rzpOrder } = await createRazorpayOrder({
        amount: grandTotal,
        currency: 'INR',
        receipt: `receipt_${createdOrder._id}`
      });

      const options = {
        key: 'rzp_test_replace_me', // Replace with real key in .env for backend, but we need it in frontend too. For now we use the test key
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'ShopNow India',
        description: 'Order Payment',
        order_id: rzpOrder.id,
        handler: async function (response) {
          try {
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: createdOrder._id
            });
            clearCart();
            toast.success('Payment successful & Order placed!');
            navigate(`/order-confirmation/${createdOrder._id}`, { state: { order: createdOrder } });
          } catch (err) {
            toast.error('Payment verification failed.');
            // Navigate to orders page so they can retry payment later
            navigate('/profile');
          }
        },
        prefill: {
          name: shipping.fullName,
          email: user?.email || '',
          contact: shipping.phone
        },
        theme: {
          color: '#2563eb'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error('Payment failed: ' + response.error.description);
      });
      rzp.open();
      
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to place order. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
        <h1 className="page-title">Checkout</h1>
        <p className="page-subtitle">Complete your purchase safely</p>

        <div className="checkout-layout">
          {/* Shipping Form & Address Selector */}
          <form onSubmit={handlePlaceOrder} className="checkout-form" noValidate>
            {/* Saved Addresses Picker */}
            {savedAddresses.length > 0 && (
              <div className="form-section">
                <h2 className="form-section__title">📍 Saved Delivery Addresses</h2>
                <div className="address-picker-grid">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr._id}
                      className={`address-picker-card ${selectedAddrId === addr._id ? 'selected' : ''}`}
                      onClick={() => handleSelectSavedAddress(addr)}
                    >
                      <input type="radio" name="addressChoice" checked={selectedAddrId === addr._id} readOnly />
                      <div>
                        <strong>{addr.fullName}</strong>
                        <p>{addr.address}, {addr.city}, {addr.state} - {addr.postalCode}</p>
                        <span className="text-muted">📞 {addr.phone}</span>
                      </div>
                    </div>
                  ))}
                  <div
                    className={`address-picker-card ${selectedAddrId === 'new' ? 'selected' : ''}`}
                    onClick={handleSelectNewAddress}
                  >
                    <input type="radio" name="addressChoice" checked={selectedAddrId === 'new'} readOnly />
                    <div>
                      <strong>+ Enter New Address</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-section">
              <h2 className="form-section__title">📦 Shipping Address Details</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="checkout-fullname" className="form-label">Full Name *</label>
                  <input id="checkout-fullname" type="text" name="fullName" value={shipping.fullName} onChange={handleChange} className={`input ${errors.fullName ? 'input--error' : ''}`} placeholder="John Doe" />
                  {errors.fullName && <span className="form-error">{errors.fullName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-phone" className="form-label">Phone Number *</label>
                  <input id="checkout-phone" type="tel" name="phone" value={shipping.phone} onChange={handleChange} className={`input ${errors.phone ? 'input--error' : ''}`} placeholder="9876543210" />
                  {errors.phone && <span className="form-error">{errors.phone}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="checkout-address" className="form-label">House/Flat/Street Address *</label>
                <input id="checkout-address" type="text" name="address" value={shipping.address} onChange={handleChange} className={`input ${errors.address ? 'input--error' : ''}`} placeholder="123 Main Street, Apt 4B" />
                {errors.address && <span className="form-error">{errors.address}</span>}
              </div>

              <div className="form-row form-row--3">
                <div className="form-group">
                  <label htmlFor="checkout-city" className="form-label">City *</label>
                  <input id="checkout-city" type="text" name="city" value={shipping.city} onChange={handleChange} className={`input ${errors.city ? 'input--error' : ''}`} placeholder="Mumbai" />
                  {errors.city && <span className="form-error">{errors.city}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-state" className="form-label">State *</label>
                  <input id="checkout-state" type="text" name="state" value={shipping.state} onChange={handleChange} className={`input ${errors.state ? 'input--error' : ''}`} placeholder="Maharashtra" />
                  {errors.state && <span className="form-error">{errors.state}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-postal" className="form-label">Pincode *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input id="checkout-postal" type="text" name="postalCode" value={shipping.postalCode} onChange={handleChange} className={`input ${errors.postalCode ? 'input--error' : ''}`} placeholder="400001" maxLength="6" style={{ flex: 1 }} />
                    <button className="btn btn--outline" onClick={handleCheckPincode}>Check</button>
                  </div>
                  {errors.postalCode && <span className="form-error" style={{ display: 'block', marginTop: '0.25rem' }}>{errors.postalCode}</span>}
                  {pincodeStatus === 'checking' && <span className="text-muted" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.85rem' }}>Checking...</span>}
                  {pincodeStatus === 'available' && <span className="text-green" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.85rem' }}>✅ Delivery available for {shipping.postalCode}</span>}
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="form-section">
              <h2 className="form-section__title">💳 Payment Method</h2>
              <div className="payment-options-grid">
                {[
                  { id: 'COD', title: '💵 Cash on Delivery', desc: 'Pay when your order arrives at your doorstep' },
                  { id: 'UPI', title: '📱 Instant UPI Pay', desc: 'Pay via GPay, PhonePe, Paytm' },
                  { id: 'Card', title: '💳 Credit / Debit Card', desc: 'Visa, MasterCard, RuPay' },
                  { id: 'NetBanking', title: '🏦 Net Banking', desc: 'Direct online bank transfer' },
                ].map((pm) => (
                  <div
                    key={pm.id}
                    className={`payment-option-card ${paymentMethod === pm.id ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod(pm.id)}
                  >
                    <input type="radio" name="paymentMethod" checked={paymentMethod === pm.id} readOnly />
                    <div>
                      <strong>{pm.title}</strong>
                      <p>{pm.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--full btn--lg"
              disabled={loading}
              id="place-order-btn"
            >
              {loading ? <><span className="btn-spinner" /> Processing Order...</> : `🎉 Place Order (${formatINR(grandTotal)})`}
            </button>
          </form>

          {/* Order Summary */}
          <div className="checkout-summary">
            <h2 className="cart-summary__title">Order Summary</h2>
            <div className="checkout-summary__items">
              {cartItems.map((item) => (
                <div key={item._id} className="checkout-summary__item">
                  <img src={item.image} alt={item.name} className="checkout-summary__img"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/60x60?text=IMG'; }} />
                  <div className="checkout-summary__item-info">
                    <span className="checkout-summary__item-name">{item.name}</span>
                    <span className="checkout-summary__item-qty">Qty: {item.quantity}</span>
                  </div>
                  <span className="checkout-summary__item-price">{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div className="cart-summary__divider" />
            
            <div className="coupon-section" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-50)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>Apply Coupon</h3>
              {!appliedCoupon ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter code (e.g. WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    style={{ flex: 1, textTransform: 'uppercase' }}
                  />
                  <button 
                    className="btn btn--outline" 
                    onClick={handleApplyCoupon}
                    disabled={isApplying || !couponCode.trim()}
                  >
                    {isApplying ? '...' : 'Apply'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f2fe', padding: '0.75rem', borderRadius: '6px', border: '1px dashed #0ea5e9' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#0369a1', display: 'block' }}>{appliedCoupon.code} Applied!</span>
                    <span style={{ fontSize: '0.8rem', color: '#0284c7' }}>You saved {formatINR(discountAmount)}</span>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={handleRemoveCoupon} style={{ color: '#dc2626' }}>Remove</button>
                </div>
              )}
            </div>

            <div className="cart-summary__row">
              <span>Subtotal</span><span>{formatINR(cartTotal)}</span>
            </div>
            {appliedCoupon && (
              <div className="cart-summary__row" style={{ color: 'var(--green)' }}>
                <span>Discount ({appliedCoupon.code})</span><span>-{formatINR(discountAmount)}</span>
              </div>
            )}
            <div className="cart-summary__row">
              <span>Shipping</span><span>{shippingFee === 0 ? <span className="text-green">Free (over ₹499)</span> : formatINR(shippingFee)}</span>
            </div>
            <div className="cart-summary__row">
              <span>GST / Tax (18%)</span><span>{formatINR(estimatedTax)}</span>
            </div>
            <div className="cart-summary__divider" />
            <div className="cart-summary__total">
              <span>Grand Total</span>
              <span>{formatINR(grandTotal)}</span>
            </div>
            <div className="checkout-security">
              🔒 256-Bit Encrypted Razorpay Transaction
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;
