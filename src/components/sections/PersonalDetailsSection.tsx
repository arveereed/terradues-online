import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AppInput from "../AppInput";
import SettingsSectionShell from "../settings/SettingsSectionShell";
import { useFirestoreUser } from "../../features/auth/hooks/useFirestoreUser";
import { updateUserProfile } from "../../features/auth/services/auth.service";

export default function PersonalDetailsSection() {
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useFirestoreUser(clerkUser?.id);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    contactNumber: "",
    gender: "",
    address: "",
    phase: "",
    block: "",
    lot: "",
  });

  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) return;

    setForm({
      firstName: user.firstName || "",
      middleName: user.middleName || "",
      lastName: user.lastName || "",
      contactNumber: user.contactNumber || "",
      gender: user.gender || "",
      address: user.address || "",
      phase: user.phase || "",
      block: user.block || "",
      lot: user.lot || "",
    });
  }, [user]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!user?.id) {
        throw new Error("User document not found.");
      }

      return updateUserProfile(user.id, form);
    },
    onSuccess: async () => {
      setSuccess("Personal details updated successfully.");
      await queryClient.invalidateQueries({
        queryKey: ["userAuth", clerkUser?.id],
      });
    },
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setSuccess("");
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <SettingsSectionShell
      title="Personal Details"
      subtitle="Update your basic information."
    >
      {isLoading ? (
        <p className="text-sm font-semibold text-zinc-500">
          Loading personal details...
        </p>
      ) : error ? (
        <p className="text-sm font-semibold text-red-600">
          Failed to load personal details.
        </p>
      ) : (
        <>
          {user?.picture ? (
            <div className="mb-5 flex items-center gap-4">
              <img
                src={user.picture}
                alt={user.fullName || "User profile"}
                className="size-16 rounded-full object-cover ring-2 ring-emerald-100"
              />
              <div>
                <p className="text-sm font-extrabold text-zinc-900">
                  {user.fullName}
                </p>
                <p className="text-xs font-semibold text-zinc-500">
                  {user.email}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AppInput
              label="First Name"
              placeholder="First Name"
              value={form.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
            />

            <AppInput
              label="Middle Name"
              placeholder="Middle Name"
              value={form.middleName}
              onChange={(e) => handleChange("middleName", e.target.value)}
            />

            <AppInput
              label="Last Name"
              placeholder="Last Name"
              value={form.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
            />

            <AppInput
              label="Contact Number"
              placeholder="Contact Number"
              value={form.contactNumber}
              onChange={(e) => handleChange("contactNumber", e.target.value)}
            />

            <AppInput
              label="Gender"
              placeholder="Gender"
              value={form.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
            />

            <AppInput
              label="Address"
              placeholder="Address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />

            <AppInput
              label="Phase"
              placeholder="Phase"
              value={form.phase}
              onChange={(e) => handleChange("phase", e.target.value)}
            />

            <AppInput
              label="Block"
              placeholder="Block"
              value={form.block}
              onChange={(e) => handleChange("block", e.target.value)}
            />

            <AppInput
              label="Lot"
              placeholder="Lot"
              value={form.lot}
              onChange={(e) => handleChange("lot", e.target.value)}
            />
          </div>

          {success ? (
            <p className="mt-4 text-sm font-semibold text-emerald-700">
              {success}
            </p>
          ) : null}

          {mutation.error ? (
            <p className="mt-4 text-sm font-semibold text-red-600">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to update personal details."}
            </p>
          ) : null}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="mt-6 cursor-pointer rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </>
      )}
    </SettingsSectionShell>
  );
}
