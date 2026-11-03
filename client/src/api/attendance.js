import api from './axios';

export const attendanceAPI = {
  checkin: (messId, mealSlot) => api.post('/attendance/checkin', { messId, mealSlot }),
  all: (params) => api.get('/attendance', { params }),
  me: () => api.get('/attendance/me'),
};
