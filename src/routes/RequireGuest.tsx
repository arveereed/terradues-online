import { Navigate, Outlet } from "react-router-dom";

type Props = {
  isGuest: boolean;
  redirectTo?: string;
};

export default function RequireGuest({ isGuest, redirectTo = "/" }: Props) {
  if (!isGuest) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
