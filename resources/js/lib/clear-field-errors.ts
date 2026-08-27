type Clearable = {
    clearErrors: (...fields: string[]) => void;
};

export function clearFieldErrors(
    form: Clearable,
    ...fields: Array<string | undefined | null>
): void {
    const keys = fields.filter((field): field is string => Boolean(field));

    if (keys.length > 0) {
        form.clearErrors(...keys);
    }
}
