import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RefreshCw,
    Search,
    Trash2,
    Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type DataTableColumn<T> = {
    id: string;
    header: string;
    cell: (row: T) => ReactNode;
    className?: string;
    /** When set, the column header is clickable for asc/desc sorting. */
    sortable?: boolean;
    sortValue?: (row: T) => string | number | boolean | null | undefined;
    /** Included in the search bar filter when provided. */
    searchValue?: (row: T) => string | number | boolean | null | undefined;
};

type SortDirection = 'asc' | 'desc';

type Props<T> = {
    rows: T[];
    columns: DataTableColumn<T>[];
    getRowKey: (row: T) => string;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    selection?: boolean;
    selectedKeys?: Set<string>;
    onSelectedKeysChange?: (keys: Set<string>) => void;
    onDelete?: (row: T) => void;
    canDelete?: (row: T) => boolean;
    /** Row key currently deleting; every row's delete action is disabled and it spins. */
    deletingKey?: string | null;
    onPublish?: (row: T) => void;
    canPublish?: (row: T) => boolean;
    isSync?: (row: T) => boolean;
    /** Row key currently publishing; its action is disabled and spins. */
    publishingKey?: string | null;
    searchable?: boolean;
    searchPlaceholder?: string;
    pageSize?: number;
};

function compareValues(
    left: string | number | boolean | null | undefined,
    right: string | number | boolean | null | undefined,
): number {
    if (left == null && right == null) {
        return 0;
    }

    if (left == null) {
        return -1;
    }

    if (right == null) {
        return 1;
    }

    if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
    }

    if (typeof left === 'boolean' && typeof right === 'boolean') {
        return Number(left) - Number(right);
    }

    return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

