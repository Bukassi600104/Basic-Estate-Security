/**
 * Verification code utilities for resident and guard authentication.
 * Code format: GP-{ESTATE_INITIALS}-{UNIQUE_ID}
 * Example: GP-GW-3453yHGT (for "Gowon" estate)
 *
 * Format breakdown:
 * - GP: Constant prefix (GatePilot)
 * - XX: 2-letter estate initials derived from estate name
 * - 8-char unique ID: 4 digits + 4 uppercase letters (e.g., 3453YHGT)
 */

/**
 * Generate a random unique ID: 4 digits followed by 4 uppercase letters.
 * Example: "3453YHGT"
 */
function generateUniqueId(): string {
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("");
  const letters = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  return digits + letters;
}

/**
 * Generate verification code from estate initials.
 * @param estateInitials - 2-letter estate initials (e.g., "GW")
 * @returns Verification code (e.g., "GP-GW-3453YHGT")
 */
export function generateVerificationCode(estateInitials: string): string {
  const uniqueId = generateUniqueId();
  return `GP-${estateInitials.toUpperCase()}-${uniqueId}`;
}

/**
 * Parse and validate a verification code format.
 * @param code - Code to parse (e.g., "GP-GW-3453YHGT")
 * @returns Parsed components or invalid result
 */
export function parseVerificationCode(code: string): {
  valid: boolean;
  initials?: string;
  uniqueId?: string;
} {
  const normalized = code.toUpperCase().trim();
  // Match: GP-XX-4digits4letters
  const match = normalized.match(/^GP-([A-Z]{2})-(\d{4}[A-Z]{4})$/);
  if (!match) return { valid: false };
  return {
    valid: true,
    initials: match[1],
    uniqueId: match[2],
  };
}

/**
 * Validate verification code against estate initials.
 * The code must start with GP-{initials}- and have a valid unique ID format.
 * @param providedCode - Code provided by user
 * @param estateInitials - Expected estate initials
 * @returns true if code is valid for the estate
 */
export function validateVerificationCode(
  providedCode: string,
  estateInitials: string
): boolean {
  const parsed = parseVerificationCode(providedCode);
  if (!parsed.valid) return false;

  // Check that the initials match the estate
  return parsed.initials === estateInitials.toUpperCase();
}
