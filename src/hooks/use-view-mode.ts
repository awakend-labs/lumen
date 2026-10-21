"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import type { ViewMode } from "@/lib/types";

const preferenceKey = ["preferences"] as const;
const LEGACY_VIEW_KEY = "lumen:endpoint-view";

type Preferences = { endpointView: ViewMode };

export function useViewMode() {
  const queryClient = useQueryClient();
  const preferences = useQuery({
    queryKey: preferenceKey,
    queryFn: ({ signal }) => api<Preferences>("/api/preferences", { signal }),
  });

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_VIEW_KEY);
  }, []);

  const save = useMutation({
    mutationFn: (endpointView: ViewMode) =>
      api<Preferences>("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify({ endpointView }),
      }),
    onMutate: async (endpointView) => {
      await queryClient.cancelQueries({ queryKey: preferenceKey });
      const previous = queryClient.getQueryData<Preferences>(preferenceKey);
      queryClient.setQueryData<Preferences>(preferenceKey, { endpointView });
      return { previous };
    },
    onError: (_error, _value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(preferenceKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: preferenceKey });
    },
  });

  const mode: ViewMode = preferences.data?.endpointView === "list" ? "list" : "grid";

  return [mode, save.mutate] as const;
}
