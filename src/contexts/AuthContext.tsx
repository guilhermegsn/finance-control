import React, { createContext, useState, useEffect, useContext } from 'react';
import { GoogleSignin, statusCodes, User as GoogleUser } from '@react-native-google-signin/google-signin';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextProps {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Configurar Google Sign-In
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            offlineAccess: true,
            scopes: ['profile', 'email'],
        });

        // 2. Verificar sessão existente no Supabase
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // 3. Escutar mudanças de estado (Login/Logout)
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

            // A MUDANÇA ESTÁ AQUI:
            const response = await GoogleSignin.signIn();

            // Agora o idToken fica dentro de 'response.data'
            if (response.data?.idToken) {
                console.log('Got ID Token:', response.data.idToken)

                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: response.data.idToken,
                });

                if (error) {
                    console.error('Erro no Supabase:', error);
                    throw error;
                }
            } else {
                // Se o login for cancelado ou falhar silenciosamente
                console.log('Sign in response:', response);
                throw new Error('No ID token present!');
            }
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('User cancelled the login flow');
            } else {
                console.error('Login Error:', error);
                alert('Erro ao logar: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };


    const signOut = async () => {
        try {
            await GoogleSignin.signOut();
            await supabase.auth.signOut();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);