import { Route, Routes } from "react-router-dom";
import OnboardScreen from "./pages/OnboardScreen";
import SignIn from "./pages/auth/SignIn";
import ResidencySelection from "./pages/auth/ResidencySelection";
import SignUpOwner from "./pages/auth/SignUpOwner";
import SignUpRenter from "./pages/auth/SignUpRenter";

function App() {
  return (
    <Routes>
      {/* Authentication */}
      <Route path="/" element={<OnboardScreen />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/residency-type=homeowner" element={<SignUpOwner />} />
      <Route path="/residency-type=renter" element={<SignUpRenter />} />
      <Route path="/residency-type" element={<ResidencySelection />} />
    </Routes>
  );
}

export default App;
