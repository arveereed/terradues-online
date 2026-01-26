export default function AppLoader() {
  return (
    <div className="min-h-screen w-full grid place-items-center bg-white">
      <div className="flex flex-col items-center gap-2">
        {/* Spinner */}
        <div>
          <span className="loading loading-dots text-green-600 loading-xl"></span>
        </div>
        {/* Subtext */}
        <div className="text-xs text-gray-400">Please wait a moment</div>
      </div>
    </div>
  );
}
