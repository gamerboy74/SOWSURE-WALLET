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

  return isAuthenticated && (!userTypeRequired || userType === userTypeRequired) ? (
    element
  ) : (
    <Navigate to="/farmer/login" />
  );
};

export default ProtectedRoute;