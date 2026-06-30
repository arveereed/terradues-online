import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import SettingsSectionShell from "../settings/SettingsSectionShell";
import { useFirestoreUser } from "../../features/auth/hooks/useFirestoreUser";
import { createProblemReport } from "../../features/auth/services/auth.service";

export default function ReportProblemSection() {
  const { user: clerkUser } = useUser();
  const { data: user } = useFirestoreUser(clerkUser?.id);

  const [category, setCategory] = useState("Account");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!clerkUser?.id) {
        throw new Error("You must be logged in to submit a report.");
      }

      if (!message.trim()) {
        throw new Error("Please describe the issue first.");
      }

      return createProblemReport({
        userId: clerkUser.id,
        name: user?.fullName || clerkUser.fullName || "Unknown User",
        email:
          user?.email ||
          clerkUser.primaryEmailAddress?.emailAddress ||
          "No email",
        category,
        message: message.trim(),
      });
    },
    onSuccess: () => {
      setSuccess("Your report has been submitted successfully.");
      setMessage("");
      setCategory("Account");
    },
  });

  return (
    <SettingsSectionShell
      title="Report a Problem"
      subtitle="Tell us what happened so we can help."
    >
      <select
        value={category}
        onChange={(e) => {
          setSuccess("");
          setCategory(e.target.value);
        }}
        className="mb-4 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="Account">Account</option>
        <option value="Payment">Payment</option>
        <option value="Notification">Notification</option>
        <option value="Bug">Bug</option>
        <option value="Other">Other</option>
      </select>

      <textarea
        rows={6}
        value={message}
        onChange={(e) => {
          setSuccess("");
          setMessage(e.target.value);
        }}
        placeholder="Describe the issue..."
        className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {success ? (
        <p className="mt-4 text-sm font-semibold text-emerald-700">{success}</p>
      ) : null}

      {mutation.error ? (
        <p className="mt-4 text-sm font-semibold text-red-600">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Failed to submit report."}
        </p>
      ) : null}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-6 cursor-pointer rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {mutation.isPending ? "Submitting..." : "Submit Report"}
      </button>
    </SettingsSectionShell>
  );
}
