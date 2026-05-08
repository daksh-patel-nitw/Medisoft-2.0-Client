import axios from 'axios';

const buildClient = ({ req }) => {
  if (typeof window === 'undefined') {
    return axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: req.headers, 
    });
  } else {
    return axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
    });
  }
};

export default buildClient;