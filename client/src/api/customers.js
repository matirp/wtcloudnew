import api from './axios';

export const customerAPI = {
  stats:      ()          => api.get('/customers/stats'),
  list:       (params)    => api.get('/customers', { params }),
  get:        (id)        => api.get(`/customers/${id}`),
  byMess:     (messId)    => api.get(`/customers/by-mess/${messId}`),
  create:     (data)      => api.post('/customers', data),
  update:     (id, data)  => api.put(`/customers/${id}`, data),
  renew:      (id, data)  => api.post(`/customers/${id}/renew`, data || {}),
  setFace:    (id, faceDescriptor) => api.put(`/customers/${id}/face`, { faceDescriptor }),
  deactivate: (id)        => api.delete(`/customers/${id}`),
  reactivate: (id)        => api.put(`/customers/${id}`, { active: true }),
  deleteHard: (id)        => api.delete(`/customers/${id}?hard=true`),
  faces:      ()          => api.get('/customers/faces'),
  me:         ()          => api.get('/customers/me'),
};
