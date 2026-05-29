"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from "@/lib/team/constants";

type UseClientTableOptions<T> = {
  items: T[];
  pageSize?: number;
  searchFn?: (item: T, query: string) => boolean;
  filterFn?: (item: T, filters: Record<string, string>) => boolean;
};

export function useClientTable<T>({
  items,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  searchFn,
  filterFn,
}: UseClientTableOptions<T>) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (query && searchFn && !searchFn(item, query)) return false;
      if (filterFn && !filterFn(item, filters)) return false;
      return true;
    });
  }, [items, search, filters, searchFn, filterFn]);

  const total = filteredItems.length;
  const totalPages = total ? Math.ceil(total / pageSize) : 0;
  const safePage = totalPages ? Math.min(page, totalPages) : 1;

  useEffect(() => {
    setPage(1);
  }, [search, filters, pageSize]);

  useEffect(() => {
    if (totalPages && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, pageSize, safePage]);

  const pagination: PaginationMeta = {
    page: safePage,
    page_size: pageSize,
    total,
    total_pages: totalPages,
  };

  function setFilter(key: string, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setSearch("");
    setFilters({});
    setPage(1);
  }

  return {
    search,
    setSearch,
    filters,
    setFilter,
    resetFilters,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageItems,
    filteredItems,
    pagination,
    hasActiveFilters: Boolean(search.trim()) || Object.values(filters).some((value) => value && value !== "all"),
  };
}
