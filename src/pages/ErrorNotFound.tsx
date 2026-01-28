import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function ErrorNotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-white to-gray-50 px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-4 grid size-14 place-items-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={28} />
        </div>

        {/* Title */}
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
          404
        </h1>

        {/* Message */}
        <p className="mt-2 text-base text-gray-600">
          Sorry, the page you’re looking for doesn’t exist or was moved.
        </p>

        {/* Action */}
        <Link
          to="/"
          className="mt-6 inline-block transition-all rounded-full bg-green-700 px-6 py-2 text-white hover:bg-green-800"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
