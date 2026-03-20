// SpacetimeDB connection configuration
// Used by SpacetimeDBProvider in main.tsx

import { useMemo } from "react";
import { DbConnection } from "../module_bindings";

const MODULE_NAME = import.meta.env.VITE_STDB_MODULE || "ciclo-game";
const HOST = import.meta.env.VITE_STDB_HOST || "wss://maincloud.spacetimedb.com";
const TOKEN_KEY = "ciclo_spacetimedb_token";

export function useConnectionBuilder() {
  return useMemo(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY) || undefined;

    return DbConnection.builder()
      .withUri(HOST)
      .withDatabaseName(MODULE_NAME)
      .withToken(savedToken)
      .onConnect((_conn, _identity, token) => {
        localStorage.setItem(TOKEN_KEY, token);
      });
  }, []);
}
