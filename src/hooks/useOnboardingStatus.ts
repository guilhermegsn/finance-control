import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccountService } from '../service/AccountService';

const ONBOARDING_STORAGE_KEY = '@finance-control:onboarding-completed';

export function useOnboardingStatus(userId: string | undefined) {
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const flag = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (flag === 'true') {
          if (!cancelled) setNeedsOnboarding(false);
          return;
        }

        // Flag not set yet (first run, or upgrading from a version without onboarding).
        // Re-derive from real data so users who already have accounts aren't forced through the wizard.
        const accounts = await AccountService.fetchAll();
        if (accounts.length > 0) {
          await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
          if (!cancelled) setNeedsOnboarding(false);
        } else if (!cancelled) {
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error('Erro ao verificar status de onboarding:', error);
        if (!cancelled) setNeedsOnboarding(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markCompleted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setNeedsOnboarding(false);
  }, []);

  return { isLoading, needsOnboarding, markCompleted };
}
