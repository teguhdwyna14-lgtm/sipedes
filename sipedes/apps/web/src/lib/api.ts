// API client - axios instance dengan interceptor untuk JWT & error handling

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { ApiResponse } from '@sipedes/shared';
import { useAuthStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - sisipkan JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - normalisasi error & handle 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      // Token tidak valid / kedaluwarsa - logout otomatis
      const auth = useAuthStore.getState();
      if (auth.token) {
        auth.logout();
        // Redirect ke login hanya jika bukan di halaman publik
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Helper untuk unwrap response data
export async function apiCall<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise;
  if (!res.data.success) {
    throw new Error(res.data.message || 'Permintaan gagal');
  }
  return res.data.data as T;
}

// Helper untuk paginated response
export async function apiCallPaginated<T>(
  promise: Promise<{ data: ApiResponse<{ items: T[] }> }>
): Promise<{ items: T[]; meta: ApiResponse['meta'] }> {
  const res = await promise;
  return { items: res.data.data?.items ?? [], meta: res.data.meta };
}

// Helper untuk upload file
export async function uploadFile(
  url: string,
  file: File,
  fieldName = 'file',
  extraFields?: Record<string, unknown>
): Promise<unknown> {
  const formData = new FormData();
  formData.append(fieldName, file);
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      formData.append(k, String(v));
    }
  }
  const res = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
