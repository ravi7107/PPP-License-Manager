/**
 * Extracts an asset identifier from whatever a QR/barcode scan
 * returned, and validates it before it's ever sent to the API - a
 * scanned value is untrusted input like any other (section 7/18 of
 * the brief: "never trust arbitrary QR content").
 *
 * Supports, without assuming either is the "real" format used by this
 * deployment (see mobile/README.md's QR Format section for why -
 * AssetTag in this system is free text, e.g. "AST-0001", not a fixed
 * pattern):
 *
 *   Format A: a bare identifier      e.g. "AST-0001", "PPS-A-000123"
 *   Format B: a URL ending in one    e.g. "https://asset.ppspl.in/a/AST-0001"
 *
 * Anything that looks like a different kind of QR payload entirely
 * (a WiFi config, a vCard, a mailto:/tel: link) is rejected outright
 * rather than guessed at.
 */

export interface ParsedQrSuccess {
  ok: true;
  code: string;
}

export interface ParsedQrFailure {
  ok: false;
  reason: string;
}

export type ParsedQrResult = ParsedQrSuccess | ParsedQrFailure;

const MAX_RAW_LENGTH = 2048;
const MAX_CODE_LENGTH = 64;

// Recognizable non-asset QR payload types this app should refuse
// rather than mangle into a garbage "asset code".
const REJECTED_SCHEMES = [
  'mailto:',
  'tel:',
  'sms:',
  'smsto:',
  'wifi:',
  'geo:',
  'begin:vcard',
];

// AssetTag/SerialNumber values in this system are free text but
// realistically alphanumeric with separators - reject anything with
// characters that couldn't plausibly be part of one (control
// characters, quotes, angle brackets, etc.) rather than pass them
// through to a URL path segment on the next API call.
const VALID_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function parseQRCode(raw: string | null | undefined): ParsedQrResult {
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'Nothing was scanned.' };
  }

  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false, reason: 'Nothing was scanned.' };
  }

  if (trimmed.length > MAX_RAW_LENGTH) {
    return {
      ok: false,
      reason: "This doesn't look like an asset label.",
    };
  }

  const lower = trimmed.toLowerCase();

  if (REJECTED_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    return { ok: false, reason: 'This QR code is not an asset label.' };
  }

  let candidate = trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;

    try {
      url = new URL(trimmed);
    } catch {
      return { ok: false, reason: 'Could not read this QR code as a link.' };
    }

    const segments = url.pathname.split('/').filter(Boolean);

    if (segments.length === 0) {
      return {
        ok: false,
        reason: "This link doesn't contain an asset code.",
      };
    }

    try {
      candidate = decodeURIComponent(segments[segments.length - 1]);
    } catch {
      return { ok: false, reason: 'Could not read this QR code as a link.' };
    }
  }

  candidate = candidate.trim();

  if (!candidate) {
    return {
      ok: false,
      reason: "This QR code doesn't contain an asset code.",
    };
  }

  if (candidate.length > MAX_CODE_LENGTH) {
    return {
      ok: false,
      reason: 'This code is too long to be a valid asset tag or serial number.',
    };
  }

  if (!VALID_CODE_PATTERN.test(candidate)) {
    return {
      ok: false,
      reason: 'This QR code contains characters that are not a valid asset code.',
    };
  }

  return { ok: true, code: candidate };
}
