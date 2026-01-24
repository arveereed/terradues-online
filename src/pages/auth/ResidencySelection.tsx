import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

type ResidencyType = "Homeowner" | "Renter" | null;

const ResidencySelection: React.FC = () => {
  const [selected, setSelected] = useState<ResidencyType>(null);
  const navigate = useNavigate();

  const handleProceed = () => {
    if (selected) {
      navigate(`/residency-type=${selected.toLowerCase()}`);
    } else {
      alert("Please select a residency type first");
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-black text-center">
          Select your residency type
        </h2>

        {/* Homeowner Button */}
        <button
          type="button"
          onClick={() => setSelected("Homeowner")}
          className={`w-full py-4 rounded-lg font-semibold text-xl md:text-2xl transition cursor-pointer
            ${
              selected === "Homeowner"
                ? "bg-green-600 shadow-lg text-white"
                : "border-2 border-gray-300 text-gray-700 hover:border-green-500"
            }`}
        >
          Homeowner
        </button>

        {/* Renter Button */}
        <button
          type="button"
          onClick={() => setSelected("Renter")}
          className={`w-full py-4 rounded-lg font-semibold text-xl md:text-2xl transition cursor-pointer
            ${
              selected === "Renter"
                ? "bg-green-600 shadow-lg text-white"
                : "border-2 border-gray-300 text-gray-700 hover:border-green-500"
            }`}
        >
          Renter
        </button>

        {/* Proceed Button */}
        <button
          type="button"
          onClick={handleProceed}
          disabled={!selected}
          className={`w-full py-4 rounded-full font-semibold text-xl md:text-2xl text-white mt-6 transition cursor-pointer
            ${
              selected
                ? "bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90"
                : "bg-gray-300 cursor-not-allowed"
            }`}
        >
          Proceed
        </button>
      </div>
    </div>
  );
};

export default ResidencySelection;
