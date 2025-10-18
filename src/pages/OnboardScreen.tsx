import Icon from "../assets/splashImage.png";
import { Link, useNavigate } from "react-router-dom";

export default function OnboardScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen justify-between bg-white">
      {/* Logo + Image Section */}
      <div className="flex flex-col items-center mt-24 px-4">
        <img
          src={Icon}
          alt="Welcome"
          className="w-full max-w-md h-48 object-contain fade-in"
        />

        <div className="flex gap-1 mt-4 text-4xl">
          <span className=" font-bold text-green-700">TERRA</span>
          <span className=" font-bold text-black">DUES</span>
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex flex-col items-center bg-white pt-8 pb-12 gap-6 px-6">
        {/* Headline */}
        <div className="text-center slide-up">
          <p className="text-2xl sm:text-3xl font-extrabold text-black">
            <span className="text-green-700">Track</span> Smart,
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-black">
            Grow <span className="text-green-700">Steadily</span>.
          </p>
        </div>

        {/* Get Started Button */}
        <button
          onClick={() => navigate("/residency-type")}
          className="w-full max-w-xs bg-green-700 hover:bg-green-800 text-white py-3 rounded-full text-lg font-semibold transition transform hover:scale-[1.02] slide-up delay-1 cursor-pointer"
        >
          Get Started
        </button>

        {/* Login Link */}
        <div className="flex items-center gap-1 slide-up delay-2">
          <span className="text-base text-gray-800">
            Already have an account?
          </span>
          <Link
            to="/sign-in"
            className="text-base font-bold text-green-700 hover:underline cursor-pointer"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
