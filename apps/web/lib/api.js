import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getErrorMessage(error) {
  return (
    error.response?.data?.error || error.message || "An unknown error occurred"
  );
}
