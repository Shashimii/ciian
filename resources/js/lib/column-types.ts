export type ColumnTypeOption = {
    value: string;
    label: string;
    options: string[];
};

export type ColumnTypeGroup = {
    label: string;
    types: ColumnTypeOption[];
};

const DEFINITIONS: Record<string, { label: string; options: string[]; group: string }> = {
    id: { label: 'ID', options: ['nullable', 'auto_increment'], group: 'Numeric' },
    increments: { label: 'Increments', options: ['nullable', 'auto_increment'], group: 'Numeric' },
    tinyIncrements: { label: 'Tiny Increments', options: ['nullable', 'auto_increment'], group: 'Numeric' },
    smallIncrements: { label: 'Small Increments', options: ['nullable', 'auto_increment'], group: 'Numeric' },
    mediumIncrements: { label: 'Medium Increments', options: ['nullable', 'auto_increment'], group: 'Numeric' },
    bigIncrements: { label: 'Big Increments', options: ['nullable', 'auto_increment'], group: 'Numeric' },
    integer: { label: 'Integer', options: ['nullable', 'default', 'unsigned', 'auto_increment'], group: 'Numeric' },
    tinyInteger: { label: 'Tiny Integer', options: ['nullable', 'default', 'unsigned', 'auto_increment'], group: 'Numeric' },
    smallInteger: { label: 'Small Integer', options: ['nullable', 'default', 'unsigned', 'auto_increment'], group: 'Numeric' },
    mediumInteger: { label: 'Medium Integer', options: ['nullable', 'default', 'unsigned', 'auto_increment'], group: 'Numeric' },
    bigInteger: { label: 'Big Integer', options: ['nullable', 'default', 'unsigned', 'auto_increment'], group: 'Numeric' },
    unsignedInteger: { label: 'Unsigned Integer', options: ['nullable', 'default', 'auto_increment'], group: 'Numeric' },
    unsignedTinyInteger: { label: 'Unsigned Tiny Integer', options: ['nullable', 'default', 'auto_increment'], group: 'Numeric' },
    unsignedSmallInteger: { label: 'Unsigned Small Integer', options: ['nullable', 'default', 'auto_increment'], group: 'Numeric' },
    unsignedMediumInteger: { label: 'Unsigned Medium Integer', options: ['nullable', 'default', 'auto_increment'], group: 'Numeric' },
    unsignedBigInteger: { label: 'Unsigned Big Integer', options: ['nullable', 'default', 'auto_increment'], group: 'Numeric' },
    decimal: { label: 'Decimal', options: ['nullable', 'default', 'precision', 'scale', 'unsigned'], group: 'Numeric' },
    float: { label: 'Float', options: ['nullable', 'default', 'precision', 'scale', 'unsigned'], group: 'Numeric' },
    double: { label: 'Double', options: ['nullable', 'default', 'precision', 'scale', 'unsigned'], group: 'Numeric' },
    string: { label: 'String', options: ['nullable', 'default', 'length'], group: 'Text' },
    char: { label: 'Char', options: ['nullable', 'default', 'length'], group: 'Text' },
    text: { label: 'Text', options: ['nullable'], group: 'Text' },
    tinyText: { label: 'Tiny Text', options: ['nullable'], group: 'Text' },
    mediumText: { label: 'Medium Text', options: ['nullable'], group: 'Text' },
    longText: { label: 'Long Text', options: ['nullable'], group: 'Text' },
    boolean: { label: 'Boolean', options: ['nullable', 'default'], group: 'Boolean' },
    date: { label: 'Date', options: ['nullable', 'default'], group: 'Date & time' },
    dateTime: { label: 'DateTime', options: ['nullable', 'default', 'precision', 'use_current', 'use_current_on_update'], group: 'Date & time' },
    dateTimeTz: { label: 'DateTime (TZ)', options: ['nullable', 'default', 'precision', 'use_current', 'use_current_on_update'], group: 'Date & time' },
    time: { label: 'Time', options: ['nullable', 'default', 'precision'], group: 'Date & time' },
    timeTz: { label: 'Time (TZ)', options: ['nullable', 'default', 'precision'], group: 'Date & time' },
    timestamp: { label: 'Timestamp', options: ['nullable', 'default', 'precision', 'use_current', 'use_current_on_update'], group: 'Date & time' },
    timestampTz: { label: 'Timestamp (TZ)', options: ['nullable', 'default', 'precision', 'use_current', 'use_current_on_update'], group: 'Date & time' },
    year: { label: 'Year', options: ['nullable', 'default'], group: 'Date & time' },
    binary: { label: 'Binary', options: ['nullable'], group: 'Binary & JSON' },
    json: { label: 'JSON', options: ['nullable', 'default'], group: 'Binary & JSON' },
    jsonb: { label: 'JSONB', options: ['nullable', 'default'], group: 'Binary & JSON' },
    uuid: { label: 'UUID', options: ['nullable', 'default'], group: 'UUID & ULID' },
    ulid: { label: 'ULID', options: ['nullable', 'default'], group: 'UUID & ULID' },
    foreignId: { label: 'Foreign ID', options: ['nullable', 'references', 'on_delete'], group: 'Relationships' },
    foreignUlid: { label: 'Foreign ULID', options: ['nullable', 'references', 'on_delete'], group: 'Relationships' },
    foreignUuid: { label: 'Foreign UUID', options: ['nullable', 'references', 'on_delete'], group: 'Relationships' },
    enum: { label: 'Enum', options: ['nullable', 'default', 'values'], group: 'Specialty' },
    set: { label: 'Set', options: ['nullable', 'default', 'values'], group: 'Specialty' },
    ipAddress: { label: 'IP Address', options: ['nullable', 'default'], group: 'Specialty' },
    macAddress: { label: 'MAC Address', options: ['nullable', 'default'], group: 'Specialty' },
    rememberToken: { label: 'Remember Token', options: ['nullable'], group: 'Specialty' },
    vector: { label: 'Vector', options: ['nullable', 'dimensions'], group: 'Specialty' },
    softDeletes: { label: 'Soft Deletes', options: ['precision'], group: 'Specialty' },
    softDeletesTz: { label: 'Soft Deletes (TZ)', options: ['precision'], group: 'Specialty' },
    geometry: { label: 'Geometry', options: ['nullable'], group: 'Spatial' },
    geography: { label: 'Geography', options: ['nullable'], group: 'Spatial' },
};

