import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase/firebase";
import { useFirestoreUser } from "../../features/auth/hooks/useFirestoreUser";
import SettingsSectionShell from "../settings/SettingsSectionShell";
import {
  ShieldCheck,
  LockKeyhole,
  Trash2,
  X,
  MailPlus,
  MailCheck,
  AlertTriangle,
} from "lucide-react";

export default function SecuritySection() {
  const { user } = useUser();
  const { data: resident } = useFirestoreUser(user?.id);
  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [removeEmailId, setRemoveEmailId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeletion, setShowDeletion] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState("");
  const [reviewedAt, setReviewedAt] = useState<Date | null>(null);
  const [requestLoading, setRequestLoading] = useState(true);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    if (!resident?.id) {
      setRequestStatus(null);
      setDenialReason("");
      setReviewedAt(null);
      setRequestLoading(true);
      return;
    }
    setRequestLoading(true);
    setRequestError("");
    return onSnapshot(
      doc(db, "accountDeletionRequests", resident.id),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : null;
        setRequestStatus(data ? String(data.status ?? "") : null);
        setDenialReason(
          data?.status === "denied" ? String(data.adminReason ?? "") : "",
        );
        setReviewedAt(data?.reviewedAt?.toDate?.() ?? null);
        setRequestLoading(false);
      },
      () => {
        setRequestError(
          "Unable to check your account closure request status. Please try again later.",
        );
        setRequestLoading(false);
      },
    );
  }, [resident?.id]);

  async function addEmail() {
    if (!user || !newEmail.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const address = await user.createEmailAddress({ email: newEmail.trim() });
      await address.prepareVerification({ strategy: "email_code" });
      setVerifyingId(address.id);
      setMessage("A verification code was sent to your new email address.");
      setShowEmail(false);
      await user.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add email.");
    } finally {
      setBusy(false);
    }
  }
  async function resendVerification(id: string) {
    const address = user?.emailAddresses.find((a) => a.id === id);
    if (!address) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await address.prepareVerification({ strategy: "email_code" });
      setVerifyingId(id);
      setVerificationCode("");
      setMessage(`Verification code sent to ${address.emailAddress}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail() {
    const address = user?.emailAddresses.find((a) => a.id === verifyingId);
    if (!address) return;
    setBusy(true);
    setError("");
    try {
      const result = await address.attemptVerification({
        code: verificationCode.trim(),
      });
      if (result.verification.status !== "verified")
        throw new Error(
          "Verification is not complete. Please check your code.",
        );
      await user!.reload();
      setVerifyingId(null);
      setVerificationCode("");
      setNewEmail("");
      setMessage(
        "Email verified successfully. You can now make it your primary email.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }
  async function setPrimaryEmail(id: string) {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await user.update({ primaryEmailAddressId: id });
      await user.reload();
      setMessage("Primary email updated.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to change primary email.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeEmail(id: string) {
    const address = user?.emailAddresses.find((a) => a.id === id);
    if (!address || address.id === user?.primaryEmailAddressId) return;
    setBusy(true);
    setError("");
    try {
      await address.destroy();
      await user!.reload();
      setMessage("Secondary email removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove email.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setError("");
    setMessage("");
    if (!user || password.length < 8 || password !== confirmPassword) {
      setError(
        "Enter a password of at least 8 characters and confirm it correctly.",
      );
      return;
    }
    setBusy(true);
    try {
      await user.updatePassword({
        newPassword: password,
        ...(currentPassword ? { currentPassword } : {}),
        signOutOfOtherSessions: false,
      });
      setMessage("Password updated successfully.");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Password update failed. Reverification may be required.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestDeletion() {
    setError("");
    setMessage("");
    if (requestLoading || requestError || requestStatus === "pending") {
      setError(
        "You already have a pending account closure request, or its status could not be verified.",
      );
      return;
    }
    if (!user || !resident?.id) {
      setError("Resident account could not be verified.");
      return;
    }
    setBusy(true);
    try {
      // One request document per resident. The transaction prevents two pending
      // submissions from racing. Admin decisions may update this same document.
      const requestRef = doc(db, "accountDeletionRequests", resident.id);
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(requestRef);
        if (existing.exists() && existing.data().status === "pending") {
          throw new Error(
            "You already have a pending account closure request.",
          );
        }
        transaction.set(requestRef, {
          residentId: resident.id,
          clerkUserId: user.id,
          reason: reason.trim(),
          status: "pending",
          createdAt: serverTimestamp(),
        });
      });
      setRequestStatus("pending");
      setShowDeletion(false);
      setReason("");
      setMessage(
        "Your request has been submitted for administrator review. Your account remains active until a decision is made.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsSectionShell
      title="Login & Security"
      subtitle="Manage your TerraDues account securely."
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck size={18} /> Protected by Clerk authentication
          </div>
          <p className="mt-1">
            Account security is handled securely without opening the default
            Clerk profile modal.
          </p>
        </div>
        {message && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800"
          >
            {error}
          </p>
        )}
        <div className="rounded-2xl border border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-zinc-900">Email addresses</p>
              <p className="text-xs text-zinc-500">
                Verify, add or choose your primary login email.
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-semibold"
              onClick={() => setShowEmail((v) => !v)}
            >
              {showEmail ? "Close" : "Add email"}
            </button>
          </div>
          {user?.emailAddresses.map((address) => (
            <div
              key={address.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 p-3"
            >
              <div>
                <p className="break-all text-sm font-semibold">
                  {address.emailAddress}
                </p>
                <p className="text-xs text-zinc-500">
                  {address.id === user.primaryEmailAddressId
                    ? "Primary"
                    : address.verification.status === "verified"
                      ? "Verified"
                      : "Not verified"}
                </p>
              </div>
              {address.id !== user.primaryEmailAddressId && (
                <div className="flex gap-2">
                  {address.verification.status !== "verified" && (
                    <button
                      disabled={busy}
                      type="button"
                      onClick={() => void resendVerification(address.id)}
                      className="rounded-lg border px-2 py-1 text-xs"
                    >
                      {verifyingId === address.id
                        ? "Resend code"
                        : "Verify email"}
                    </button>
                  )}
                  {address.verification.status === "verified" && (
                    <button
                      disabled={busy}
                      type="button"
                      onClick={() => void setPrimaryEmail(address.id)}
                      className="rounded-lg border px-2 py-1 text-xs"
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => setRemoveEmailId(address.id)}
                    className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {showEmail && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !busy) setShowEmail(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-email-title"
              className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-zinc-100 bg-emerald-50/70 px-6 py-5">
                <div className="flex gap-3">
                  <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <MailPlus size={22} />
                  </span>
                  <div>
                    <h2
                      id="add-email-title"
                      className="text-lg font-bold text-zinc-900"
                    >
                      Add email address
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      Verify an additional email for your account.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  disabled={busy}
                  onClick={() => setShowEmail(false)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-white"
                >
                  <X size={19} />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <label
                  htmlFor="security-new-email"
                  className="block text-sm font-semibold text-zinc-800"
                >
                  Email address
                </label>
                <input
                  id="security-new-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <p className="text-xs text-zinc-500">
                  We'll send a verification code to this address.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowEmail(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy || !newEmail.trim()}
                    onClick={() => void addEmail()}
                    className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Sending…" : "Send verification code"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {verifyingId && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !busy) setVerifyingId(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="verify-email-title"
              className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-zinc-100 bg-emerald-50/70 px-6 py-5">
                <div className="flex gap-3">
                  <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <MailCheck size={22} />
                  </span>
                  <div>
                    <h2
                      id="verify-email-title"
                      className="text-lg font-bold text-zinc-900"
                    >
                      Verify email
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      Enter the code sent to your email.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  disabled={busy}
                  onClick={() => setVerifyingId(null)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-white"
                >
                  <X size={19} />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <label
                  htmlFor="security-email-code"
                  className="block text-sm font-semibold text-zinc-800"
                >
                  Verification code
                </label>
                <input
                  id="security-email-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm tracking-widest outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void resendVerification(verifyingId)}
                  className="text-sm font-semibold text-emerald-700 hover:underline"
                >
                  Resend code
                </button>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setVerifyingId(null)}
                    className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold"
                  >
                    Later
                  </button>
                  <button
                    type="button"
                    disabled={busy || !verificationCode.trim()}
                    onClick={() => void verifyEmail()}
                    className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Verifying…" : "Verify email"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {removeEmailId && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-email-title"
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
              <span className="inline-flex rounded-2xl bg-rose-50 p-3 text-rose-600">
                <AlertTriangle size={24} />
              </span>
              <h2
                id="remove-email-title"
                className="mt-4 text-lg font-bold text-zinc-900"
              >
                Remove email address?
              </h2>
              <p className="mt-2 break-all text-sm text-zinc-600">
                Remove{" "}
                {
                  user?.emailAddresses.find((a) => a.id === removeEmailId)
                    ?.emailAddress
                }{" "}
                from your account? You won't be able to sign in with it.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRemoveEmailId(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await removeEmail(removeEmailId);
                    setRemoveEmailId(null);
                  }}
                  className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Removing…" : "Remove email"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-zinc-900">Password</p>
              <p className="text-sm text-zinc-500">
                Update your login password
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <LockKeyhole size={15} className="mr-1 inline" /> Change
            </button>
          </div>
          {showPassword && (
            <div className="mt-4 space-y-3">
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password (if applicable)"
                className="w-full rounded-xl border border-zinc-300 p-3"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-xl border border-zinc-300 p-3"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-zinc-300 p-3"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void changePassword()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save password"}
              </button>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
          <p className="font-bold text-rose-800">Account closure</p>
          <p className="mt-1 text-sm text-zinc-600">
            Request administrator approval to archive your account. Submitting a
            request does not delete your account.
          </p>
          <button
            type="button"
            onClick={() => setShowDeletion(true)}
            disabled={
              busy ||
              requestLoading ||
              !!requestError ||
              requestStatus === "pending"
            }
            className="mt-3 rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={15} className="mr-1 inline" />{" "}
            {requestLoading
              ? "Checking request..."
              : requestStatus === "pending"
                ? "Request Pending"
                : "Request Account Deletion"}
          </button>
          {requestStatus === "pending" && (
            <p
              role="status"
              className="mt-3 text-sm font-medium text-amber-800"
            >
              You have already submitted an account closure request. It is
              awaiting administrator review, so you cannot submit another
              request.
            </p>
          )}
          {requestStatus === "denied" && (
            <div
              role="status"
              className="mt-4 rounded-2xl border border-rose-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-rose-800">
                <AlertTriangle size={18} /> Account closure request denied
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                Your account remains active. You can review the administrator's
                response below and submit a new request if needed.
              </p>
              <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                  Administrator's reason
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-800">
                  {denialReason.trim() ||
                    "No reason was recorded for this decision. Please contact your administrator."}
                </p>
                {reviewedAt && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Reviewed{" "}
                    {reviewedAt.toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
          {requestError && (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {requestError}
            </p>
          )}
        </div>
      </div>
      {showDeletion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setShowDeletion(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deletion-heading"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex justify-between gap-3">
              <h2 id="deletion-heading" className="text-lg font-bold">
                Request Account Deletion
              </h2>
              <button
                type="button"
                aria-label="Close"
                disabled={busy}
                onClick={() => setShowDeletion(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              Your request will be reviewed by an administrator. If approved,
              your resident record will be archived under the five-year
              retention policy. This action does not immediately delete your
              Clerk account.
            </p>
            <label
              htmlFor="deletion-reason"
              className="mt-4 block text-sm font-semibold"
            >
              Reason (optional)
            </label>
            <textarea
              id="deletion-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              className="mt-2 w-full rounded-xl border border-zinc-300 p-3"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowDeletion(false)}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  requestLoading ||
                  !!requestError ||
                  requestStatus === "pending"
                }
                onClick={() => void requestDeletion()}
                className="rounded-xl bg-rose-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsSectionShell>
  );
}
