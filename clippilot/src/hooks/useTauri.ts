/**
 * useTauri — Wrapper for Tauri invoke calls with loading + error state.
 * Swap the invoke calls for native module calls when porting to React Native.
 */

import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface TauriCallState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useTauriCommand<TArgs = void, TResult = void>(
  command: string,
): {
  execute: (args?: TArgs) => Promise<TResult | null>;
  state: TauriCallState<TResult>;
} {
  const [state, setState] = useState<TauriCallState<TResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (args?: TArgs): Promise<TResult | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await invoke<TResult>(command, args as Record<string, unknown>);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = String(err);
        setState({ data: null, loading: false, error: errorMsg });
        return null;
      }
    },
    [command],
  );

  return { execute, state };
}

/** Hook to listen for a Tauri event */
export function useTauriEvent<T>(
  event: string,
  handler: (payload: T) => void,
) {
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<T>(event, (e) => handler(e.payload)).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [event, handler]);
}
