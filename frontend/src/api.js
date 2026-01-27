import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
});

export const getFiles = (path = '') => api.get(`/files?path=${encodeURIComponent(path)}`);
export const createFolder = (currentPath, folderName) => api.post('/folder', { currentPath, folderName });
export const deleteItem = (path) => api.delete('/delete', { data: { path } });
export const moveItems = (sources, destination) => api.post('/move', { sources, destination });
export const uploadFiles = (formData) => api.post('/upload', formData);
export const downloadFileUrl = (path) => `/api/download?path=${encodeURIComponent(path)}`;
export const streamFileUrl = (path) => `/api/stream?path=${encodeURIComponent(path)}`;

export default api;
