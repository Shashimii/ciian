import { useCallback, useMemo, useState } from 'react';

export type UseTwoFactorAuthReturn = {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    recoveryCodesList: string[];
    hasSetupData: boolean;
    errors: string[];
    requestSetupData: () => void;
    fetchRecoveryCodes: () => void;
    clearTwoFactorAuthData: () => void;
};

export const OTP_MAX_LENGTH = 6;

/**
 * Stubbed while Fortify two-factor authentication is disabled.
 * Avoids importing missing Wayfinder `@/routes/two-factor` helpers.
 */
export const useTwoFactorAuth = (): UseTwoFactorAuthReturn => {
    const [qrCodeSvg] = useState<string | null>(null);
    const [manualSetupKey] = useState<string | null>(null);
    const [recoveryCodesList] = useState<string[]>([]);
    const [errors] = useState<string[]>([]);

    const hasSetupData = useMemo(
        () => qrCodeSvg !== null && manualSetupKey !== null,
        [qrCodeSvg, manualSetupKey],
    );

    const requestSetupData = useCallback((): void => {}, []);
    const fetchRecoveryCodes = useCallback((): void => {}, []);
    const clearTwoFactorAuthData = useCallback((): void => {}, []);

    return {
        qrCodeSvg,
        manualSetupKey,
        recoveryCodesList,
        hasSetupData,
        errors,
        requestSetupData,
        fetchRecoveryCodes,
        clearTwoFactorAuthData,
    };
};
