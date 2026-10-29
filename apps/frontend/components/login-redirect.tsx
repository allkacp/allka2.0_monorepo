import { Navigate, useLocation } from "react-router-dom";
import { loginUrlFor } from "@/lib/login-return";

export function LoginRedirect() {
  const location = useLocation();
  return <Navigate to={loginUrlFor(location)} replace />;
}

export function LoginAliasRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
}
