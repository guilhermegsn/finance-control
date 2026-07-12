import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../database';
import { supabase } from '../lib/supabase';

const TABLES = [
  'accounts',      // 1º (Pai de todos)
  'categories',    // 2º (Pai das transações)
  'credit_cards',  // 3º (Filho da conta, mas pai das transações)
  'transactions',  // 4º (Filho de todo mundo - o último a ser salvo)
  'portfolios'     // 5º (Independente - carteira de ações do Sentinela)
];

// Helper simples para garantir que temos um número (timestamp)
function ensureTimestamp(timestamp: number | null | undefined): number {
  return timestamp || Date.now();
}

export async function sync() {
  try {
    console.log('🔁 Iniciando sincronização...');

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) throw new Error("Sessão expirada. Faça login novamente.");
    const userId = session.user.id;

    await synchronize({
      database,
      // 1. PULL - Baixar mudanças (Filtro por número)
      pullChanges: async ({ lastPulledAt }) => {
        console.log('📥 PULL: Baixando mudanças desde', lastPulledAt);
        const changes: any = {};

        for (const table of TABLES) {
          // FILTRO COM NÚMERO (lastPulledAt ou 0)
          // Categorias de sistema são globais (user_id NULL) e visíveis a todos
          const baseQuery = supabase
            .from(table)
            .select('*')
            .gt('updated_at', lastPulledAt || 0);

          const { data, error } = table === 'categories'
            ? await baseQuery.or(`user_id.eq.${userId},user_id.is.null`)
            : await baseQuery.eq('user_id', userId);

          if (error) throw new Error(`Erro ao puxar ${table}: ${error.message}`);

          console.log(`📥 ${table}: ${data?.length ?? 0} registro(s) recebido(s)`);

          const created: any[] = [];
          const updated: any[] = [];
          const deleted: string[] = [];

          (data || []).forEach((item) => {
            // Não convertemos nada! Deixamos os números virem do Supabase
            if (item.deleted_at) {
              deleted.push(item.id);
            } else {
              if (!lastPulledAt) {
                created.push(item);
              } else {
                updated.push(item);
              }
            }
          });

          changes[table] = { created, updated, deleted };
        }

        const timestamp = Date.now();
        return { changes, timestamp };
      },

      // 2. PUSH - Enviar mudanças (Sempre enviando números)
      pushChanges: async ({ changes }) => {
        console.log('📤 PUSH: Enviando mudanças locais...');

        for (const table of TABLES) {
          const tableChanges = (changes as any)[table];
          if (!tableChanges) continue;

          // Categorias de sistema são globais e read-only: nunca enviar ao servidor
          const isPushable = (record: any) => {
            const data = record._raw || record;
            return !(table === 'categories' && data.is_system);
          };

          // A. CRIADOS
          if (tableChanges.created?.filter(isPushable).length > 0) {
            const records = tableChanges.created.filter(isPushable).map((record: any) => {
              const data = record._raw || record;
              const { _status, _changed, ...dataClean } = data;

              return {
                ...dataClean,
                user_id: userId,
                // USANDO NÚMEROS (Date.now)
                created_at: ensureTimestamp(data.created_at),
                updated_at: Date.now(),
                deleted_at: null
              };
            });
            // upsert (não insert): se um push anterior falhou no meio, o retry
            // reenvia registros que já existem no servidor — upsert é idempotente
            const { error } = await supabase.from(table).upsert(records);
            if (error) throw new Error(`Erro ao inserir ${table}: ${error.message}`);
          }

          // B. ATUALIZADOS
          if (tableChanges.updated?.filter(isPushable).length > 0) {
            const records = tableChanges.updated.filter(isPushable).map((record: any) => {
              const data = record._raw || record;
              const { _status, _changed, ...dataClean } = data;

              return {
                ...dataClean,
                user_id: userId,
                updated_at: Date.now()
              };
            });
            const { error } = await supabase.from(table).upsert(records);
            if (error) throw new Error(`Erro ao atualizar ${table}: ${error.message}`);
          }

          // C. DELETADOS (Soft Delete com número)
          if (tableChanges.deleted?.length > 0) {
            const { error } = await supabase
              .from(table)
              .update({
                deleted_at: Date.now(),
                updated_at: Date.now()
              })
              .in('id', tableChanges.deleted)
              .eq('user_id', userId);

            if (error) throw new Error(`Erro ao deletar ${table}: ${error.message}`);
          }
        }
      },
    });

    console.log('🎉 Sincronização concluída!');
  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error);
    throw error;
  }
}