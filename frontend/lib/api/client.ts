import axios from "axios";
import { AuthStorage } from "@/lib/auth/auth-storage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = AuthStorage.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // The instance-level default Content-Type ("application/json") sticks
    // even for FormData bodies (file uploads), which sends the wrong
    // content type and the browser never gets to set its own multipart
    // boundary. Strip it here so the browser can set the correct
    // "multipart/form-data; boundary=..." header itself.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AuthStorage.clear();

      // Redirect to login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
