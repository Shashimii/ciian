import { RefreshCw, Trash2, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
};

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
    onPublish?: (row: T) => void;
    canPublish?: (row: T) => boolean;
    isSync?: (row: T) => boolean;
};

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
    onPublish,
    canPublish,
    isSync,
}: Props<T>) {
    const allSelected =
        rows.length > 0 && rows.every((row) => selectedKeys.has(getRowKey(row)));

    const toggleAll = () => {
        if (!onSelectedKeysChange) {
            return;
        }

        if (allSelected) {
            onSelectedKeysChange(new Set());

            return;
        }

        onSelectedKeysChange(new Set(rows.map((row) => getRowKey(row))));
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

    return (
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
                        {columns.map((column) => (
                            <th
                                key={column.id}
                                className={cn(
                                    'h-10 px-3 text-left align-middle font-medium text-muted-foreground',
                                    column.className,
                                )}
                            >
                                {column.header}
                            </th>
                        ))}
                        {onPublish && <th className="h-10 w-10 px-3" />}
                        {onDelete && <th className="h-10 w-10 px-3" />}
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {rows.length === 0 ? (
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
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => {
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
                                                checked={selectedKeys.has(key)}
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
                                            {canPublish?.(row) && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                            aria-label={
                                                                isSync?.(row)
                                                                    ? 'Sync'
                                                                    : 'Publish'
                                                            }
                                                            onClick={() =>
                                                                onPublish(row)
                                                            }
                                                        >
                                                            {isSync?.(row) ? (
                                                                <RefreshCw className="size-4" />
                                                            ) : (
                                                                <Upload className="size-4" />
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {isSync?.(row)
                                                            ? 'Sync'
                                                            : 'Publish'}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </td>
                                    )}
                                    {onDelete && (
                                        <td
                                            className="px-3 py-3 align-middle"
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-destructive hover:bg-destructive/10"
                                                        aria-label="Delete"
                                                        onClick={() =>
                                                            onDelete(row)
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Delete
                                                </TooltipContent>
                                            </Tooltip>
                                        </td>
                                    )}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
