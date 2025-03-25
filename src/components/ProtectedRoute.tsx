import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReactElement } from "react";

interface ProtectedRouteProps {
  userTypeRequired?: "farmer" | "buyer";
  element: ReactElement;
  redirectTo: string;
}

const ProtectedRoute = ({ userTypeRequired, element, redirectTo }: ProtectedRouteProps): JSX.Element => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const userType = user?.user_metadata?.type as "farmer" | "buyer" | undefined;

  // Debugging logs
  console.log("ProtectedRoute - isAuthenticated:", isAuthenticated);
  console.log("ProtectedRoute - userType:", userType);
  console.log("ProtectedRoute - userTypeRequired:", userTypeRequired);
  console.log("ProtectedRoute - redirectTo:", redirectTo);

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (userTypeRequired && userType !== userTypeRequired) {
    return <Navigate to={redirectTo} replace />;
  }

  return element;
};

export default ProtectedRoute;