import { Route, Routes, Navigate } from "react-router-dom";
import OnboardScreen from "./pages/auth/OnboardScreen";
import SignIn from "./pages/auth/SignIn";
import ResidencySelection from "./pages/auth/ResidencySelection";
import SignUpOwner from "./pages/auth/SignUpOwner";
import SignUpRenter from "./pages/auth/SignUpRenter";
import { useUser } from "@clerk/clerk-react";
import { useFirestoreUser } from "./features/auth/hooks/useFirestoreUser";
import AppLoader from "./components/AppLoader";
import Home from "./pages/user/Home";
import ErrorNotFound from "./pages/ErrorNotFound";
import ForgotPassword from "./pages/auth/ForgotPassword";
import PaymentHistory from "./pages/user/PaymentHistory";
import NotificationPage from "./pages/user/NotificationPage";
import SettingsPage from "./pages/user/SettingsPage";
import AdminHomePage from "./pages/admin/AdminHomePage";

import RequireAuth from "./routes/RequireAuth";
import RequireGuest from "./routes/RequireGuest";

function App() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { data: user, isLoading } = useFirestoreUser(clerkUser?.id as string);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  const isAdmin = !!adminEmail && user?.email === adminEmail;

  const isUser = isSignedIn && !isAdmin;
  const isAdminUser = isSignedIn && isAdmin;
  const isGuest = !isSignedIn;

  if (!isLoaded || isLoading) return <AppLoader />;

  return (
    <Routes>
      {/* SINGLE "/" route that decides where to go */}
      <Route
        path="/"
        element={
          isGuest ? (
            <OnboardScreen />
          ) : isAdminUser ? (
            <Navigate to="/admin" replace />
          ) : (
            <Home />
          )
        }
      />

      {/* Guest-only auth pages */}
      <Route element={<RequireGuest isGuest={isGuest} redirectTo="/" />}>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/residency-type" element={<ResidencySelection />} />
        <Route path="/residency-type=homeowner" element={<SignUpOwner />} />
        <Route path="/residency-type=renter" element={<SignUpRenter />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Signed-in USER routes */}
      <Route element={<RequireAuth isAllowed={isUser} redirectTo="/sign-in" />}>
        <Route path="/payment-history" element={<PaymentHistory />} />
        <Route path="/notification" element={<NotificationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Signed-in ADMIN routes */}
      <Route element={<RequireAuth isAllowed={isAdminUser} redirectTo="/" />}>
        <Route path="/admin" element={<AdminHomePage />} />
      </Route>

      {/* If someone types /admin/anything */}
      <Route
        path="/admin/*"
        element={<Navigate to={isAdminUser ? "/admin" : "/"} replace />}
      />

      {/* 404 */}
      <Route path="*" element={<ErrorNotFound />} />
    </Routes>
  );
}

export default App;
