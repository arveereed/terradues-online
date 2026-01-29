import { Route, Routes } from "react-router-dom";
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

function App() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { data: user, isLoading } = useFirestoreUser(clerkUser?.id as string);

  const isAdmin = import.meta.env.VITE_ADMIN_EMAIL === user?.email;

  if (!isLoaded || isLoading) return <AppLoader />;

  return (
    <Routes>
      {/* Authentication */}
      <Route
        path="/"
        element={isSignedIn && !isAdmin ? <Home /> : <OnboardScreen />}
      />
      <Route
        path="/sign-in"
        element={isSignedIn && !isAdmin ? <Home /> : <SignIn />}
      />
      <Route
        path="/residency-type=homeowner"
        element={isSignedIn && !isAdmin ? <Home /> : <SignUpOwner />}
      />
      <Route
        path="/residency-type=renter"
        element={isSignedIn && !isAdmin ? <Home /> : <SignUpRenter />}
      />
      <Route
        path="/residency-type"
        element={isSignedIn && !isAdmin ? <Home /> : <ResidencySelection />}
      />
      <Route
        path="/forgot-password"
        element={isSignedIn && !isAdmin ? <Home /> : <ForgotPassword />}
      />

      {/* User Page */}
      <Route
        path="/payment-history"
        element={isSignedIn && !isAdmin ? <PaymentHistory /> : <SignIn />}
      />
      <Route
        path="/notification"
        element={isSignedIn && !isAdmin ? <NotificationPage /> : <SignIn />}
      />
      <Route
        path="/settings"
        element={isSignedIn && !isAdmin ? <SettingsPage /> : <SignIn />}
      />

      {/* Admin Page */}

      {/* 404 – MUST be last */}
      <Route path="*" element={<ErrorNotFound />} />
    </Routes>
  );
}

export default App;
