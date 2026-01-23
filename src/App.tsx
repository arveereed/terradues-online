import { Route, Routes } from "react-router-dom";
import OnboardScreen from "./pages/OnboardScreen";
import SignIn from "./pages/auth/SignIn";
import ResidencySelection from "./pages/auth/ResidencySelection";

function App() {
  return (
    <Routes>
      {/* Authentication */}
      <Route path="/" element={<OnboardScreen />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/residency-type" element={<ResidencySelection />} />
    </Routes>
  );
}

export default App;
