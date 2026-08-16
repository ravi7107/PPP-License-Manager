import { useState, useEffect } from "react";

export function useUser() {
  return {
    id: "admin",
    name: "Administrator",
    email: "admin@pps.local",
    roles: ["IT_ADMIN"],
  };
}

export interface UseLoadActionOptions {
  // When false, reload() is not called automatically (callers can still
  // trigger it manually via the returned reload function). Defaults to
  // true. Lets a dialog skip fetching until it's actually open.
  enabled?: boolean;
}

export function useLoadAction(
  action: any,
  defaultValue: any = [],
  params?: any,
  options?: UseLoadActionOptions,
) {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options?.enabled ?? true;

  const reload = async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      if (typeof action === "function") {
        const result = await action(params);
        setData(result ?? defaultValue);
      }
    } catch (e) {
      // Previously this only logged - every caller that destructures
      // `error` (typed as `Error | null` throughout the app) was always
      // getting `null` back even on a failed load, so nothing could ever
      // show a real error state or offer a retry. No caller currently
      // reads this value, so surfacing it here is additive.
      console.error(e);
      setError(e instanceof Error ? e : new Error(String(e)));
    }

    setLoading(false);
  };

  // Re-runs whenever `params` or `enabled` change (not just once on
  // mount) - e.g. a history dialog that's given a different record's id
  // each time it's opened needs a fresh fetch each time, not the result
  // of whatever was passed in on the very first render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    reload();
  }, [JSON.stringify(params), enabled]);

  return [data, loading, error, reload] as const;
}

export function useMutateAction(action: any) {
  const [loading, setLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  const mutate = async (params?: any) => {
    setLoading(true);

    try {
      if (typeof action === "function") {
        return await action(params);
      }
    } finally {
      setLoading(false);
    }
  };

  return [mutate, loading, error] as const;
}

export function action(name: string, type: string, config: any) {
  return {
    name,
    type,
    config,
  };
}
