const WINDOWS_LOCK_PATTERNS = [
  /EPERM:\s*Operation not permitted\s*\(NtSetInformationFile\(\)\)/i,
  /NtSetInformationFile/i,
  /EBUSY:\s*resource busy or locked/i,
  /Access is denied/i,
]

const RETRYABLE_NETWORK_PATTERNS = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ENETUNREACH/i,
  /EAI_AGAIN/i,
  /socket hang up/i,
  /HTTP\s+(?:408|429|5\d\d)/i,
]

export function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function resolveAttemptCount(value) {
  return Math.min(5, parsePositiveInteger(value, 3))
}

export function resolveNetworkConcurrency(attempt, initialValue = 8) {
  const initial = Math.min(32, parsePositiveInteger(initialValue, 8))
  if (attempt <= 1)
    return initial
  if (attempt === 2)
    return Math.min(2, initial)
  return 1
}

export function isWindowsFileLockFailure(output) {
  const text = String(output || '')
  return WINDOWS_LOCK_PATTERNS.some(pattern => pattern.test(text))
}

export function isRetryableInstallFailure(output) {
  const text = String(output || '')
  return isWindowsFileLockFailure(text)
    || RETRYABLE_NETWORK_PATTERNS.some(pattern => pattern.test(text))
}

export function resolveRetryDelayMs(attempt, output) {
  if (isWindowsFileLockFailure(output))
    return Math.min(10_000, 2_000 + Math.max(0, attempt - 1) * 3_000)
  return Math.min(5_000, Math.max(1, attempt) * 1_000)
}

export function shouldReuseInstall({ force = false, stateMatches = false, installVerified = false } = {}) {
  return !force && stateMatches && installVerified
}