export default function DataTable<T>({
    rows,
    columns,
    getRowKey,
    emptyMessage = 'No rows found.',
    onRowClick,
    selection = false,
    selectedKeys = new Set(),
    onSelectedKeysChange,
    onDelete,
    canDelete,
    deletingKey = null,
    onPublish,
    canPublish,
    isSync,
    publishingKey = null,
    searchable = true,
    searchPlaceholder = 'Search…',
    pageSize = 10,
}: Props<T>) {
    const [search, setSearch] = useState('');
    const [sortColumnId, setSortColumnId] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [page, setPage] = useState(1);

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (query === '') {
            return rows;
        }

        const searchColumns = columns.filter((column) => column.searchValue);

        if (searchColumns.length === 0) {
            return rows;
        }

        return rows.filter((row) =>
            searchColumns.some((column) => {
                const value = column.searchValue?.(row);

                return (
                    value != null && String(value).toLowerCase().includes(query)
                );
            }),
        );
    }, [columns, rows, search]);

    const sortedRows = useMemo(() => {
        if (!sortColumnId) {
            return filteredRows;
        }

        const column = columns.find((item) => item.id === sortColumnId);

        if (!column?.sortable || !column.sortValue) {
            return filteredRows;
        }

        const sorted = [...filteredRows].sort((left, right) =>
            compareValues(column.sortValue?.(left), column.sortValue?.(right)),
        );

        return sortDirection === 'asc' ? sorted : sorted.reverse();
    }, [columns, filteredRows, sortColumnId, sortDirection]);

    const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const currentPage = Math.min(page, pageCount);

    const pageRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;

        return sortedRows.slice(start, start + pageSize);
    }, [currentPage, pageSize, sortedRows]);

    const allSelected =
        pageRows.length > 0 &&
        pageRows.every((row) => selectedKeys.has(getRowKey(row)));

    const toggleAll = () => {
        if (!onSelectedKeysChange) {
            return;
        }

        if (allSelected) {
            onSelectedKeysChange(new Set());

            return;
        }

        onSelectedKeysChange(new Set(pageRows.map((row) => getRowKey(row))));
    };

    const toggleRow = (key: string) => {
        if (!onSelectedKeysChange) {
            return;
        }

        const next = new Set(selectedKeys);

        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }

        onSelectedKeysChange(next);
    };

    const toggleSort = (column: DataTableColumn<T>) => {
        if (!column.sortable || !column.sortValue) {
            return;
        }

        if (sortColumnId !== column.id) {
            setSortColumnId(column.id);
            setSortDirection('asc');
            setPage(1);

            return;
        }

        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
        setPage(1);
    };

    const rangeStart =
        sortedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const rangeEnd = Math.min(currentPage * pageSize, sortedRows.length);

    return (
        <div className="space-y-3">
            {searchable && (
                <div className="relative max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder={searchPlaceholder}
                        className="pl-9"
                        aria-label={searchPlaceholder}
                    />
                </div>
            )}

            <div className="overflow-hidden rounded-lg border">
                <table className="w-full caption-bottom text-sm">
                    <thead className="bg-muted/40 [&_tr]:border-b">
                        <tr className="border-b">
                            {selection && (
                                <th className="h-10 w-10 px-3 text-left">
                                    <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={toggleAll}
                                        aria-label="Select all rows"
                                    />
                                </th>
                            )}
                            {columns.map((column) => {
                                const isSorted = sortColumnId === column.id;
                                const SortIcon = !column.sortable
                                    ? null
                                    : isSorted && sortDirection === 'asc'
                                      ? ArrowUp
                                      : isSorted && sortDirection === 'desc'
                                        ? ArrowDown
                                        : ArrowUpDown;

                                return (
                                    <th
                                        key={column.id}
                                        className={cn(
                                            'h-10 px-3 text-left align-middle font-medium text-muted-foreground',
                                            column.className,
                                        )}
                                    >
                                        {column.sortable && column.sortValue ? (
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                onClick={() =>
                                                    toggleSort(column)
                                                }
                                                aria-label={`Sort by ${column.header}`}
                                            >
                                                {column.header}
                                                {SortIcon && (
                                                    <SortIcon
                                                        className={cn(
                                                            'size-3.5',
                                                            isSorted
                                                                ? 'text-foreground'
                                                                : 'text-muted-foreground/70',
                                                        )}
                                                    />
                                                )}
                                            </button>
                                        ) : (
                                            column.header
                                        )}
                                    </th>
                                );
                            })}
                            {onPublish && <th className="h-10 w-10 px-3" />}
                            {onDelete && <th className="h-10 w-10 px-3" />}
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {pageRows.length === 0 ? (
                            <tr className="border-b">
                                <td
                                    colSpan={
                                        columns.length +
                                        (selection ? 1 : 0) +
                                        (onPublish ? 1 : 0) +
                                        (onDelete ? 1 : 0)
                                    }
                                    className="p-8 text-center text-muted-foreground"
                                >
                                    {search.trim() !== ''
                                        ? 'No matching rows.'
                                        : emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((row) => {
                                const key = getRowKey(row);
                                const clickable = Boolean(onRowClick);

                                return (
                                    <tr
                                        key={key}
                                        className={cn(
                                            'border-b transition-colors hover:bg-muted/30',
                                            clickable && 'cursor-pointer',
                                        )}
                                        onClick={() => onRowClick?.(row)}
                                    >
                                        {selection && (
                                            <td
                                                className="px-3 py-3 align-middle"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                            >
                                                <Checkbox
                                                    checked={selectedKeys.has(
                                                        key,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleRow(key)
                                                    }
                                                    aria-label={`Select row ${key}`}
                                                />
                                            </td>
                                        )}
                                        {columns.map((column) => (
                                            <td
                                                key={column.id}
                                                className={cn(
                                                    'px-3 py-3 align-middle',
                                                    column.className,
                                                )}
                                            >
                                                {column.cell(row)}
                                            </td>
                                        ))}
                                        {onPublish && (
                                            <td
                                                className="px-3 py-3 align-middle"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                            >
                                                {canPublish?.(row) &&
                                                    (() => {
                                                        const busy =
                                                            publishingKey ===
                                                            getRowKey(row);
                                                        const label = isSync?.(
                                                            row,
                                                        )
                                                            ? 'Sync'
                                                            : 'Publish';

                                                        return (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8"
                                                                        aria-label={
                                                                            busy
                                                                                ? `${label}ing…`
                                                                                : label
                                                                        }
                                                                        disabled={
                                                                            publishingKey !==
                                                                            null
                                                                        }
                                                                        onClick={() =>
                                                                            onPublish(
                                                                                row,
                                                                            )
                                                                        }
                                                                    >
                                                                        {busy ? (
                                                                            <RefreshCw className="size-4 animate-spin" />
                                                                        ) : isSync?.(
                                                                              row,
                                                                          ) ? (
                                                                            <RefreshCw className="size-4" />
                                                                        ) : (
                                                                            <Upload className="size-4" />
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {busy
                                                                        ? `${label}ing…`
                                                                        : label}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    })()}
                                            </td>
                                        )}
                                        {onDelete && (
                                            <td
                                                className="px-3 py-3 align-middle"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                            >
                                                {(canDelete?.(row) ?? true) &&
                                                    (() => {
                                                        const busy =
                                                            deletingKey ===
                                                            getRowKey(row);
                                                        const label = busy
                                                            ? 'Deleting…'
                                                            : 'Delete';

                                                        return (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8 text-destructive hover:bg-destructive/10"
                                                                        aria-label={
                                                                            label
                                                                        }
                                                                        disabled={
                                                                            deletingKey !==
                                                                            null
                                                                        }
                                                                        onClick={() =>
                                                                            onDelete(
                                                                                row,
                                                                            )
                                                                        }
                                                                    >
                                                                        {busy ? (
                                                                            <Loader2 className="size-4 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="size-4" />
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {label}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    })()}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    {sortedRows.length === 0
                        ? '0 results'
                        : `Showing ${rangeStart}–${rangeEnd} of ${sortedRows.length}`}
                </p>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() =>
                            setPage((current) => Math.max(1, current - 1))
                        }
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="size-4" />
                        Previous
                    </Button>
                    <span className="min-w-20 text-center text-sm text-muted-foreground">
                        Page {currentPage} of {pageCount}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= pageCount}
                        onClick={() =>
                            setPage((current) =>
                                Math.min(pageCount, current + 1),
                            )
                        }
                        aria-label="Next page"
                    >
                        Next
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
