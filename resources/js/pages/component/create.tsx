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

            {/* Full-bleed at xl: the preview canvas fills the content area and the
                panels float over it. Below xl the normal page padding returns. */}
            <div className="flex flex-col px-4 py-6 xl:h-full xl:overflow-hidden xl:p-0">
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
