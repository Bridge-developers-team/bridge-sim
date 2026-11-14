import { useQuery } from "@tanstack/react-query";
import { bridgeApi } from "./bridge";
import { ApiError } from "./client";

/** Samples, tracks and limits: fetched once per visit. */
export function useConfig() {
  return useQuery({ queryKey: ["config"], queryFn: bridgeApi.config, staleTime: Infinity });
}

export function useProof(id: string) {
  return useQuery({
    queryKey: ["proof", id],
    queryFn: () => bridgeApi.proof(id),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
