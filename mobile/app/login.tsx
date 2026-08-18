import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ErrorBanner } from '@/components/ErrorBanner';
import { colors } from '@/theme/colors';
import { API_ENV_NAME } from '@/lib/env';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { user, isRestoring, isLoggingIn, loginError, signIn } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (!isRestoring && user) {
    return <Redirect href="/(app)/dashboard" />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    await signIn(values);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>PPS</Text>
          </View>
          <Text style={styles.title}>PPS Asset Scanner</Text>
          <Text style={styles.subtitle}>
            Sign in with your PPS License Manager account
          </Text>
        </View>

        <View style={styles.form}>
          {loginError ? <ErrorBanner message={loginError} /> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="you@company.com"
                  placeholderTextColor={colors.slate400}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="username"
                  accessibilityLabel="Email address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!isLoggingIn}
                />
              )}
            />
            {errors.email ? (
              <Text style={styles.fieldError}>{errors.email.message}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.slate400}
                  secureTextEntry
                  textContentType="password"
                  accessibilityLabel="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!isLoggingIn}
                />
              )}
            />
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            ) : null}
          </View>

          <PrimaryButton
            label="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={isLoggingIn}
            style={styles.submit}
          />
        </View>

        <Text style={styles.envTag}>{API_ENV_NAME} environment</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.blue500,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoMarkText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.slate900,
  },
  subtitle: {
    fontSize: 13,
    color: colors.slate400,
    marginTop: 6,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate700,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.slate900,
    backgroundColor: colors.white,
  },
  fieldError: {
    fontSize: 12,
    color: colors.red600,
  },
  submit: {
    marginTop: 8,
  },
  envTag: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 11,
    color: colors.slate400,
  },
});
