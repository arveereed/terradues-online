import { useQuery } from "@tanstack/react-query";
import { getUserById } from "../services/auth.service";

export const useFirestoreUser = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["userAuth", userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes, avoid refetch spam
  });
};
