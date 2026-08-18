import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDepartments } from '@/api/departments';
import { createAsset } from '@/api/assets';
import { ASSET_TYPES, newAssetSchema, NewAssetFormValues, toCreateAssetRequest } from '@/lib/asset-form';
import { useAuth, canManageAssets } from '@/lib/auth-context';
import { useIsOnline } from '@/lib/network';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ErrorBanner } from '@/components/ErrorBanner';
import { colors } from '@/theme/colors';
import { ApiError } from '@/types/api';

// "Quickly enter new assets" - a field tech finding an asset that
// isn't in the system yet shouldn't have to walk to a desktop to log
// it. This reuses the existing POST /Asset the web app's own Asset
// Management form already calls (see src/api/assets.ts's createAsset
// doc comment) - no new backend surface, no second place assets get
// created from. Gated to Super Admin/IT Admin in the UI to match every
// other asset-mutating screen (Transfer, Audit) - the server is still
// the final authority (it does not yet enforce a role restriction on
// this particular endpoint, since it predates this app; the same gap
// exists for the web app's own Create button).
export default function NewAssetScreen() {
  const router = useRouter();
  const { assetTag: scannedTag } = useLocalSearchParams<{ assetTag?: string }>();
  const isOnline = useIsOnline();
  const { user } = useAuth();
  const canManage = canManageAssets(user?.role);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: canManage,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewAssetFormValues>({
    resolver: zodResolver(newAssetSchema),
    defaultValues: {
      assetTag: scannedTag ?? '',
      assetName: '',
      assetType: 'Laptop',
      departmentId: undefined as unknown as number,
      manufacturer: '',
      model: '',
      serialNumber: '',
      remarks: '',
    },
  });

  const selectedType = watch('assetType');
  const selectedDepartmentId = watch('departmentId');

  if (!canManage) {
    return (
      <View style={styles.centered}>
        <ErrorBanner message="You don't have permission to add assets." />
      </View>
    );
  }

  const onSubmit = async (values: NewAssetFormValues) => {
    setSubmitError(null);

    if (!isOnline) {
      setSubmitError(
        "You're offline. Adding an asset needs a live connection - it isn't queued like an audit scan."
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await createAsset(toCreateAssetRequest(values));
      router.replace(`/(app)/asset/${created.id}`);
    } catch (err) {
      const apiError = err as ApiError;
      setSubmitError(apiError.message ?? 'Could not create this asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeDepartments = (departmentsQuery.data ?? []).filter((d) => d.isActive);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {scannedTag ? (
          <View style={styles.scannedNote}>
            <Text style={styles.scannedNoteText}>
              Pre-filled from the scanned code below - not yet in the system.
            </Text>
          </View>
        ) : null}

        <Panel title="Asset Details" subtitle="Required to create the record">
          <View style={styles.field}>
            <Text style={styles.label}>Asset Tag</Text>
            <Controller
              control={control}
              name="assetTag"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. AST-0042"
                  placeholderTextColor={colors.slate400}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel="Asset Tag"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!submitting}
                />
              )}
            />
            {errors.assetTag ? (
              <Text style={styles.fieldError}>{errors.assetTag.message}</Text>
            ) : (
              <Text style={styles.hint}>
                Must be unique - matches the code printed on the physical label.
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Asset Name</Text>
            <Controller
              control={control}
              name="assetName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Dell Latitude 5440"
                  placeholderTextColor={colors.slate400}
                  accessibilityLabel="Asset Name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!submitting}
                />
              )}
            />
            {errors.assetName ? (
              <Text style={styles.fieldError}>{errors.assetName.message}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Asset Type</Text>
            <View style={styles.pillRow}>
              {ASSET_TYPES.map((type) => {
                const selected = selectedType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setValue('assetType', type, { shouldValidate: true })}
                    disabled={submitting}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                  >
                    <Text
                      style={[styles.optionLabel, selected && styles.optionLabelSelected]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.assetType ? (
              <Text style={styles.fieldError}>{errors.assetType.message}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            {departmentsQuery.isLoading ? (
              <ActivityIndicator color={colors.blue500} style={{ marginTop: 6 }} />
            ) : (
              <View style={{ gap: 6, marginTop: 6 }}>
                {activeDepartments.map((dept) => {
                  const selected = selectedDepartmentId === dept.id;
                  return (
                    <Pressable
                      key={dept.id}
                      onPress={() =>
                        setValue('departmentId', dept.id, { shouldValidate: true })
                      }
                      disabled={submitting}
                      style={[styles.optionRow, selected && styles.optionRowSelected]}
                    >
                      <Text
                        style={[styles.optionLabel, selected && styles.optionLabelSelected]}
                      >
                        {dept.departmentName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {errors.departmentId ? (
              <Text style={styles.fieldError}>{errors.departmentId.message}</Text>
            ) : null}
          </View>
        </Panel>

        <Panel
          title="Additional Details"
          subtitle="Optional - full specs can be added later in the web app"
        >
          <View style={styles.field}>
            <Text style={styles.label}>Manufacturer</Text>
            <Controller
              control={control}
              name="manufacturer"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Dell"
                  placeholderTextColor={colors.slate400}
                  accessibilityLabel="Manufacturer"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!submitting}
                />
              )}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Model</Text>
            <Controller
              control={control}
              name="model"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Latitude 5440"
                  placeholderTextColor={colors.slate400}
                  accessibilityLabel="Model"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!submitting}
                />
              )}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Serial Number</Text>
            <Controller
              control={control}
              name="serialNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  placeholderTextColor={colors.slate400}
                  autoCapitalize="characters"
                  accessibilityLabel="Serial Number"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!submitting}
                />
              )}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Remarks</Text>
            <Controller
              control={control}
              name="remarks"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Optional notes"
                  placeholderTextColor={colors.slate400}
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Remarks"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!submitting}
                />
              )}
            />
          </View>
        </Panel>

        {submitError ? <ErrorBanner message={submitError} /> : null}

        <PrimaryButton
          label="Create Asset"
          loading={submitting}
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: 4 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.slate50,
  },
  scannedNote: {
    backgroundColor: colors.blue50,
    borderRadius: 10,
    padding: 12,
  },
  scannedNoteText: { fontSize: 12, color: colors.blue600 },
  field: { gap: 6, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
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
  multiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  fieldError: { fontSize: 12, color: colors.red600 },
  hint: { fontSize: 12, color: colors.slate400 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  optionRow: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  optionRowSelected: {
    borderColor: colors.blue500,
    backgroundColor: colors.blue50,
  },
  optionLabel: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
  optionLabelSelected: { color: colors.blue600 },
});
