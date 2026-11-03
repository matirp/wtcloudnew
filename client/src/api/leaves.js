import api from './axios';
export const leaveAPI = {
  apply:   (data)          => api.post('/leaves', data),
  list:    (params)        => api.get('/leaves', { params }),
  approve: (id)            => api.patch(`/leaves/${id}`, { status: 'approved' }),
  reject:  (id)            => api.patch(`/leaves/${id}`, { status: 'rejected' }),
  remove:  (id)            => api.delete(`/leaves/${id}`),
};
