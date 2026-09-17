import api from './api';

export const getAdminStats = () => api.get('/admin/stats');
export const getAdminOrders = () => api.get('/admin/orders');
export const updateOrderStatus = (id, data) => api.put(`/admin/orders/${id}/status`, data);

export const createAdminProduct = (productData) => api.post('/admin/products', productData);
export const updateAdminProduct = (id, productData) => api.put(`/admin/products/${id}`, productData);
export const deleteAdminProduct = (id) => api.delete(`/admin/products/${id}`);

export const uploadImage = (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
