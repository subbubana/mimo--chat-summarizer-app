// frontend/src/api.ts
import axios from 'axios';
// CHANGE THIS IMPORT:
// Before: import type { AxiosRequestConfig } from 'axios';
// After:
import type { InternalAxiosRequestConfig } from 'axios'; // NEW: Import InternalAxiosRequestConfig
import { auth } from './firebase';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Firebase ID Token to every outgoing request
// CHANGE 'config: AxiosRequestConfig' to 'config: InternalAxiosRequestConfig'
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const currentUser = auth.currentUser;
  console.log("Axios Interceptor: Current User:", currentUser ? currentUser.uid : 'None (not logged in or still loading)');

  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken(true); // Get fresh ID token (force refresh)
      console.log("Axios Interceptor: Successfully fetched ID Token.");
      console.log("Axios Interceptor: ID Token starts with:", idToken.substring(0, 30), "...");

      // It's good practice to ensure config.params exists before spreading
      config.params = { ...(config.params || {}), token: idToken }; 

    } catch (error) {
      console.error("Axios Interceptor: Error getting Firebase ID token:", error);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;