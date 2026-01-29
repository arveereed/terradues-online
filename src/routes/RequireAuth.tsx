import { Navigate, Outlet, useLocation } from "react-router-dom";

type Props = {
  isAllowed: boolean | undefined;
  redirectTo?: string;
};

export default function RequireAuth({
  isAllowed,
  redirectTo = "/sign-in",
}: Props) {
  const location = useLocation();

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
