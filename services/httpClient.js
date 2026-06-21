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
      const res=response.data?.show;
      if (res !== false) {
        toast.success(response.data.message);
      }
      if(res !== status)
        return response.data.data;
      else
        return response.status;
    },
    (error) => {
      if (error.response) {
        // --- 401 UNAUTHORIZED HANDLER ---
        if (error.response.status === 401 && window.location.pathname !== "/auth/login") {
          localStorage.clear();
          console.log("In error: ",error,"\n");
          toast.error(error.response.data?.message || "Session expired. Please log in again.");
          
          setTimeout(() => {
            window.location.href = "/auth/login";
          }, 1000);
          
          return Promise.reject(error);
        }

        // --- STANDARD ERROR HANDLER ---
        const msg = error.response.data?.message || error.response.statusText;
        if (error.response.data?.show === warn) {
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
    withCredentials: true,
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
    withCredentials: true, 
    headers: { "Content-Type": "multipart/form-data" }
  })
);