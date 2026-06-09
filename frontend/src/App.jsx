import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import Scanner from "./pages/Scanner";
import History from "./pages/History";
import { ToastContainer } from "react-toastify";
import AddDish from './pages/AddDish'
import EditProfile from "./pages/EditProfile";
import ManageDishes from "./pages/ManageDishes";
import ManageFamily from "./pages/ManageFamily";
import SafeGroceryList from "./pages/SafeGroceryList";

function App() {
  return (
    <AuthProvider>
      <ToastContainer position="top-right" theme="dark" />
      <Routes>
        {/* Default route redirects to Login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Private Routes (Must be logged in to see) */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* 2. Add the Scanner as a Private Route */}
        <Route
          path="/scan"
          element={
            <PrivateRoute>
              <Scanner />
            </PrivateRoute>
          }
        />

        {/* 3. Add the History as a Private Route */}
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <History />
            </PrivateRoute>
          }
        />

        {/* 4. Add the AddDish as a Private Route */}
        <Route
          path="/add-dish"
          element={
            <PrivateRoute>
              <AddDish />
            </PrivateRoute>
          }
        />

        {/* 5. Add the ManageDishes as a Private Route */}
        <Route
          path="/manage-dishes"
          element={
            <PrivateRoute>
              <ManageDishes />
            </PrivateRoute>
          }
        />

        {/* 6.  Add the EditProfile as a private route */}
        <Route path="/edit-profile" element={<EditProfile />} />

        {/* 7.  Add the family memeber profiles */}
        <Route path="/manage-family" element={<ManageFamily />} />

        {/* 7.  List of safe grocery foods */}
        <Route path="/grocery-list" element={<SafeGroceryList />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
