export function formatShapeJsonError(error: unknown): string {
    if (error instanceof SyntaxError) {
        const match = /position\s+(\d+)/i.exec(error.message);

        if (match) {
            return `Invalid JSON near position ${match[1]}.`;
        }

        return 'Invalid JSON. Fix the syntax to sync columns.';
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'Invalid JSON shape.';
}
