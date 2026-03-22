import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { sync } from './sync';

/**
 * Hook para gerenciar sincronização automática baseada em AppState.
 * Implementa prevenção de concorrência (mutex) e tratamento de erros silencioso.
 * OBS: NetInfo não está incluído por padrão no projeto. Para adicionar monitoramento
 * de conexão, instale: `expo install @react-native-community/netinfo`
 * 
 * @returns {Object} Objeto contendo estado de sincronização e função para forçar sync
 */
export function useAutoSync() {
  // Estado para UI saber se está sincronizando
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Mutex (lock) para prevenir concorrência
  const isSyncingRef = useRef(false);
  
  // Função wrapper que adiciona mutex e tratamento de erros silencioso
  const performSync = useCallback(async (trigger: string = 'manual') => {
    // Verificar mutex - se já está sincronizando, ignorar nova tentativa
    if (isSyncingRef.current) {
      console.log(`🔄 [${trigger}] Sincronização já em andamento, ignorando...`);
      return;
    }
    
    try {
      console.log(`🔄 [${trigger}] Iniciando sincronização automática...`);
      isSyncingRef.current = true;
      setIsSyncing(true);
      
      // Executar sincronização - função sync já tem seu próprio try/catch interno
      await sync();
      
      console.log(`✅ [${trigger}] Sincronização automática concluída com sucesso`);
    } catch (error) {
      // Erro silencioso: apenas log para debug, sem interromper o app ou mostrar UI
      console.error(`❌ [${trigger}] Erro na sincronização automática:`, error);
      // Não propagar o erro - o WatermelonDB tentará novamente na próxima oportunidade
    } finally {
      // Liberar mutex independentemente do resultado
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);
  
  // Efeito para configurar listeners de AppState
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`📱 AppState mudou para: ${nextAppState}`);
      
      // Gatilho 1: App voltou para ativo (usuário abriu o app ou voltou de outro app)
      if (nextAppState === 'active') {
        performSync('app_state_active');
      }
    };
    
    // Adicionar listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Limpeza
    return () => {
      subscription.remove();
    };
  }, [performSync]);
  
  // Função para forçar sincronização manual (útil para botões na UI)
  const forceSync = useCallback(async () => {
    await performSync('manual');
  }, [performSync]);
  
  return {
    isSyncing,
    forceSync,
  };
}

/**
 * Hook simplificado que retorna apenas o estado de sincronização
 * Útil para componentes que só precisam saber se está sincronizando
 */
export function useSyncStatus() {
  const { isSyncing } = useAutoSync();
  return isSyncing;
}

/**
 * Função auxiliar para adicionar NetInfo no futuro
 * Instale: `expo install @react-native-community/netinfo`
 * E importe: import NetInfo from '@react-native-community/netinfo';
 */
export function addNetInfoSupport() {
  console.warn('NetInfo não está configurado. Para adicionar monitoramento de conexão:');
  console.warn('1. Instale: expo install @react-native-community/netinfo');
  console.warn('2. Importe no useAutoSync.ts');
  console.warn('3. Adicione o listener de mudança de conexão');
}

export default useAutoSync;
