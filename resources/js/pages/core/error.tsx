import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';

const copy: Record<
    number,
    {
        title: string;
        description: string;
    }
> = {
    403: {
        title: 'Forbidden',
        description: 'You do not have permission to access this page.',
    },
    404: {
        title: 'Page not found',
        description: 'Sorry, the page you are looking for could not be found.',
    },
    500: {
        title: 'Server error',
        description: 'Something went wrong on our end. Please try again later.',
    },
    503: {
        title: 'Service unavailable',
        description: 'We are doing some maintenance. Please check back soon.',
    },
};

export default function ErrorPage({ status }: { status: number }) {
    const content = copy[status] ?? {
        title: 'Unexpected error',
        description: 'An unexpected error occurred. Please try again.',
    };

    return (
        <>
            <Head title={`${status} ${content.title}`} />

            <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
                <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center">
                    <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                        Error {status}
                    </p>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {content.title}
                        </h1>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {content.description}
                        </p>
                    </div>

                    <Button asChild size="lg" className="mt-2">
                        <Link href={home()}>Back to home</Link>
                    </Button>
                </div>
            </div>
        </>
    );
}
