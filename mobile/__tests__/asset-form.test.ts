import { newAssetSchema, toCreateAssetRequest } from '@/lib/asset-form';

/**
 * The validation/mapping layer behind the "Add Asset" screen
 * (app/(app)/asset/new.tsx) - required-ness here must match the
 * backend's DTOs/Asset/CreateAssetRequest.cs exactly (AssetTag/
 * AssetName/AssetType/DepartmentId required, everything else
 * optional), and blank optional fields must map to undefined, not "",
 * so they don't overwrite anything downstream with an empty string.
 */

const validValues = {
  assetTag: 'AST-0099',
  assetName: 'Dell Latitude 5440',
  assetType: 'Laptop' as const,
  departmentId: 3,
  manufacturer: 'Dell',
  model: 'Latitude 5440',
  serialNumber: 'SN123',
  remarks: 'New arrival',
};

describe('newAssetSchema', () => {
  it('accepts a fully-populated valid form', () => {
    const result = newAssetSchema.safeParse(validValues);
    expect(result.success).toBe(true);
  });

  it('accepts the minimum required fields with optional fields omitted', () => {
    const result = newAssetSchema.safeParse({
      assetTag: 'AST-0100',
      assetName: 'Generic Desktop',
      assetType: 'Desktop',
      departmentId: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a blank Asset Tag', () => {
    const result = newAssetSchema.safeParse({ ...validValues, assetTag: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a blank Asset Name', () => {
    const result = newAssetSchema.safeParse({ ...validValues, assetName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an asset type outside the fixed set', () => {
    const result = newAssetSchema.safeParse({ ...validValues, assetType: 'Tablet' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing/zero department', () => {
    const missing = newAssetSchema.safeParse({ ...validValues, departmentId: undefined });
    const zero = newAssetSchema.safeParse({ ...validValues, departmentId: 0 });
    expect(missing.success).toBe(false);
    expect(zero.success).toBe(false);
  });

  it('rejects an Asset Tag longer than 50 characters', () => {
    const result = newAssetSchema.safeParse({
      ...validValues,
      assetTag: 'A'.repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

describe('toCreateAssetRequest', () => {
  it('passes through all populated fields', () => {
    expect(toCreateAssetRequest(validValues)).toEqual({
      assetTag: 'AST-0099',
      assetName: 'Dell Latitude 5440',
      assetType: 'Laptop',
      departmentId: 3,
      manufacturer: 'Dell',
      model: 'Latitude 5440',
      serialNumber: 'SN123',
      remarks: 'New arrival',
    });
  });

  it('maps blank optional fields to undefined rather than empty strings', () => {
    const result = toCreateAssetRequest({
      assetTag: 'AST-0100',
      assetName: 'Generic Desktop',
      assetType: 'Desktop',
      departmentId: 1,
      manufacturer: '',
      model: '',
      serialNumber: '',
      remarks: '',
    });

    expect(result.manufacturer).toBeUndefined();
    expect(result.model).toBeUndefined();
    expect(result.serialNumber).toBeUndefined();
    expect(result.remarks).toBeUndefined();
  });
});
