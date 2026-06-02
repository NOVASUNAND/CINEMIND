import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!token) return <Navigate to="/auth" />;

  return children;
};

export default ProtectedRoute;