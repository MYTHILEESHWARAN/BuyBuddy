import api from './api';

export const getCoupons = async () => {
  const response = await api.get('/coupons');
  return response.data;
};

export const validateCoupon = async (code, orderAmount) => {
  const response = await api.post('/coupons/validate', { code, orderAmount });
  return response.data;
};

export default {
  getCoupons,
  validateCoupon,
};
