import axios from 'axios';

// Function to get the API base URL
const getApiBaseUrl = () => {
  // Try to get the port from the environment, fallback to 3000
  const port = import.meta.env.VITE_API_PORT || 3000;
  return `http://localhost:${port}`;
};

const API_BASE_URL = getApiBaseUrl();

export const maxiPaliClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const automercadoClient = axios.create({
  baseURL: `${API_BASE_URL}/automercado`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const masxmenosClient = axios.create({
  baseURL: `${API_BASE_URL}/masxmenos`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const priceSmartClient = axios.create({
  baseURL: `${API_BASE_URL}/pricesmart`,
  headers: {
    'Content-Type': 'application/json',
  },
}); 