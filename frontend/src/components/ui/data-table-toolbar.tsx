"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DataTableFilterOption = {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

export type DataTableDateField = {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
};

type DataTableToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: DataTableFilterOption[];
  dateFields?: DataTableDateField[];
  onFilterChange?: (id: string, value: string) => void;
  onDateFieldChange?: (id: string, value: string) => void;
  onReset?: () => void;
  showReset?: boolean;
  resultLabel?: string;
};

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  dateFields = [],
  onFilterChange,
  onDateFieldChange,
  onReset,
  showReset = false,
  resultLabel,
}: DataTableToolbarProps) {
  return (
    <div className="data-table-toolbar">
      <div className="data-table-toolbar__row">
        <label className="data-table-toolbar__search">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="data-table-toolbar__search-input"
          />
        </label>
        {dateFields.map((field) => (
          <label key={field.id} className="data-table-toolbar__filter">
            <span className="data-table-toolbar__filter-label">{field.label}</span>
            <input
              type="date"
              value={field.value}
              min={field.min}
              max={field.max}
              onChange={(event) => onDateFieldChange?.(field.id, event.target.value)}
              className="app-input data-table-toolbar__select"
            />
          </label>
        ))}
        {filters.map((filter) => (
          <label key={filter.id} className="data-table-toolbar__filter">
            <span className="data-table-toolbar__filter-label">{filter.label}</span>
            <select
              value={filter.value}
              onChange={(event) => onFilterChange?.(filter.id, event.target.value)}
              className="app-input data-table-toolbar__select"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {showReset && onReset ? (
          <Button type="button" variant="secondary" className="h-9 gap-1.5 px-3 text-xs" onClick={onReset}>
            <X className="size-3.5" />
            Reset
          </Button>
        ) : null}
      </div>
      {resultLabel ? <p className="data-table-toolbar__meta">{resultLabel}</p> : null}
    </div>
  );
}
