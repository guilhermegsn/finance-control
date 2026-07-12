import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { database } from '../database';
import { sync } from '../service/sync';

interface AuthContextProps {
    user: User | null;
    session: Session | null;
    loading: boolean;
    loadingMessage: string | null;
    pendingEmail: string | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string) => Promise<void>;
    verifyEmailOtp: (email: string, token: string) => Promise<void>;
    cancelEmailLogin: () => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const [pendingEmail, setPendingEmail] = useState<string | null>(null);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            offlineAccess: true,
            scopes: ['profile', 'email'],
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            setLoadingMessage(null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            setLoading(true);
            await GoogleSignin.hasPlayServices();

            const response = await GoogleSignin.signIn();

            if (response.data?.idToken) {
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: response.data.idToken,
                });

                if (error) throw error;
            } else {
                throw new Error('No ID token present!');
            }
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('User cancelled the login flow');
            } else {
                console.error('Login Error:', error);
                throw error;
            }
        } finally {
            setLoading(false);
        }
    };

    const signInWithEmail = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true },
        });

        if (error) throw error;

        setPendingEmail(email);
    };

    const verifyEmailOtp = async (email: string, token: string) => {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });

        if (error) throw error;

        setPendingEmail(null);
    };

    const cancelEmailLogin = () => {
        setPendingEmail(null);
    };

    // Limpa o banco local e encerra a sessão. O banco é resetado ANTES do
    // signOut para que nenhum observer do próximo usuário veja dados antigos.
    const performLogout = async () => {
        setLoadingMessage('Saindo...');
        setLoading(true);
        try {
            try {
                await GoogleSignin.signOut();
            } catch {
                // ignorar se o usuário não estava logado com Google
            }
            // unsafeResetDatabase() precisa rodar dentro de um writer block
            await database.write(async () => {
                await database.unsafeResetDatabase();
            });
            await supabase.auth.signOut();
            // setLoading(false) é chamado pelo onAuthStateChange após o signOut
        } catch (error) {
            console.error('Erro ao sair da conta:', error);
            setLoading(false);
            setLoadingMessage(null);
        }
    };

    const signOut = async () => {
        // O logout apaga o banco local, então alterações pendentes precisam
        // subir ao servidor antes — senão são perdidas para sempre.
        setLoadingMessage('Salvando alterações...');
        setLoading(true);
        try {
            await sync();
        } catch (error) {
            console.error('Sync antes do logout falhou:', error);
            setLoading(false);
            setLoadingMessage(null);
            Alert.alert(
                'Alterações não salvas',
                'Não foi possível enviar suas alterações ao servidor. Se sair agora, elas serão perdidas. Deseja sair mesmo assim?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sair mesmo assim', style: 'destructive', onPress: () => { performLogout(); } },
                ]
            );
            return;
        }
        await performLogout();
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            loadingMessage,
            pendingEmail,
            signInWithGoogle,
            signInWithEmail,
            verifyEmailOtp,
            cancelEmailLogin,
            signOut,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
