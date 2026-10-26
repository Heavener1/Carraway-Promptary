"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, clientFetch } from "./api";
import type { UserMe } from "./types";

export function useMe() {
  return useQuery<UserMe | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await clientFetch<UserMe>("/api/v1/users/me");
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}
