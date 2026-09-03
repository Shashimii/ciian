/**
 * Stubbed while Fortify two-factor authentication is disabled.
 * Avoids importing missing Wayfinder `@/routes/two-factor` helpers.
 */
export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function ManageTwoFactor(_props: Props) {
    return null;
}
