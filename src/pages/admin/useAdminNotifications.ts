import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase/firebase";

export type AdminNotice = {
  id: string;
  title?: string;
  message?: string;
  residentName?: string;
  residentId?: string;
  userId?: string;
  monthLabel?: string;
  monthKey?: string;
  amount?: number;
  paymentMethod?: string;
  paymentDate?: string;
  transactionId?: string;
  unread?: boolean;
  createdAt?: unknown;
};

type ResidentProfile = {
  id: string;
  userId?: string;
  clerkId?: string;
  clerkUserId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
};

function fullName(resident: ResidentProfile): string {
  const parts = [resident.firstName, resident.middleName, resident.lastName]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .map((part) => part.trim());
  return parts.join(" ") || resident.fullName?.trim() || "";
}

export function useAdminNotifications() {
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribeNotices = onSnapshot(
      query(collection(db, "adminNotifications"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setNotices(
          snapshot.docs.map(
            (document) =>
              ({ ...document.data(), id: document.id }) as AdminNotice,
          ),
        );
        setError("");
      },
      (err) => setError(err.message),
    );
    const unsubscribeResidents = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setResidents(
          snapshot.docs.map(
            (document) =>
              ({ ...document.data(), id: document.id }) as ResidentProfile,
          ),
        );
      },
      (err) => console.error("Unable to load resident profiles:", err),
    );
    return () => {
      unsubscribeNotices();
      unsubscribeResidents();
    };
  }, []);

  const residentMap = new Map<string, ResidentProfile>();
  for (const resident of residents) {
    for (const id of [
      resident.id,
      resident.userId,
      resident.clerkId,
      resident.clerkUserId,
    ]) {
      if (id) residentMap.set(id, resident);
    }
  }
  const items = notices.map((notice) => {
    const resident =
      (notice.residentId ? residentMap.get(notice.residentId) : undefined) ??
      (notice.userId ? residentMap.get(notice.userId) : undefined);
    return {
      ...notice,
      residentName:
        (resident ? fullName(resident) : "") ||
        notice.residentName ||
        "Resident",
    };
  });
  return { items, error };
}

export function useAdminUnreadCount() {
  const { items } = useAdminNotifications();
  return items.filter((item) => item.unread === true).length;
}
