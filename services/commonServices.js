import { client, clientNoToken, clientFileUpload } from './httpClient';

const extractData = (res) => res.data;
const extractStatus = (res) => res.status;

export const apis = {
  // --- Standard Authenticated Requests ---
  getRequest: (url, params = {}) => client.get(url, { params }),
  postRequest: (url, data) => client.post(url, data),
  putRequest: (url, data) => client.put(url, data),
  patchRequest: (url, data) => client.patch(url, data),
  deleteRequest: (url) => client.delete(url),

  // --- No-Token Requests ---
  noTokengetRequest: (url, params = {}) => clientNoToken.get(url, { params }),
  noTokenPostRequest: (url, data) => clientNoToken.post(url, data),
  
  noTokenStatusPutRequest: (url, data) => clientNoToken.put(url, data),
  noTokenStatusDeleteRequest: (url, id) => clientNoToken.delete(`${url}/${id}`),
  noTokenStatusPostRequest: (url, data) => clientNoToken.post(url, data),

  // --- File Upload Requests ---
  uploadFileRequest: (url, formData) => clientFileUpload.post(url, formData),
};