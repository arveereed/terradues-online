import { Route, Routes } from "react-router-dom";
import SignUp from "./pages/auth/SignUp";
import OnboardScreen from "./pages/OnboardScreen";
import SignIn from "./pages/auth/SignIn";
import ResidencySelection from "./pages/auth/ResidencySelection";

function App() {
  return (
    <div>
      <Routes>
        {/* Authentication */}
        <Route path="/" element={<OnboardScreen />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/residency-type" element={<ResidencySelection />} />
      </Routes>
    </div>
  );
}

export default App;
