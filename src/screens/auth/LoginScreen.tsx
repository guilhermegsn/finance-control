import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useFonts, Poppins_900Black } from '@expo-google-fonts/poppins';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
    const { signInWithGoogle, signInWithEmail } = useAuth();
    const { isDarkMode } = useTheme();

    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [loadingGoogle, setLoadingGoogle] = useState(false);

    const [fontsLoaded] = useFonts({ Poppins_900Black });
    if (!fontsLoaded) return null;

    const c = {
        bg: isDarkMode ? '#0D1117' : '#EEF2F7',
        card: isDarkMode ? '#161C27' : '#FFFFFF',
        textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
        textSecondary: isDarkMode ? '#718096' : '#64748B',
        divider: isDarkMode ? '#2D3748' : '#E2E8F0',
        accent: '#6366F1',
    };

    const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    const handleEmailLogin = async () => {
        if (!isValidEmail(email)) {
            setEmailError('Digite um e-mail válido.');
            return;
        }
        setEmailError('');
        setLoadingEmail(true);
        try {
            await signInWithEmail(email.trim().toLowerCase());
        } catch (e: any) {
            console.log(e)
            setEmailError(e.message ?? 'Erro ao enviar o código.');
        } finally {
            setLoadingEmail(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoadingGoogle(true);
        try {



            supabase.auth.onAuthStateChange((event, session) => {
                if (session) {
                    console.log('ACCESS TOKEN:', session.access_token)
                }
            })



            await signInWithGoogle();


        } catch (e) {
            console.log(e)
        } finally {
            setLoadingGoogle(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.root, { backgroundColor: c.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.inner}>
                <Text style={[styles.logo, { color: c.accent, fontFamily: 'Poppins_900Black' }]}>
                    ButterFlow
                </Text>
                <Text style={[styles.tagline, { color: c.textSecondary }]}>
                    Gerencie suas finanças com fluidez.
                </Text>

                <Surface style={[styles.card, { backgroundColor: c.card }]} elevation={2}>
                    <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
                        Entrar com e-mail
                    </Text>

                    <TextInput
                        label="E-mail"
                        value={email}
                        onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        mode="outlined"
                        style={styles.input}
                        error={!!emailError}
                        returnKeyType="send"
                        onSubmitEditing={handleEmailLogin}
                    />
                    {!!emailError && (
                        <HelperText type="error">{emailError}</HelperText>
                    )}

                    <Button
                        mode="contained"
                        onPress={handleEmailLogin}
                        loading={loadingEmail}
                        disabled={loadingEmail || loadingGoogle}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Enviar código
                    </Button>

                    <View style={[styles.dividerRow, { borderColor: c.divider }]}>
                        <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
                        <Text style={[styles.dividerText, { color: c.textSecondary }]}>ou</Text>
                        <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
                    </View>

                    <Button
                        icon="google"
                        mode="outlined"
                        onPress={handleGoogleLogin}
                        loading={loadingGoogle}
                        disabled={loadingEmail || loadingGoogle}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Entrar com Google
                    </Button>
                </Surface>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logo: {
        fontSize: 36,
        textAlign: 'center',
        marginBottom: 4,
    },
    tagline: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 32,
    },
    card: {
        borderRadius: 16,
        padding: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    input: {
        marginBottom: 4,
    },
    button: {
        marginTop: 12,
        borderRadius: 8,
    },
    buttonContent: {
        paddingVertical: 4,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 4,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 12,
        fontSize: 13,
    },
});
