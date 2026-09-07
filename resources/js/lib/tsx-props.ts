/**
 * Prop names a TSX default export destructures.
 *
 * Mirrors `App\Support\TsxProps` so the upload pages can check an uploaded file's
 * keys against its source before the server does. The server re-runs the check —
 * this is fast feedback, never the authority.
 */
export function destructuredProps(tsx: string): string[] {
    const start = tsx.indexOf('export default');

    if (start === -1) {
        return [];
    }

    const body = tsx.slice(start);
    const open = body.indexOf('{');
    const close = body.indexOf('}');

    if (open === -1 || close === -1 || close < open) {
        return [];
    }

    return body
        .slice(open + 1, close)
        .split(',')
        .map((part) => part.split('=')[0].trim())
        .filter((part) => /^[A-Za-z_$][\w$]*$/.test(part));
}
