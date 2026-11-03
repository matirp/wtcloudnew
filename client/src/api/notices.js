import api from './axios';
export const noticeAPI = {
  list:   (all = false) => api.get('/notices', { params: all ? { all: 'true' } : {} }),
  create: (data)        => api.post('/notices', data),
  update: (id, data)    => api.put(`/notices/${id}`, data),
  remove: (id)          => api.delete(`/notices/${id}`),
};
