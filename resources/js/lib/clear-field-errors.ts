type Clearable<K extends string = string> = {
    clearErrors: (...fields: K[]) => void;
};

export function clearFieldErrors<K extends string>(
    form: Clearable<K>,
    ...fields: Array<K | undefined | null>
): void {
    const keys = fields.filter((field): field is K => field != null && field !== '');

    if (keys.length > 0) {
        form.clearErrors(...keys);
    }
}
