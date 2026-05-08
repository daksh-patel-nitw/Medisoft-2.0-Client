// Services/httpClient.js
import axios from 'axios';
import { toast } from "react-toastify";
import Cookies from 'js-cookie';

// 1. Create the base client
const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" }
});

// 2. Request Interceptor: Automatically attach the token if we have one
client.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  const mid = Cookies.get('mid');
  const uname = Cookies.get('uname');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (mid) config.headers.mid = mid;
    if (uname) config.headers.uname = uname;
  }
  return config;
}, (error) => Promise.reject(error));

// 3. Response Interceptor: Global Error & Toast Handling
client.interceptors.response.use(
  (response) => {
    if (response.data?.show === true) {
      toast.success(response.data.message);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      // 401 Unauthorized: Kick them out!
      if (error.response.status === 401 && window.location.pathname !== "/changepassword") {
        Cookies.remove('accessToken');
        Cookies.remove('mid');
        Cookies.remove('uname');
        
        toast.error("Session expired. Please log in again.");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        // Normal API Errors
        const msg = error.response.data?.message || error.response.statusText;
        if (error.response.data?.warn === true) {
          toast.warn(msg);
        } else {
          toast.error(`Error: ${msg}`);
        }
      }
    } else if (error.request) {
      toast.error("Network error: Unable to connect to the server.");
    } else {
      toast.error(`Unexpected error: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

export default client;