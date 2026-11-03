import api from './axios';
export const paymentAPI = {
  record:  (data)  => api.post('/payments', data),
  list:    (params) => api.get('/payments', { params }),
  summary: ()      => api.get('/payments/summary'),
  delete:  (id)    => api.delete(`/payments/${id}`),
};
