import { Head } from '@inertiajs/react';
import ComponentUpload from '@/components/core/component-upload';
import { create, index as componentsIndex } from '@/routes/components';
import type { ComponentRow } from '@/types/component';

type Props = {
    propertyTypes: Record<string, string>;
    uploaded: ComponentRow | null;
};

export default function ComponentCreate({ propertyTypes, uploaded }: Props) {
    return (
        <>
            <Head title="Upload component" />

            {/* Same panel sizing as the table editor: capped and independently
                scrolling only at xl, where the panels sit side by side. */}
            <div className="flex flex-col px-4 py-6 xl:h-full xl:overflow-hidden">
                <ComponentUpload
                    propertyTypes={propertyTypes}
                    uploaded={uploaded}
                />
            </div>
        </>
    );
}

ComponentCreate.layout = {
    breadcrumbs: [
        {
            title: 'Components',
            href: componentsIndex(),
        },
        {
            title: 'Upload component',
            href: create(),
        },
    ],
};
