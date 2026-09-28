"use client";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { EmptyState, ErrorState } from "./Display";

export const Table = ({ children, className }) => (
  <div className={cn("rtable overflow-x-auto", className)}><table className="w-full min-w-max text-left text-sm">{children}</table></div>
);
export const Th = ({ children, className, ...p }) => <th scope="col" className={cn("whitespace-nowrap border-b border-line bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted", className)} {...p}>{children}</th>;
export const Td = ({ children, className, ...p }) => <td className={cn("whitespace-nowrap border-b border-line px-4 py-3", className)} {...p}>{children}</td>;

export function Pagination({ pagination, onPage }) {
  if (!pagination) return null;
  const { page, totalPages, total, limit } = pagination;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-muted max-sm:flex-col max-sm:items-stretch">
      <span className="max-sm:text-center">{from}–{Math.min(page * limit, total)} of {total}</span>
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">Prev</Button>
        <span aria-live="polite">Page {page} of {totalPages}</span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">Next <ChevronRight className="size-4" aria-hidden /></Button>
      </div>
    </nav>
  );
}

/**
 * columns: [{ key, header, render?(row), sortable?, className? }]
 * Handles loading skeleton, error, empty and pagination so pages stay declarative.
 */
export function DataTable({ columns, rows, isLoading, isError, onRetry, pagination, onPage, sort, onSort, emptyTitle, emptyDescription, emptyAction, rowKey = (r) => r._id }) {
  if (isError) return <ErrorState onRetry={onRetry} message="We couldn't load this data." />;
  return (
    <div>
      <Table>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.sortBy === c.key;
              return (
                <Th key={c.key} className={c.className} aria-sort={active ? (sort.sortOrder === "asc" ? "ascending" : "descending") : undefined}>
                  {c.sortable && onSort ? (
                    <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => onSort(c.key)}>
                      {c.header}{active && (sort.sortOrder === "asc" ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
                    </button>
                  ) : c.header}
                </Th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i} aria-hidden>{columns.map((c) => <Td key={c.key} data-label={typeof c.header === "string" ? c.header : ""}><div className="h-4 w-full max-w-32 animate-pulse rounded bg-slate-100" /></Td>)}</tr>
              ))
            : rows?.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-slate-50/60">
                  {columns.map((c) => <Td key={c.key} className={c.className} data-label={typeof c.header === "string" ? c.header : ""}>{c.render ? c.render(row) : row[c.key] ?? "—"}</Td>)}
                </tr>
              ))}
        </tbody>
      </Table>
      {!isLoading && rows?.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />}
      {isLoading && <span className="sr-only" role="status">Loading</span>}
      <Pagination pagination={pagination} onPage={onPage} />
    </div>
  );
}
