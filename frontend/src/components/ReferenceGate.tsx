import type { ReactNode } from "react";
import { errorText, useConfig } from "../api/hooks";
import { Button } from "./ui/Button";
import { Waiting } from "./ui/Waiting";

/** The app needs its reference data (countries, suggested roles) before any
 * page: it comes from the server's database with the config, once
 * (useConfig applies it as it arrives). */
export function ReferenceGate({ children }: { children: ReactNode }) {
  const config = useConfig();
  if (config.data) return <>{children}</>;
  if (config.isError) {
    return (
      <div className="boot-error" role="alert">
        <p>{errorText(config.error)}</p>
        <Button variant="primary" onClick={() => void config.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return <Waiting title="Opening Bridge" steps={["Waking the server", "Loading countries and roles"]} usually="Usually a few seconds." />;
}
