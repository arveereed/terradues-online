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

function App() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { data: user, isLoading } = useFirestoreUser(clerkUser?.id as string);

  if (!isLoaded || isLoading) return <AppLoader />;

  return (
    <Routes>
      {/* Authentication */}
      <Route path="/" element={isSignedIn ? <Home /> : <OnboardScreen />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route
        path="/residency-type=homeowner"
        element={isSignedIn ? <Home /> : <SignUpOwner />}
      />
      <Route
        path="/residency-type=renter"
        element={isSignedIn ? <Home /> : <SignUpRenter />}
      />
      <Route
        path="/residency-type"
        element={isSignedIn ? <Home /> : <ResidencySelection />}
      />
    </Routes>
  );
}

export default App;
