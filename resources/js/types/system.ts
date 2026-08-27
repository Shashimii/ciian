export type SystemKind = 'ciian' | 'system';

export type SystemRow = {
    key: string;
    kind: SystemKind;
    id: number;
    name: string;
    slug: string;
    icon: string;
    color: string | null;
    tables_count: number;
};

export type CiianConfigData = {
    id: number;
    name: string;
    sys_slug: string;
    icon: string;
    color: string;
};
