import axios from "axios";

// Create a reusable Axios instance pointing to your Node.js backend
const API = axios.create({
  //baseURL: "https://bitecheck-api.loca.lt/api", // Make sure this is your current backend URL
  baseURL: "http://192.168.1.15:5000/api",
});

// Automatically inject your JWT "digital ID card" token into headers if it exists
API.interceptors.request.use(
  (config) => {
    const userSession = localStorage.getItem("bitecheck_user");
    if (userSession) {
      const { token } = JSON.parse(userSession);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default API;
