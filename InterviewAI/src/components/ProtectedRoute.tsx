import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { ReactElement } from "react";

type ProtectedRouteProps = {
  children: ReactElement;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <div className="p-6 text-sm text-muted-foreground">Loading authentication…</div>;
  }

  if (!isSignedIn) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search + location.hash);
    return <Navigate to={`/sign-in?redirect_url=${redirectUrl}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
