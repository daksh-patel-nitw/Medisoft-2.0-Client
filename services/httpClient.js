import axios from 'axios';
import { toast } from "react-toastify";
import useApiLoadingStore from "../store/useApiLoadingStore";
import { apiBase } from "./apiBase";

const baseURL = apiBase();

// ==========================================
// REUSABLE INTERCEPTOR LOGIC
// ==========================================
// Create/update/delete calls are tracked so the global progress overlay
// (components/GlobalProgress.jsx) stays up until the server answers. Reads
// (GET) are not tracked - pages show their own skeletons for those. A POST that only
// READS (patient search, prescription lookups) passes `skipProgress: true` in its
// config (see apis.postReadRequest) so it doesn't flash the overlay on every keystroke.
const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

const applyInterceptors = (axiosInstance) => {
  axiosInstance.interceptors.request.use((config) => {
    if (MUTATING_METHODS.includes((config.method || '').toLowerCase()) && !config.skipProgress) {
      config.__tracked = true;
      useApiLoadingStore.getState().start();
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      if (response.config?.__tracked) useApiLoadingStore.getState().finish();
      // A file download: the body is the file itself, not the { data, message, show } envelope.
      if (response.config?.responseType === 'blob') return response.data;
      // Show success toast if backend requests it
      const res=response.data?.show;
      if (res !== false) {
        toast.success(response.data.message);
      }
      if(res !== 'status')
        return response.data.data;
      else
        return response.status;
    },
    (error) => {
      if (error.config?.__tracked) useApiLoadingStore.getState().finish();
      if (error.response) {
        // --- 401 UNAUTHORIZED HANDLER ---
        // Pages under /auth/ (login, first-login) are where a 401 is an
        // expected answer ("Invalid credentials"), not an expired session:
        // they fall through to the standard toast below and the user stays
        // on the page instead of being bounced to the login screen.
        if (error.response.status === 401 && !window.location.pathname.startsWith("/auth/")) {
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
        if (error.response.data?.show === 'warn') {
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