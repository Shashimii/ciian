import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { login } from '@/routes';

/**
 * Two-factor challenge is disabled while Fortify 2FA is off.
 * Kept as a page so a stale session cannot crash Vite/Inertia.
 */
export default function TwoFactorChallenge() {
    return (
        <>
            <Head title="Two-factor authentication" />
            <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Two-factor authentication is currently disabled.
                </p>
                <Button asChild>
                    <Link href={login()}>Back to login</Link>
                </Button>
            </div>
        </>
    );
}

TwoFactorChallenge.layout = {
    title: 'Two-factor authentication',
    description: 'This sign-in step is not available right now.',
};
