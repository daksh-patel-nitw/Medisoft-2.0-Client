import { client, clientNoToken, clientFileUpload } from './httpClient';

const extractData = (res) => res.data;
const extractStatus = (res) => res.status;

export const apis = {
  // --- Standard Authenticated Requests ---
  getRequest: (url, params = {}) => client.get(url, { params }),
  postRequest: (url, data) => client.post(url, data),
  // A POST that only reads (search, lookups): same client and cookies, but no progress overlay.
  postReadRequest: (url, data) => client.post(url, data, { skipProgress: true }),
  putRequest: (url, data) => client.put(url, data),
  patchRequest: (url, data) => client.patch(url, data),
  deleteRequest: (url) => client.delete(url),
  // A DELETE whose target id travels in the body (e.g. DELETE /room/prescription).
  deleteWithBodyRequest: (url, data) => client.delete(url, { data }),

  // A GET that returns a file: resolves to the Blob (no toast), sent with the login cookies.
  downloadRequest: (url) => client.get(url, { responseType: 'blob' }),

  // --- No-Token Requests ---
  noTokengetRequest: (url, params = {}) => clientNoToken.get(url, { params }),
  noTokenPostRequest: (url, data) => clientNoToken.post(url, data),
  
  noTokenStatusPutRequest: (url, data) => clientNoToken.put(url, data),
  noTokenStatusDeleteRequest: (url, id) => clientNoToken.delete(`${url}/${id}`),
  noTokenStatusPostRequest: (url, data) => clientNoToken.post(url, data),

  // --- File Upload Requests ---
  uploadFileRequest: (url, formData) => clientFileUpload.post(url, formData),
  uploadFilePutRequest: (url, formData) => clientFileUpload.put(url, formData),
};