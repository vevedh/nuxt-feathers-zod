function formatProcessState(exitCode, signalCode) {
  if (exitCode !== null && exitCode !== undefined)
    return `exit code ${exitCode}`
  if (signalCode)
    return `signal ${signalCode}`
  return 'running'
}

export function assertStarterRuntimeProcessHealthy({
  output = '',
  exitCode = null,
  signalCode = null,
} = {}) {
  const captured = String(output)
  const tail = captured.slice(-4000)

  if (captured.includes('status=failed'))
    throw new Error(`Starter embedded runtime reported a bootstrap failure.\n${tail}`)

  if (exitCode !== null || signalCode !== null) {
    throw new Error(
      `Starter production server stopped before validation completed (${formatProcessState(exitCode, signalCode)}).\n${tail}`,
    )
  }
}
