// Services/commonServices.js
import client from "./httpClient";

// We extract just the `.data` from the Axios response to make component code cleaner!
const extractData = (res) => res.data;
const extractStatus = (res) => res.status;

export const apis = {
  // --- Standard Requests ---
  getRequest: (url, params = {}) => client.get(url, { params }).then(extractData),
  postRequest: (url, data) => client.post(url, data).then(extractData),
  putRequest: (url, data) => client.put(url, data).then(extractData),
  deleteRequest: (url) => client.delete(url).then(extractData),
  getByIdRequest: (url, id) => client.get(`${url}/${id}`).then(extractData),

  // --- Status-Only Requests (Returns 200, 404, etc instead of data) ---
  noTokenStatusPostRequest: (url, data) => client.post(url, data).then(extractStatus).catch(err => err.response?.status),
  noTokenStatusPutRequest: (url, data) => client.put(url, data).then(extractStatus).catch(err => err.response?.status),
  noTokenStatusDeleteRequest: (url, id) => client.delete(`${url}/${id}`).then(extractStatus).catch(err => err.response?.status),
  // --- Data Requests (No Token / Legacy Naming) ---
  noTokengetRequest: (url, params = {}) => client.get(url, { params }).then(extractData),
  noTokenPostRequest: (url, data) => client.post(url, data).then(extractData),
  
  // --- File Upload ---
  uploadFileRequest: (url, formData) => {
    return client.put(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(extractStatus);
  }
};