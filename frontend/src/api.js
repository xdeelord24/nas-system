import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
});

export const getFiles = (path = '') => api.get(`/files?path=${encodeURIComponent(path)}`);
export const getRecentFiles = () => api.get('/recent');
export const getStarredFiles = () => api.get('/starred');
export const getTrashFiles = () => api.get('/trash');

export const toggleStar = (path, starred) => api.post('/star', { path, starred });

export const createFolder = (currentPath, folderName) => api.post('/folder', { currentPath, folderName });
export const deleteItem = (path) => api.delete('/delete', { data: { path } });
export const restoreItem = (trashId) => api.post('/restore', { trashId });
export const emptyTrash = () => api.post('/empty-trash');

export const moveItems = (sources, destination) => api.post('/move', { sources, destination });
export const uploadFiles = (formData) => api.post('/upload', formData);
export const createShareLink = (path) => api.post('/share', { path });
export const getShareInfo = (token) => api.get(`/share/info/${token}`);

export const downloadFileUrl = (path) => `/api/download?path=${encodeURIComponent(path)}`;
export const getShareDownloadUrl = (token) => `/api/share/download/${token}`;

export const streamFileUrl = (path) => `/api/stream?path=${encodeURIComponent(path)}`;

export default api;
