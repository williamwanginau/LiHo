import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function getErrorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Request failed';
}

