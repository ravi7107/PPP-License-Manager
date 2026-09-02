import { newAssetSchema, prLineToFormFields, toCreateAssetRequest } from '@/lib/asset-form';

/**
 * The validation/mapping layer behind the "Add Asset" screen
 * (app/(app)/asset/new.tsx) - required-ness here must match the
 * backend's DTOs/Asset/CreateAssetRequest.cs exactly (AssetTag/
 * AssetName/AssetType/DepartmentId required, everything else
 * optional), and blank optional fields must map to undefined, not "",
 * so they don't overwrite anything downstream with an empty string.
 *
 * Extension 4, Phase 22 added purchaseRequisitionLineItemId/ownershipType/
 * vendorId/rentalStartDate/rentalEndDate - ownershipType defaults to
 * 'Owned' in the schema itself (via zod's .default()) so every existing
 * "minimum required fields" test below keeps passing unchanged; the rest
 * stay genuinely optional, matching the backend DTO.
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
  ownershipType: 'Owned' as const,
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
    // ownershipType defaults to 'Owned' when omitted entirely.
    if (result.success) {
      expect(result.data.ownershipType).toBe('Owned');
    }
  });

  it('rejects a rental date not in YYYY-MM-DD format', () => {
    const result = newAssetSchema.safeParse({
      ...validValues,
      ownershipType: 'Rented',
      rentalStartDate: '08/31/2026',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed rental date', () => {
    const result = newAssetSchema.safeParse({
      ...validValues,
      ownershipType: 'Rented',
      rentalStartDate: '2026-08-31',
      rentalEndDate: '2027-08-31',
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
      ownershipType: 'Owned',
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
      ownershipType: 'Owned',
    });

    expect(result.manufacturer).toBeUndefined();
    expect(result.model).toBeUndefined();
    expect(result.serialNumber).toBeUndefined();
    expect(result.remarks).toBeUndefined();
  });

  it('includes the PR line link only when one is set', () => {
    const unlinked = toCreateAssetRequest(validValues);
    expect(unlinked.purchaseRequisitionLineItemId).toBeUndefined();

    const linked = toCreateAssetRequest({
      ...validValues,
      purchaseRequisitionLineItemId: 42,
      prNumber: 'PR-ACM-2026-0001',
      prItemDescription: '5x Dell Latitude 5440',
    });
    expect(linked.purchaseRequisitionLineItemId).toBe(42);
  });

  it('drops vendor/rental fields when Owned, even if they were somehow set', () => {
    const result = toCreateAssetRequest({
      ...validValues,
      ownershipType: 'Owned',
      vendorId: 7,
      rentalStartDate: '2026-08-31',
      rentalEndDate: '2027-08-31',
    });

    expect(result.vendorId).toBeUndefined();
    expect(result.rentalStartDate).toBeUndefined();
    expect(result.rentalEndDate).toBeUndefined();
  });

  it('includes vendor/rental fields when Rented', () => {
    const result = toCreateAssetRequest({
      ...validValues,
      ownershipType: 'Rented',
      vendorId: 7,
      rentalStartDate: '2026-08-31',
      rentalEndDate: '2027-08-31',
    });

    expect(result.ownershipType).toBe('Rented');
    expect(result.vendorId).toBe(7);
    expect(result.rentalStartDate).toBe('2026-08-31');
    expect(result.rentalEndDate).toBe('2027-08-31');
  });
});

describe('prLineToFormFields', () => {
  it('maps an available-line response onto the form field shape', () => {
    expect(
      prLineToFormFields({
        lineItemId: 42,
        purchaseRequisitionId: 10,
        prNumber: 'PR-ACM-2026-0001',
        itemDescription: '5x Dell Latitude 5440',
        quantity: 5,
        fulfilledQuantity: 2,
        remainingQuantity: 3,
      })
    ).toEqual({
      purchaseRequisitionLineItemId: 42,
      prNumber: 'PR-ACM-2026-0001',
      prItemDescription: '5x Dell Latitude 5440',
    });
  });
});
