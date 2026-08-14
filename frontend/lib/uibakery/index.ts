import { useState, useEffect } from "react";

export function useUser() {
  return {
    id: "admin",
    name: "Administrator",
    email: "admin@pps.local",
    roles: ["IT_ADMIN"],
  };
}

export function useLoadAction(action: any, defaultValue: any = [], params?: any) {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reload = async () => {
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

  useEffect(() => {
    reload();
  }, []);

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
