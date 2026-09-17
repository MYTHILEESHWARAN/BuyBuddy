import api from './api';

export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const verifyOtp = (data) => api.post('/auth/verify-otp', data);
export const resendOtp = (data) => api.post('/auth/resend-otp', data);
export const getSmtpStatus = () => api.get('/auth/smtp-status');
export const testSmtp = (data) => api.post('/auth/test-smtp', data);
export const getMe = () => api.get('/auth/me');

export const getAddresses = () => api.get('/auth/addresses');
export const addAddress = (data) => api.post('/auth/addresses', data);
export const deleteAddress = (id) => api.delete(`/auth/addresses/${id}`);
