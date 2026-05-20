import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  // If there is no user in our Global State, redirect them to the login page
  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
