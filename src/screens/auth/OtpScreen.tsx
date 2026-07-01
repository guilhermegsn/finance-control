import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput as RNTextInput } from 'react-native';
import { Text, Button, Surface, HelperText, TouchableRipple } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const RESEND_COOLDOWN = 60;

export default function OtpScreen() {
    const { pendingEmail, verifyEmailOtp, signInWithEmail, cancelEmailLogin } = useAuth();
    const { isDarkMode } = useTheme();

    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
    const inputRef = useRef<RNTextInput>(null);

    const c = {
        bg: isDarkMode ? '#0D1117' : '#EEF2F7',
        card: isDarkMode ? '#161C27' : '#FFFFFF',
        textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
        textSecondary: isDarkMode ? '#718096' : '#64748B',
        accent: '#6366F1',
        otpBorder: isDarkMode ? '#2D3748' : '#CBD5E0',
        otpBorderActive: '#6366F1',
        otpBg: isDarkMode ? '#1A2233' : '#F7FAFC',
    };

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((v) => v - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleVerify = async () => {
        if (otp.length !== 6) {
            setOtpError('Digite o código de 6 dígitos.');
            return;
        }
        setOtpError('');
        setLoading(true);
        try {
            await verifyEmailOtp(pendingEmail!, otp);
        } catch (e: any) {
            setOtpError(e.message ?? 'Código inválido. Tente novamente.');
            setOtp('');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        try {
            await signInWithEmail(pendingEmail!);
            setResendCooldown(RESEND_COOLDOWN);
            setOtp('');
            setOtpError('');
        } catch (e: any) {
            setOtpError(e.message ?? 'Erro ao reenviar o código.');
        }
    };

    const handleOtpChange = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 6);
        setOtp(digits);
        setOtpError('');
    };

    // Renderiza 6 boxes visuais sobre um TextInput transparente
    const renderOtpBoxes = () => (
        <TouchableRipple onPress={() => inputRef.current?.focus()} style={styles.otpTouchArea}>
            <View style={styles.otpRow}>
                {Array.from({ length: 6 }).map((_, i) => {
                    const char = otp[i] ?? '';
                    const isActive = otp.length === i;
                    return (
                        <View
                            key={i}
                            style={[
                                styles.otpBox,
                                {
                                    backgroundColor: c.otpBg,
                                    borderColor: isActive ? c.otpBorderActive : c.otpBorder,
                                    borderWidth: isActive ? 2 : 1,
                                },
                            ]}
                        >
                            <Text style={[styles.otpChar, { color: c.textPrimary }]}>{char}</Text>
                        </View>
                    );
                })}
                <RNTextInput
                    ref={inputRef}
                    value={otp}
                    onChangeText={handleOtpChange}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.hiddenInput}
                    autoFocus
                    caretHidden
                />
            </View>
        </TouchableRipple>
    );

    return (
        <KeyboardAvoidingView
            style={[styles.root, { backgroundColor: c.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.inner}>
                <Surface style={[styles.card, { backgroundColor: c.card }]} elevation={2}>
                    <Text style={[styles.title, { color: c.textPrimary }]}>Verifique seu e-mail</Text>
                    <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                        Enviamos um código de 6 dígitos para
                    </Text>
                    <Text style={[styles.email, { color: c.accent }]} numberOfLines={1}>
                        {pendingEmail}
                    </Text>

                    <View style={styles.otpContainer}>
                        {renderOtpBoxes()}
                    </View>

                    {!!otpError && (
                        <HelperText type="error" style={styles.errorText}>{otpError}</HelperText>
                    )}

                    <Button
                        mode="contained"
                        onPress={handleVerify}
                        loading={loading}
                        disabled={loading || otp.length < 6}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Verificar
                    </Button>

                    <View style={styles.resendRow}>
                        <Text style={[styles.resendText, { color: c.textSecondary }]}>
                            Não recebeu?{' '}
                        </Text>
                        <TouchableRipple
                            onPress={handleResend}
                            disabled={resendCooldown > 0}
                            borderless
                        >
                            <Text style={[
                                styles.resendLink,
                                { color: resendCooldown > 0 ? c.textSecondary : c.accent },
                            ]}>
                                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar'}
                            </Text>
                        </TouchableRipple>
                    </View>

                    <Button
                        mode="text"
                        onPress={cancelEmailLogin}
                        style={styles.backButton}
                        textColor={c.textSecondary}
                    >
                        Voltar
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
    card: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    email: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 2,
        marginBottom: 28,
        maxWidth: '100%',
    },
    otpContainer: {
        width: '100%',
        marginBottom: 8,
    },
    otpTouchArea: {
        borderRadius: 8,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        position: 'relative',
    },
    otpBox: {
        flex: 1,
        height: 52,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpChar: {
        fontSize: 22,
        fontWeight: '700',
    },
    hiddenInput: {
        position: 'absolute',
        opacity: 0,
        width: 1,
        height: 1,
    },
    errorText: {
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    button: {
        marginTop: 16,
        borderRadius: 8,
        width: '100%',
    },
    buttonContent: {
        paddingVertical: 4,
    },
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    resendText: {
        fontSize: 14,
    },
    resendLink: {
        fontSize: 14,
        fontWeight: '600',
    },
    backButton: {
        marginTop: 8,
    },
});
