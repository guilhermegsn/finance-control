import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { sync } from './sync';
import { useAuth } from '../contexts/AuthContext';

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000]; // 3 tentativas: 5s, 15s, 30s

export function useAutoSync() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncGaveUp, setSyncGaveUp] = useState(false);
  const isSyncingRef = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const performSync = useCallback(async (trigger: string = 'manual', attempt = 0) => {
    if (!user) {
      console.log(`🔄 [${trigger}] Sem sessão ativa, sync ignorado.`);
      return;
    }

    if (isSyncingRef.current) {
      console.log(`🔄 [${trigger}] Sincronização já em andamento, ignorando...`);
      return;
    }

    clearRetry();

    try {
      console.log(`🔄 [${trigger}] Iniciando sincronização (tentativa ${attempt + 1})...`);
      isSyncingRef.current = true;
      setIsSyncing(true);
      await sync();
      setLastSyncedAt(Date.now());
      setSyncGaveUp(false);
      console.log(`✅ [${trigger}] Sincronização concluída com sucesso`);
    } catch (error) {
      console.error(`❌ [${trigger}] Erro na sincronização:`, error);

      const delay = RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) {
        console.log(`🔁 [${trigger}] Retry em ${delay / 1000}s (tentativa ${attempt + 2}/${RETRY_DELAYS_MS.length + 1})`);
        retryTimeoutRef.current = setTimeout(() => {
          performSync(trigger, attempt + 1);
        }, delay);
      } else {
        console.log(`⛔ [${trigger}] Todas as tentativas esgotadas.`);
        setSyncGaveUp(true);
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user, clearRetry]);

  // Roda sync e registra listeners apenas quando autenticado.
  // Dispara quando user?.id muda: cobre login, sessão restaurada e logout.
  useEffect(() => {
    if (!user) {
      clearRetry();
      return;
    }

    // Novo usuário logado: descarta o resultado do sync anterior (relevante em
    // troca de conta no mesmo aparelho) antes de disparar a sincronização.
    setLastSyncedAt(null);
    setSyncGaveUp(false);
    performSync('auth_ready');

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        performSync('app_state_active');
      }
    };
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription.remove();
      clearRetry();
    };
  }, [user?.id, performSync, clearRetry]);

  const forceSync = useCallback(() => performSync('manual'), [performSync]);

  return { isSyncing, lastSyncedAt, syncGaveUp, forceSync };
}

export function useSyncStatus() {
  const { isSyncing } = useAutoSync();
  return isSyncing;
}

export default useAutoSync;
