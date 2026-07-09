import React, { createContext, useState, useEffect, useContext } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { database } from '../database';

interface AuthContextProps {
    user: User | null;
    session: Session | null;
    loading: boolean;
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

    const signOut = async () => {
        // Bloqueia a UI imediatamente para evitar que o novo login comece
        // antes do banco local estar limpo
        setLoading(true);
        try {
            try {
                await GoogleSignin.signOut();
            } catch {
                // ignorar se o usuário não estava logado com Google
            }
            // Reseta o banco ANTES do signOut para garantir que nenhum observer
            // do novo usuário encontre dados do usuário anterior.
            // unsafeResetDatabase() precisa rodar dentro de um writer block.
            await database.write(async () => {
                await database.unsafeResetDatabase();
            });
            await supabase.auth.signOut();
            // setLoading(false) é chamado pelo onAuthStateChange após o signOut
        } catch (error) {
            console.error('Erro ao sair da conta:', error);
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
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
