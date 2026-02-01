import { Route, Routes, Navigate } from "react-router-dom";
import OnboardScreen from "./pages/auth/OnboardScreen";
import SignIn from "./pages/auth/SignIn";
import ResidencySelection from "./pages/auth/ResidencySelection";
import SignUpOwner from "./pages/auth/SignUpOwner";
import SignUpRenter from "./pages/auth/SignUpRenter";
import { useUser } from "@clerk/clerk-react";
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
import AdminLayout from "./pages/layouts/AdminLayout";
import UserLayout from "./pages/layouts/UserLayout";
import AdminListOfResidentsPage from "./pages/admin/AdminListOfResidentsPage";
import AdminPaymentStatusPage from "./pages/admin/AdminPaymentStatusPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminPaymenHistoryPage from "./pages/admin/AdminPaymenHistoryPage";
import AdminPaymentSummaryPage from "./pages/admin/AdminPaymentSummaryPage";
import AdminNotificationPage from "./pages/admin/AdminNotificationPage";

function App() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  const isAdmin =
    !!adminEmail && clerkUser?.emailAddresses[0].emailAddress === adminEmail;

  // Roles
  const isGuest = !isSignedIn;
  const isUser = isSignedIn && !isAdmin;
  const isAdminUser = isSignedIn && isAdmin;
  /* TODO: add Autdior role and Payment Receiver role */

  if (!isLoaded) return <AppLoader />;

  return (
    <Routes>
      {/* "/" decides where to go */}
      <Route
        path="/"
        element={
          isGuest ? (
            <OnboardScreen />
          ) : isAdminUser ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/app" replace />
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

      {/* USER routes */}
      <Route element={<RequireAuth isAllowed={isUser} redirectTo="/sign-in" />}>
        <Route path="/app" element={<UserLayout />}>
          <Route index element={<Home />} />
          <Route path="payment-history" element={<PaymentHistory />} />
          <Route path="notification" element={<NotificationPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ADMIN routes */}
      <Route element={<RequireAuth isAllowed={isAdminUser} redirectTo="/" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="users" element={<AdminListOfResidentsPage />} />
          <Route path="payments" element={<AdminPaymentStatusPage />} />
          <Route path="payment-history" element={<AdminPaymenHistoryPage />} />
          <Route path="payment-summary" element={<AdminPaymentSummaryPage />} />
          <Route path="notification" element={<AdminNotificationPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<ErrorNotFound />} />
    </Routes>
  );
}

export default App;
