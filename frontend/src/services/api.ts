import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError } from '../types/api';

/**
 * Base URL configured from environment variables.
 * In development (port 5173), defaults to local backend at 8000.
 * In production/deployment, automatically uses relative '/api/v1' on same domain.
 */
const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8000/api/v1';
  }
  return 'https://cv-project-main.onrender.com/api/v1';
};

const BASE_URL: string = getBaseUrl();

/**
 * Centralized Axios client instance for all backend requests.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor (can attach JWT auth tokens in later phases)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor (standardizes error messages)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    let normalizedError: ApiError = {
      message: 'An unexpected network error occurred.',
      statusCode: error.response?.status,
    };

    if (error.code === 'ECONNABORTED') {
      normalizedError.message = 'Request timed out while connecting to the backend server.';
    } else if (!error.response) {
      normalizedError.message = 'Backend server is unreachable. Please verify that FastAPI is running on port 8000.';
    } else if (error.response.data && typeof error.response.data === 'object') {
      const data: any = error.response.data;
      normalizedError.message = data.message || data.detail || `Server returned error ${error.response.status}`;
      normalizedError.details = JSON.stringify(data);
    }

    return Promise.reject(normalizedError);
  }
);

export default apiClient;

