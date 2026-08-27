/**
 * Stubbed while Fortify two-factor authentication is disabled.
 */
type Props = {
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
    clearSetupData?: () => void;
    fetchSetupData?: () => void;
    errors?: string[];
};

export default function TwoFactorSetupModal(_props: Props) {
    return null;
}
