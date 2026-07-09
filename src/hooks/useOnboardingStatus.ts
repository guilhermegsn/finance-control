import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccountService } from '../service/AccountService';

const ONBOARDING_STORAGE_KEY = '@finance-control:onboarding-completed';

export function useOnboardingStatus(userId: string | undefined, syncResolved: boolean) {
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
        if (cancelled) return;
        if (flag === 'true') {
          setNeedsOnboarding(false);
          setIsLoading(false);
          return;
        }

        // Flag not set yet (first run, or upgrading from a version without onboarding).
        // Só decidimos depois que o primeiro sync (pull do Supabase) resolver — sucesso ou
        // tentativas esgotadas — senão o banco local ainda pode estar vazio e mandaríamos
        // pro onboarding um usuário que já tem conta cadastrada em outro aparelho.
        if (!syncResolved) return;

        const accounts = await AccountService.fetchAll();
        if (cancelled) return;
        if (accounts.length > 0) {
          await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
          if (!cancelled) setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(true);
        }
        if (!cancelled) setIsLoading(false);
      } catch (error) {
        console.error('Erro ao verificar status de onboarding:', error);
        if (!cancelled) {
          setNeedsOnboarding(false);
          setIsLoading(false);
        }
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [userId, syncResolved]);

  const markCompleted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setNeedsOnboarding(false);
  }, []);

  return { isLoading, needsOnboarding, markCompleted };
}
