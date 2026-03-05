import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../database';
import { supabase } from '../lib/supabase';

// Tabelas a serem sincronizadas
const TABLES = ['accounts', 'categories', 'transactions'];

export async function sync() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        // Se o token expirou e o auto-refresh falhou, precisamos re-autenticar
        console.error("Sessão inválida ou expirada. Tentando refresh...");
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) throw new Error("Sessão expirada. Faça login novamente.");
    }

    await synchronize({
        database,
        // 1. PULL
        pullChanges: async ({ lastPulledAt }) => {
            console.log('PULL: Baixando mudanças desde', lastPulledAt);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            const changes: any = {};

            for (const table of TABLES) {

                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .gt('updated_at', new Date(lastPulledAt || 0).toISOString());

                if (error) throw new Error(`Erro ao puxar ${table}: ${error.message}`);

                const created: any[] = [];
                const updated: any[] = [];
                const deleted: string[] = [];

                (data || []).forEach((item) => {
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

                // <--- A MÁGICA FALTANDO: Gravar no objeto de mudanças!
                changes[table] = { created, updated, deleted };
            }

            const timestamp = new Date().getTime();
            return { changes, timestamp };
        },

        // 2. PUSH
        pushChanges: async ({ changes }) => {
            console.log('PUSH: Enviando mudanças locais...');

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado');
            const userId = session.user.id;

            for (const table of TABLES) {

                const tableChanges = (changes as any)[table];

                if (!tableChanges) continue;

                // A. Criados Offline
                if (tableChanges.created.length > 0) {

                    const records = tableChanges.created.map((record: any) => {
                        // Garante que pegamos os dados mesmo que record._raw falhe
                        const data = record._raw || record;

                        // Extraímos o que não queremos e pegamos o resto (dataClean)
                        const { _status, _changed, id, ...dataClean } = data;

                        return {
                            ...dataClean,
                            id: record.id,
                            user_id: userId,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            deleted_at: null,
                        };
                    });

                    const { error } = await supabase.from(table).insert(records);
                    if (error) throw new Error(`Erro ao inserir em ${table}: ${error.message}`);
                }

                // B. Atualizados Offline
                if (tableChanges.updated.length > 0) {
                    const records = tableChanges.updated.map((record: any) => {
                        const data = record._raw || record;
                        const { _status, _changed, id, ...dataClean } = data;

                        return {
                            ...dataClean,
                            id: record.id,
                            user_id: userId,
                            updated_at: new Date().toISOString(),
                        };
                    });

                    const { error } = await supabase.from(table).upsert(records);
                    if (error) throw new Error(`Erro ao atualizar em ${table}: ${error.message}`);
                }

                /// C. Deletados Offline -> Soft Delete no Supabase
                if (tableChanges.deleted.length > 0) {
                    const ids = tableChanges.deleted;
                    console.log(`🗑️ Tentando deletar ${ids.length} registros da tabela ${table}:`, ids);

                    const { data, error, status } = await supabase
                        .from(table)
                        .update({
                            deleted_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .in('id', ids)
                        .eq('user_id', userId) // Garante que só deleta o que é do user
                        .select(); // Força o retorno para confirmarmos o update

                    if (error) {
                        console.error(`Erro no Soft Delete de ${table}:`, error.message);
                    } else {
                        console.log(`✅ Sucesso! Registros atualizados no Supabase:`, data?.length);
                    }
                }
            }
        },
    });
}