"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/lib/team/constants";
import { PAGE_SIZE_OPTIONS } from "@/lib/team/constants";

type PaginationProps = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
  label?: string;
};

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  label = "records",
}: PaginationProps) {
  const { page, page_size, total, total_pages } = pagination;
  const start = total === 0 ? 0 : (page - 1) * page_size + 1;
  const end = Math.min(page * page_size, total);
  const visibleTotalPages = Math.max(total_pages, 1);

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {total} {label}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Rows per page
          <select
            value={page_size}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="app-input h-9 w-auto py-1"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="app-btn-secondary inline-flex h-9 items-center gap-1 px-3 text-xs"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
            Previous
          </button>
          <span className="min-w-[88px] text-center text-sm text-muted-foreground">
            Page {page} of {visibleTotalPages}
          </span>
          <button
            type="button"
            className="app-btn-secondary inline-flex h-9 items-center gap-1 px-3 text-xs"
            disabled={disabled || total_pages === 0 || page >= total_pages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
