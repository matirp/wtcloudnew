import axios from 'axios';

// In dev: /api is proxied to localhost:5000 by Vite
// In production: VITE_API_URL points to the EC2/ALB endpoint
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

export default api;
