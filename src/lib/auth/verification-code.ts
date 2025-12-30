/**
 * Verification code utilities for resident and guard authentication.
 * Code format: BS-{ESTATE_INITIALS}-{YEAR}
 * Example: BS-BG-2025 (for "Blue Gardens" estate in 2025)
 */

/**
 * Generate verification code from estate initials.
 * @param estateInitials - 2-letter estate initials (e.g., "BG")
 * @returns Verification code (e.g., "BS-BG-2025")
 */
export function generateVerificationCode(estateInitials: string): string {
  const year = new Date().getFullYear();
  return `BS-${estateInitials.toUpperCase()}-${year}`;
}

/**
 * Parse and validate a verification code.
 * @param code - Code to parse (e.g., "BS-BG-2025")
 * @returns Parsed components or invalid result
 */
export function parseVerificationCode(code: string): {
  valid: boolean;
  initials?: string;
  year?: number;
} {
  const normalized = code.toUpperCase().trim();
  const match = normalized.match(/^BS-([A-Z]{2})-(\d{4})$/);
  if (!match) return { valid: false };
  return {
    valid: true,
    initials: match[1],
    year: parseInt(match[2], 10),
  };
}

/**
 * Validate verification code against estate initials.
 * Accepts current year and previous year codes for grace period during year rollover.
 * @param providedCode - Code provided by user
 * @param estateInitials - Expected estate initials
 * @returns true if code is valid for the estate
 */
export function validateVerificationCode(
  providedCode: string,
  estateInitials: string
): boolean {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const expectedCurrent = `BS-${estateInitials.toUpperCase()}-${currentYear}`;
  const expectedPrevious = `BS-${estateInitials.toUpperCase()}-${lastYear}`;

  const normalized = providedCode.toUpperCase().trim();
  return normalized === expectedCurrent || normalized === expectedPrevious;
}
