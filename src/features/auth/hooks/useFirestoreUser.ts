import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserById } from "../services/auth.service";

export const useFirestoreUser = (userId: string | undefined) => {
  const query = useQuery({
    queryKey: ["userAuth", userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    // The active billing month depends on getAppDate(). Always run the
    // existing billing initializer when the resident page is mounted so a
    // freshly changed Demo Clock cannot be hidden by React Query's cache.
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const refreshResident = () => {
      void query.refetch();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "terradues-demo-date") {
        refreshResident();
      }
    };

    // Same-tab Demo Clock changes use the custom event. Other tabs on the same
    // origin receive the native storage event. Focus also refreshes after an
    // admin/resident account switch.
    window.addEventListener("terradues-demo-date-changed", refreshResident);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refreshResident);

    return () => {
      window.removeEventListener(
        "terradues-demo-date-changed",
        refreshResident,
      );
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refreshResident);
    };
  }, [userId, query.refetch]);

  return query;
};
