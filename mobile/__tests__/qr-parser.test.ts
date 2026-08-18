import { parseQRCode } from '@/lib/qr-parser';

describe('parseQRCode', () => {
  it('accepts a bare identifier (Format A)', () => {
    const result = parseQRCode('PPS-A-000123');
    expect(result).toEqual({ ok: true, code: 'PPS-A-000123' });
  });

  it('accepts this deployment\'s real AssetTag style', () => {
    const result = parseQRCode('AST-0001');
    expect(result).toEqual({ ok: true, code: 'AST-0001' });
  });

  it('extracts the identifier from a URL (Format B)', () => {
    const result = parseQRCode('https://asset.ppspl.in/a/PPS-A-000123');
    expect(result).toEqual({ ok: true, code: 'PPS-A-000123' });
  });

  it('extracts the identifier from a URL with extra path segments', () => {
    const result = parseQRCode('https://pps.example.com/scan/assets/AST-0001');
    expect(result).toEqual({ ok: true, code: 'AST-0001' });
  });

  it('handles a URL with a trailing slash by rejecting it (no segment)', () => {
    const result = parseQRCode('https://pps.example.com/a/');
    expect(result.ok).toBe(false);
  });

  it('trims surrounding whitespace', () => {
    const result = parseQRCode('  AST-0001  \n');
    expect(result).toEqual({ ok: true, code: 'AST-0001' });
  });

  it('URL-decodes the final path segment', () => {
    const result = parseQRCode('https://pps.example.com/a/AST%200001');
    expect(result).toEqual({ ok: true, code: 'AST 0001' });
  });

  it.each([null, undefined, '', '   '])(
    'rejects empty/missing input: %p',
    (input) => {
      const result = parseQRCode(input as never);
      expect(result.ok).toBe(false);
    }
  );

  it('rejects a WiFi config QR payload', () => {
    const result = parseQRCode('WIFI:S:MyNetwork;T:WPA;P:password123;;');
    expect(result.ok).toBe(false);
  });

  it('rejects a vCard QR payload', () => {
    const result = parseQRCode('BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEND:VCARD');
    expect(result.ok).toBe(false);
  });

  it('rejects a mailto: link', () => {
    const result = parseQRCode('mailto:someone@example.com');
    expect(result.ok).toBe(false);
  });

  it('rejects a tel: link', () => {
    const result = parseQRCode('tel:+1234567890');
    expect(result.ok).toBe(false);
  });

  it('rejects content with invalid characters', () => {
    const result = parseQRCode('<script>alert(1)</script>');
    expect(result.ok).toBe(false);
  });

  it('rejects a code that is far too long', () => {
    const result = parseQRCode('A'.repeat(100));
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed URL gracefully', () => {
    const result = parseQRCode('https://');
    expect(result.ok).toBe(false);
  });

  it('accepts codes with dots and underscores', () => {
    const result = parseQRCode('AST_0001.v2');
    expect(result).toEqual({ ok: true, code: 'AST_0001.v2' });
  });
});
