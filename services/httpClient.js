import axios from 'axios';
import { toast } from "react-toastify";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ==========================================
// REUSABLE INTERCEPTOR LOGIC
// ==========================================
const applyInterceptors = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => {
      // Show success toast if backend requests it
      if (response.data?.show === true) {
        toast.success(response.data.message);
      }
      return response.data;
    },
    (error) => {
      if (error.response) {
        // --- 401 UNAUTHORIZED HANDLER ---
        if (error.response.status === 401 && window.location.pathname !== "/login") {
          localStorage.clear(); // Wipe bad session data
          toast.error(error.response.data?.message || "Session expired. Please log in again.");
          
          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);
          
          return Promise.reject(error);
        }

        // --- STANDARD ERROR HANDLER ---
        const msg = error.response.data?.message || error.response.statusText;
        if (error.response.data?.warn === true) {
          toast.warn(msg);
        } else {
          toast.error(`Error: ${msg}`);
        }
      } else if (error.request) {
        console.error("Network error: ", error.message);
        toast.error("Network error: Unable to connect to the server.");
      } else {
        console.error("Unexpected Error: ", error.message);
        toast.error(`Unexpected error: ${error.message}`);
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

// ==========================================
// 1. STANDARD CLIENT (Requires Auth / Cookies)
// ==========================================
export const client = applyInterceptors(
  axios.create({
    baseURL,
    withCredentials: true, // CRITICAL FOR HTTP-ONLY COOKIES
    headers: { "Content-Type": "application/json" }
  })
);

// ==========================================
// 2. NO-TOKEN CLIENT (Public endpoints)
// ==========================================
export const clientNoToken = applyInterceptors(
  axios.create({
    baseURL,
    withCredentials: false, 
    headers: { "Content-Type": "application/json" }
  })
);

// ==========================================
// 3. FILE UPLOAD CLIENT (Requires Auth + Multipart)
// ==========================================
export const clientFileUpload = applyInterceptors(
  axios.create({
    baseURL,
    withCredentials: true, // CRITICAL FOR HTTP-ONLY COOKIES
    headers: { "Content-Type": "multipart/form-data" }
  })
);