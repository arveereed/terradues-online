import { useAuth } from "@clerk/clerk-react";
import { CreditCard, LoaderCircle } from "lucide-react";
import { useState } from "react";

type Props = {
  monthKey: string;
  amount: number;
  disabled?: boolean;
};

const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(".00", "");

export default function PayNowButton({
  monthKey,
  amount,
  disabled = false,
}: Props) {
  const { getToken } = useAuth();

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    if (!monthKey || amount <= 0 || paying || disabled) {
      return;
    }

    setError("");
    setPaying(true);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const apiBaseUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:3001"
      ).replace(/\/$/, "");

      const response = await fetch(
        `${apiBaseUrl}/api/payments/paymongo/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          // IMPORTANT:
          // Never send the amount from React.
          //
          // The server reads the authoritative
          // remainingBalance directly from Firestore.
          // The selected billing month already comes from PaymentHistoryPage's
          // active Firestore billing record. Do not send a browser-derived date:
          // the resident browser may not share the Admin Demo Clock localStorage.
          // The server remains authoritative for the amount and payment timestamp.
          body: JSON.stringify({ monthKey }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Unable to start payment.");
      }

      if (typeof data?.checkoutUrl !== "string" || !data.checkoutUrl) {
        throw new Error("PayMongo checkout URL was not returned.");
      }

      window.location.assign(data.checkoutUrl);
    } catch (err) {
      console.error("Unable to start PayMongo checkout:", err);

      setError(err instanceof Error ? err.message : "Unable to start payment.");

      setPaying(false);
    }
  };

  const buttonDisabled = disabled || paying || amount <= 0 || !monthKey;

  return (
    <div>
      <button
        type="button"
        onClick={handlePay}
        disabled={buttonDisabled}
        className="inline-flex h-11 w-auto whitespace-nowrap items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {paying ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <CreditCard size={18} />
        )}

        {paying ? "Opening PayMongo..." : `Pay Now ${peso(amount)}`}
      </button>

      {error ? (
        <p className="mt-2 max-w-xs text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
