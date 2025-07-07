// frontend/src/api.ts
import axios from 'axios';
// CHANGE THIS IMPORT:
// Before: import type { AxiosRequestConfig } from 'axios';
// After:
import type { InternalAxiosRequestConfig } from 'axios'; // NEW: Import InternalAxiosRequestConfig
import { auth } from './firebase';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  console.log("Axios Interceptor: Request URL:", (config.baseURL || '') + (config.url || ''));
  console.log("Axios Interceptor: Request method:", config.method);

  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken(true); // Get fresh ID token (force refresh)
      console.log("Axios Interceptor: Successfully fetched ID Token.");
      console.log("Axios Interceptor: ID Token starts with:", idToken.substring(0, 30), "...");

      // It's good practice to ensure config.params exists before spreading
      config.params = { ...(config.params || {}), token: idToken }; 
      console.log("Axios Interceptor: Request params:", config.params);

    } catch (error) {
      console.error("Axios Interceptor: Error getting Firebase ID token:", error);
    }
  } else {
    console.log("Axios Interceptor: No current user, skipping token");
  }
  return config;
}, (error) => {
  console.error("Axios Interceptor: Request error:", error);
  return Promise.reject(error);
});

// Response Interceptor: Log responses for debugging
api.interceptors.response.use(
  (response) => {
    console.log("Axios Response Interceptor: Success response:", {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error("Axios Response Interceptor: Error response:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default api;