export const UNIVERSAL_COLUMN_OPTIONS = ['unique', 'indexed'] as const;

export const ON_DELETE_ACTIONS = [
    { value: 'cascade', label: 'Cascade' },
    { value: 'restrict', label: 'Restrict' },
    { value: 'set_null', label: 'Set null' },
    { value: 'no_action', label: 'No action' },
] as const;

export function columnSupports(type: string, option: string): boolean {
    if ((UNIVERSAL_COLUMN_OPTIONS as readonly string[]).includes(option)) {
        return true;
    }

    return DEFINITIONS[type]?.options.includes(option) ?? false;
}

export function columnTypeLabel(type: string, fallback?: string): string {
    if (type === 'id') {
        return 'Auto Increment';
    }

    return DEFINITIONS[type]?.label ?? fallback ?? type;
}

export function groupedColumnTypes(
    serverLabels?: Record<string, string>,
): ColumnTypeGroup[] {
    const groups = new Map<string, ColumnTypeOption[]>();

    for (const [value, definition] of Object.entries(DEFINITIONS)) {
        const list = groups.get(definition.group) ?? [];
        list.push({
            value,
            label: serverLabels?.[value] ?? definition.label,
            options: definition.options,
        });
        groups.set(definition.group, list);
    }

    return Array.from(groups.entries()).map(([label, types]) => ({
        label,
        types,
    }));
}

export function isLockedIdColumn(column: {
    name: string;
    type: string;
}): boolean {
    return column.name === 'id' && column.type === 'id';
}
