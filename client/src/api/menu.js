import api from './axios';
export const menuAPI = {
  get:  (date)   => api.get('/menu', { params: date ? { date } : {} }),
  week: ()       => api.get('/menu/week'),
  save: (data)   => api.put('/menu', data),
};
