"use client";

import { jsonRequest } from "@/lib/http/json-request";
import type { AdminDashboardStats, ManagerDashboardStats, AgentDashboardStats, OrganizationDashboardStats } from "@/lib/dashboard/types";

const STATS_CACHE_TTL_MS = 15_000;

type StatsCacheEntry<T> = {
  data: T;
  expiresAt: number;
};

function readStatsCache<T>(entry: StatsCacheEntry<T> | null): T | null {
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.data;
}

function createCachedStatsFetcher<T>(path: string) {
  let cache: StatsCacheEntry<T> | null = null;
  let inFlight: Promise<T> | null = null;

  return () => {
    const cached = readStatsCache(cache);
    if (cached) return Promise.resolve(cached);

    if (!inFlight) {
      inFlight = jsonRequest<T>(path)
        .then((data) => {
          cache = { data, expiresAt: Date.now() + STATS_CACHE_TTL_MS };
          return data;
        })
        .finally(() => {
          inFlight = null;
        });
    }

    return inFlight;
  };
}

export const getAdminDashboardStats = createCachedStatsFetcher<AdminDashboardStats>(
  "/api/admin/dashboard/stats",
);
export const getManagerDashboardStats = createCachedStatsFetcher<ManagerDashboardStats>(
  "/api/manager/dashboard/stats",
);
export const getOrganizationDashboardStats = createCachedStatsFetcher<OrganizationDashboardStats>(
  "/api/organization/dashboard/stats",
);
export const getAgentDashboardStats = createCachedStatsFetcher<AgentDashboardStats>(
  "/api/agent/dashboard/stats",
);
