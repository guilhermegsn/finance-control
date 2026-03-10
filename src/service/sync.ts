import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../database';
import { supabase } from '../lib/supabase';

// Tabelas a serem sincronizadas - INCLUINDO credit_cards que está no schema
const TABLES = ['accounts', 'categories', 'transactions', 'credit_cards'];

// Função para converter timestamp do WatermelonDB (número) para ISO string do Supabase
function convertToISODate(timestamp: number | null | undefined): string {
    if (!timestamp) return new Date(0).toISOString(); // Data zero se não houver timestamp
    // WatermelonDB armazena timestamps em milissegundos
    return new Date(timestamp).toISOString();
}

// Função para converter ISO string do Supabase para timestamp do WatermelonDB
function convertToTimestamp(isoString: string | null): number {
    if (!isoString) return 0;
    return new Date(isoString).getTime();
}

// Função para verificar se uma tabela existe no Supabase
async function tableExists(tableName: string): Promise<boolean> {
    try {
        // Tenta fazer uma query simples para verificar se a tabela existe
        const { error } = await supabase
            .from(tableName)
            .select('id')
            .limit(1);
        
        // Se não há erro ou o erro não é "tabela não existe", a tabela existe
        if (!error || (error && !error.message.includes('does not exist') && !error.message.includes('relation'))) {
            return true;
        }
        return false;
    } catch (error) {
        console.warn(`⚠️ Não foi possível verificar a tabela ${tableName}:`, error);
        return false;
    }
}

