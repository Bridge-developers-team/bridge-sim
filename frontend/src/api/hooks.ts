import { useQuery } from "@tanstack/react-query";
import { setReference } from "../lib/reference";
import { settleCurrency } from "../state/journey";
import { bridgeApi } from "./bridge";
import { ApiError } from "./client";

/** Samples, tracks and limits: fetched once per visit. */
/** The config, with the reference data applied the moment it arrives: before
 * any page mounts, so every page (and a fresh visit's currency) sees it. */
export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const config = await bridgeApi.config();
      setReference(config.reference);
      settleCurrency();
      return config;
    },
    staleTime: Infinity,
  });
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
