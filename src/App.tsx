import { Navigate, Route, Routes } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

import OnboardScreen from "./pages/auth/OnboardScreen";
import SignIn from "./pages/auth/SignIn";
import ResidencySelection from "./pages/auth/ResidencySelection";
import SignUpOwner from "./pages/auth/SignUpOwner";
import SignUpRenter from "./pages/auth/SignUpRenter";
import ForgotPassword from "./pages/auth/ForgotPassword";
import RegistrationPendingPage from "./pages/auth/RegistrationPendingPage";
import RegistrationDeniedPage from "./pages/auth/RegistrationDeniedPage";
import AccountArchivedPage from "./pages/auth/AccountArchivedPage";

import AppLoader from "./components/AppLoader";
import ErrorNotFound from "./pages/ErrorNotFound";

import RequireAuth from "./routes/RequireAuth";
import RequireGuest from "./routes/RequireGuest";

import AdminLayout from "./pages/layouts/AdminLayout";
import UserLayout from "./pages/layouts/UserLayout";

// User pages
import HomePage from "./pages/user/HomePage";
import PaymentHistoryPage from "./pages/user/PaymentHistoryPage";
import NotificationPage from "./pages/user/NotificationPage";
import SettingsPage from "./pages/user/SettingsPage";

// Admin pages
import AdminHomePage from "./pages/admin/AdminHomePage";
import AdminListOfResidentsPage from "./pages/admin/AdminListOfResidentsPage";
import AdminPaymentStatusPage from "./pages/admin/AdminPaymentStatusPage";
import AdminPaymentHistoryPage from "./pages/admin/AdminPaymentHistoryPage";
import AdminRegistrationRequestsPage from "./pages/admin/AdminRegistrationRequestsPage";
import AdminSummaryReportPage from "./pages/admin/AdminSummaryReportPage";
import AdminResidentArchivePage from "./pages/admin/AdminResidentArchivePage";

import { useFirestoreUser } from "./features/auth/hooks/useFirestoreUser";

function App() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  const { data: firestoreUser, isLoading } = useFirestoreUser(clerkUser?.id);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

  const isAdmin =
    Boolean(adminEmail) &&
    clerkUser?.emailAddresses[0]?.emailAddress === adminEmail;

  const isGuest = !isSignedIn;

  /*
   * Backward compatibility:
   *
   * Existing Firestore users created before the
   * registration approval feature may not have an
   * approvalStatus field. Those users are treated as
   * approved.
   *
   * A signed-in non-admin account without a Firestore
   * user document is treated as pending so it cannot
   * access approved resident routes.
   */
  const approvalStatus = firestoreUser
    ? (firestoreUser.approvalStatus ?? "approved")
    : "pending";

  /*
   * Archived residents remain authenticated by Clerk during
   * the 30-day archive period.
   *
   * They are blocked from normal resident routes and sent to
   * /account-archived instead.
   */
  const isArchivedUser =
    isSignedIn && !isAdmin && firestoreUser?.accountStatus === "archived";

  /*
   * Only active + approved residents can access /app.
   *
   * Existing users without accountStatus are treated as active.
   */
  const isUser =
    isSignedIn && !isAdmin && approvalStatus === "approved" && !isArchivedUser;

  const isPendingUser = isSignedIn && !isAdmin && approvalStatus === "pending";

  const isDeniedUser = isSignedIn && !isAdmin && approvalStatus === "denied";

  const isAdminUser = isSignedIn && isAdmin;

  if (!isLoaded || isLoading) {
    return <AppLoader />;
  }

  return (
    <Routes>
      {/* ROOT REDIRECT */}
      <Route
        path="/"
        element={
          isGuest ? (
            <OnboardScreen />
          ) : isAdminUser ? (
            <Navigate to="/admin" replace />
          ) : isPendingUser ? (
            <Navigate to="/registration-pending" replace />
          ) : isDeniedUser ? (
            <Navigate to="/registration-denied" replace />
          ) : isArchivedUser ? (
            <Navigate to="/account-archived" replace />
          ) : (
            <Navigate to="/app" replace />
          )
        }
      />

      {/* GUEST-ONLY AUTHENTICATION PAGES */}
      <Route element={<RequireGuest isGuest={isGuest} redirectTo="/" />}>
        <Route path="/sign-in" element={<SignIn />} />

        <Route path="/residency-type" element={<ResidencySelection />} />

        <Route path="/residency-type=homeowner" element={<SignUpOwner />} />

        <Route path="/residency-type=renter" element={<SignUpRenter />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* PENDING RESIDENT */}
      <Route element={<RequireAuth isAllowed={isPendingUser} redirectTo="/" />}>
        <Route
          path="/registration-pending"
          element={<RegistrationPendingPage />}
        />
      </Route>

      {/* DENIED RESIDENT */}
      <Route element={<RequireAuth isAllowed={isDeniedUser} redirectTo="/" />}>
        <Route
          path="/registration-denied"
          element={<RegistrationDeniedPage />}
        />
      </Route>

      {/* ARCHIVED RESIDENT */}
      <Route
        element={<RequireAuth isAllowed={isArchivedUser} redirectTo="/" />}
      >
        <Route path="/account-archived" element={<AccountArchivedPage />} />
      </Route>

      {/* APPROVED ACTIVE RESIDENT ROUTES */}
      <Route element={<RequireAuth isAllowed={isUser} redirectTo="/sign-in" />}>
        <Route path="/app" element={<UserLayout />}>
          <Route index element={<HomePage />} />

          <Route path="payment-history" element={<PaymentHistoryPage />} />

          <Route path="notification" element={<NotificationPage />} />

          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ADMIN ROUTES */}
      <Route element={<RequireAuth isAllowed={isAdminUser} redirectTo="/" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />

          <Route path="users" element={<AdminListOfResidentsPage />} />

          <Route path="users/archive" element={<AdminResidentArchivePage />} />

          <Route
            path="registration-requests"
            element={<AdminRegistrationRequestsPage />}
          />

          <Route path="payments" element={<AdminPaymentStatusPage />} />

          <Route path="payment-history" element={<AdminPaymentHistoryPage />} />

          <Route path="summary-report" element={<AdminSummaryReportPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<ErrorNotFound />} />
    </Routes>
  );
}

export default App;