export async function sync() {
    try {
        console.log('🔁 Iniciando sincronização...');
        
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error("Sessão inválida ou expirada. Tentando refresh...");
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
                console.error("Falha no refresh da sessão:", refreshError);
                throw new Error("Sessão expirada. Faça login novamente.");
            }
            
            if (!refreshData?.session) {
                throw new Error("Não foi possível renovar a sessão. Faça login novamente.");
            }
        }

        // Filtrar apenas tabelas que existem no Supabase
        const existingTables: string[] = [];
        for (const table of TABLES) {
            if (await tableExists(table)) {
                existingTables.push(table);
                console.log(`✅ Tabela ${table} existe no Supabase`);
            } else {
                console.warn(`⚠️ Tabela ${table} não existe no Supabase. Pulando...`);
            }
        }

        if (existingTables.length === 0) {
            console.warn('⚠️ Nenhuma tabela existente para sincronizar');
            return;
        }

        await synchronize({
            database,
            // 1. PULL - Baixar mudanças do Supabase
            pullChanges: async ({ lastPulledAt }) => {
                console.log('📥 PULL: Baixando mudanças desde', lastPulledAt);

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Usuário não autenticado');

                const changes: any = {};
                const userId = session.user.id;

                for (const table of existingTables) {
                    try {
                        // Converter timestamp do WatermelonDB para ISO string
                        const lastPulledAtISO = convertToISODate(lastPulledAt);
                        
                        // Buscar registros atualizados desde a última sincronização
                        // Filtra também por user_id para garantir que só pega dados do usuário atual
                        const { data, error } = await supabase
                            .from(table)
                            .select('*')
                            .gt('updated_at', lastPulledAtISO)
                            .eq('user_id', userId)
                            .order('updated_at', { ascending: true });

                        if (error) {
                            console.error(`Erro ao buscar ${table}:`, error);
                            throw new Error(`Erro ao puxar ${table}: ${error.message}`);
                        }

                        const created: any[] = [];
                        const updated: any[] = [];
                        const deleted: string[] = [];

                        (data || []).forEach((item) => {
                            // Converter timestamps ISO para números (WatermelonDB)
                            const itemWithTimestamps = {
                                ...item,
                                created_at: convertToTimestamp(item.created_at),
                                updated_at: convertToTimestamp(item.updated_at),
                                deleted_at: item.deleted_at ? convertToTimestamp(item.deleted_at) : null,
                            };

                            if (item.deleted_at) {
                                deleted.push(item.id);
                            } else {
                                if (!lastPulledAt) {
                                    created.push(itemWithTimestamps);
                                } else {
                                    updated.push(itemWithTimestamps);
                                }
                            }
                        });

                        changes[table] = { created, updated, deleted };
                        console.log(`📊 ${table}: ${created.length} criados, ${updated.length} atualizados, ${deleted.length} deletados`);
                    } catch (error) {
                        console.error(`Erro ao processar tabela ${table}:`, error);
                        throw error;
                    }
                }

                const timestamp = new Date().getTime();
                console.log('✅ PULL concluído. Timestamp:', timestamp);
                return { changes, timestamp };
            },

            // 2. PUSH - Enviar mudanças locais para o Supabase
            pushChanges: async ({ changes }) => {
                console.log('📤 PUSH: Enviando mudanças locais...');

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Usuário não autenticado');
                const userId = session.user.id;

                for (const table of existingTables) {
                    const tableChanges = (changes as any)[table];
                    if (!tableChanges) continue;

                    console.log(`📦 Processando ${table}: ${tableChanges.created?.length || 0} criados, ${tableChanges.updated?.length || 0} atualizados, ${tableChanges.deleted?.length || 0} deletados`);

                    // A. Criados Offline
                    if (tableChanges.created && tableChanges.created.length > 0) {
                        const records = tableChanges.created.map((record: any) => {
                            // Garante que pegamos os dados mesmo que record._raw falhe
                            const data = record._raw || record;

                            // Extraímos campos internos do WatermelonDB
                            const { _status, _changed, id, created_at, updated_at, deleted_at, ...dataClean } = data;

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
                        if (error) {
                            console.error(`Erro ao inserir em ${table}:`, error);
                            throw new Error(`Erro ao inserir em ${table}: ${error.message}`);
                        }
                        console.log(`✅ ${table}: ${records.length} registros inseridos`);
                    }

                    // B. Atualizados Offline
                    if (tableChanges.updated && tableChanges.updated.length > 0) {
                        const records = tableChanges.updated.map((record: any) => {
                            const data = record._raw || record;
                            const { _status, _changed, id, created_at, updated_at, deleted_at, ...dataClean } = data;

                            return {
                                ...dataClean,
                                id: record.id,
                                user_id: userId,
                                updated_at: new Date().toISOString(),
                            };
                        });

                        const { error } = await supabase.from(table).upsert(records);
                        if (error) {
                            console.error(`Erro ao atualizar em ${table}:`, error);
                            throw new Error(`Erro ao atualizar em ${table}: ${error.message}`);
                        }
                        console.log(`✅ ${table}: ${records.length} registros atualizados`);
                    }

                    // C. Deletados Offline -> Soft Delete no Supabase
                    if (tableChanges.deleted && tableChanges.deleted.length > 0) {
                        const ids = tableChanges.deleted;
                        console.log(`🗑️ ${table}: Tentando soft delete de ${ids.length} registros`);

                        const { data, error } = await supabase
                            .from(table)
                            .update({
                                deleted_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .in('id', ids)
                            .eq('user_id', userId)
                            .select();

                        if (error) {
                            console.error(`Erro no soft delete de ${table}:`, error);
                            throw new Error(`Erro ao deletar em ${table}: ${error.message}`);
                        } else {
                            console.log(`✅ ${table}: ${data?.length || 0} registros marcados como deletados`);
                        }
                    }
                }
                
                console.log('✅ PUSH concluído com sucesso');
            },
            
            // 3. Configurações adicionais
            // migrationsEnabledAtVersion: 1, // Removido - causa erro em banco de dados sem suporte a migrações
            sendCreatedAsUpdated: true, // Envia registros criados como atualizados para evitar conflitos
        });
        
        console.log('🎉 Sincronização concluída com sucesso!');
    } catch (error: any) {
        console.error('❌ Erro na sincronização:', error);
        throw error;
    }
}
