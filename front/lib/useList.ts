"use client";

import { useCallback, useEffect, useState } from "react";

/** Loads a list from the backend and reloads it after every change made through run(). */
export function useList<T>(load: () => Promise<T[]>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => setItems(await load()), [load]);

  useEffect(() => {
    let active = true;
    load().then(
      (loaded) => active && setItems(loaded),
      (e) => active && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      active = false;
    };
  }, [load]);

  /** Runs a change, then reloads; resolves to false if it failed. */
  const run = useCallback(
    async (change: () => Promise<unknown>) => {
      try {
        await change();
        setError(null);
        await reload();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      }
    },
    [reload],
  );

  return { items, error, setError, run };
}
