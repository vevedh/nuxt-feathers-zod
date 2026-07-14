param(
  [switch]$StartDev
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-BunCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  Write-Host "`n> bun $($Arguments -join ' ')" -ForegroundColor Cyan
  & bun @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Bun command failed with exit code $LASTEXITCODE: bun $($Arguments -join ' ')"
  }
}

$BunVersionText = (& bun --version).Trim()
$MinimumBunVersion = [version]'1.3.6'
try {
  $BunVersion = [version]$BunVersionText
}
catch {
  throw "Unable to parse Bun version: $BunVersionText"
}

Write-Host "Node: $(node --version)"
Write-Host "Bun:  $BunVersionText"

if ($BunVersion -lt $MinimumBunVersion) {
  throw "Bun $BunVersionText is too old. Run 'bun upgrade' and use Bun >= $MinimumBunVersion."
}

Invoke-BunCommand @('install', '--frozen-lockfile')
Invoke-BunCommand @('run', 'clean:repo')
Invoke-BunCommand @('run', 'sanity:windows-tooling')
Invoke-BunCommand @('run', 'typecheck')
Invoke-BunCommand @('run', 'test')
Invoke-BunCommand @('run', 'build')

Write-Host "`nWindows verification completed successfully." -ForegroundColor Green

if ($StartDev) {
  Invoke-BunCommand @('run', 'dev')
}
