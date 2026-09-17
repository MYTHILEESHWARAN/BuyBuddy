import api from './api';

export const getProducts = (params) => api.get('/products', { params });
export const getProductById = (id) => api.get(`/products/${id}`);
export const createProductReview = (id, reviewData) => api.post(`/products/${id}/reviews`, reviewData);
