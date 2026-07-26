import {
  isRetryableInstallFailure,
  isWindowsFileLockFailure,
  resolveAttemptCount,
  resolveNetworkConcurrency,
  resolveRetryDelayMs,
  shouldReuseInstall,
} from './lib/windows-install-policy.mjs'

const failures = []

function expect(condition, message) {
  if (!condition)
    failures.push(message)
}

const lockOutput = 'EPERM: Operation not permitted (NtSetInformationFile())'
expect(isWindowsFileLockFailure(lockOutput), 'NtSetInformationFile EPERM must be classified as a Windows file lock')
expect(isRetryableInstallFailure(lockOutput), 'Windows file locks must be retryable')
expect(isRetryableInstallFailure('ECONNRESET while downloading a package'), 'transient network failures must be retryable')
expect(!isRetryableInstallFailure('error: lockfile had changes, but lockfile is frozen'), 'deterministic lockfile failures must not be retried')
expect(resolveAttemptCount('99') === 5, 'attempt count must be capped at five')
expect(resolveAttemptCount('0') === 3, 'invalid attempt count must use the default')
expect(resolveNetworkConcurrency(1, 8) === 8, 'first attempt must use configured network concurrency')
expect(resolveNetworkConcurrency(2, 8) === 2, 'second attempt must reduce network concurrency to two')
expect(resolveNetworkConcurrency(3, 8) === 1, 'third attempt must reduce network concurrency to one')
expect(resolveRetryDelayMs(2, lockOutput) >= 5_000, 'repeated Windows locks must receive a longer delay')
expect(shouldReuseInstall({ stateMatches: true, installVerified: true }), 'matching verified installs must be reused')
expect(!shouldReuseInstall({ force: true, stateMatches: true, installVerified: true }), 'force mode must bypass reuse')
expect(!shouldReuseInstall({ stateMatches: false, installVerified: true }), 'stale install state must not be reused')

if (failures.length) {
  console.error('[nuxt-feathers-zod] Windows install retry policy guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Windows install retry policy guard passed.')
