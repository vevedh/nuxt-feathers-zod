param(
  [switch]$StartDev,
  [switch]$Full,
  [switch]$Quick,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ($Full -and $Quick) {
  throw 'Choose either -Full or -Quick, not both.'
}

$BunExecutable = (& node scripts/print-bun-executable.mjs).Trim()
if ([string]::IsNullOrWhiteSpace($BunExecutable)) {
  throw 'Unable to resolve the Bun executable.'
}


function Import-ReleaseEnvironmentFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  foreach ($RawLine in Get-Content -LiteralPath $Path) {
    $Line = $RawLine.Trim()
    if ([string]::IsNullOrWhiteSpace($Line) -or $Line.StartsWith('#')) {
      continue
    }

    $SeparatorIndex = $Line.IndexOf('=')
    if ($SeparatorIndex -lt 1) {
      throw ('Invalid release environment entry in {0}: {1}' -f $Path, $RawLine)
    }

    $Name = $Line.Substring(0, $SeparatorIndex).Trim()
    if ($Name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
      throw ('Invalid release environment variable name in {0}: {1}' -f $Path, $Name)
    }

    if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, 'Process'))) {
      continue
    }

    $Value = $Line.Substring($SeparatorIndex + 1).Trim()
    if ($Value.Length -ge 2) {
      $First = $Value[0]
      $Last = $Value[$Value.Length - 1]
      if (($First -eq '"' -and $Last -eq '"') -or ($First -eq "'" -and $Last -eq "'")) {
        $Value = $Value.Substring(1, $Value.Length - 2)
      }
    }

    [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
  }

  Write-Host ('Loaded release environment from {0}' -f $Path)
}

function Invoke-BunCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  Write-Host "`n> $BunExecutable $($Arguments -join ' ')" -ForegroundColor Cyan
  & $BunExecutable @Arguments
  $ExitCode = $LASTEXITCODE
  if ($ExitCode -ne 0) {
    throw ('Bun command failed with exit code {0}: {1} {2}' -f $ExitCode, $BunExecutable, ($Arguments -join ' '))
  }
}

$BunVersionText = (& $BunExecutable --version).Trim()
$MinimumBunVersion = [version]'1.3.6'
try {
  $BunVersion = [version]$BunVersionText
}
catch {
  throw "Unable to parse Bun version: $BunVersionText"
}

Write-Host "Node: $(node --version)"
Write-Host "Bun:  $BunVersionText"
Write-Host "Mode: $(if ($Full) { 'full release' } else { 'quick validation' })"
Write-Host "Install: $(if ($SkipInstall) { 'reuse verified dependency tree' } else { 'verify or install automatically' })"

if ($BunVersion -lt $MinimumBunVersion) {
  throw "Bun $BunVersionText is too old. Run 'bun upgrade' and use Bun >= $MinimumBunVersion."
}

if ($SkipInstall) {
  Write-Host "`n> node scripts/install-windows.mjs --check" -ForegroundColor Cyan
  & node scripts/install-windows.mjs --check
}
else {
  Write-Host "`n> node scripts/install-windows.mjs" -ForegroundColor Cyan
  & node scripts/install-windows.mjs
}
if ($LASTEXITCODE -ne 0) {
  throw "Windows dependency verification/installation failed with exit code $LASTEXITCODE."
}

Invoke-BunCommand @('run', 'clean:repo')
Invoke-BunCommand @('run', 'sync:release-meta')
Invoke-BunCommand @('run', 'sanity:version-coherence')
Invoke-BunCommand @('run', 'sanity:release-meta')
Invoke-BunCommand @('run', 'sanity:publication-pipeline')
Invoke-BunCommand @('run', 'sanity:windows-tooling')
Invoke-BunCommand @('run', 'sanity:windows-install-resilience')
Invoke-BunCommand @('run', 'sanity:docs-build-resilience')
Invoke-BunCommand @('run', 'sanity:starter-release-install-resilience')
Invoke-BunCommand @('run', 'sanity:starter-published-types')
Invoke-BunCommand @('run', 'sanity:starter-release-runtime')
Invoke-BunCommand @('run', 'sanity:generated-template-types')
Invoke-BunCommand @('run', 'sanity:zod-boundary')
Invoke-BunCommand @('run', 'sanity:auth-mongodb-id')
Invoke-BunCommand @('run', 'sanity:mcp-maintainer-config')
Invoke-BunCommand @('run', 'sanity:release-lint-regressions')
Invoke-BunCommand @('run', 'lint')
Invoke-BunCommand @('run', 'sanity:release-typecheck-regressions')
Invoke-BunCommand @('run', 'typecheck')
Invoke-BunCommand @('run', 'test')
Invoke-BunCommand @('run', 'build')

if ($StartDev -and $Full) {
  throw '-StartDev cannot be combined with -Full because final release artifact creation must remain the last operation.'
}

if ($StartDev) {
  Invoke-BunCommand @('run', 'dev')
}

if ($Full) {
  Import-ReleaseEnvironmentFile -Path (Join-Path (Get-Location) '.env.release.local')

  Invoke-BunCommand @('run', 'release:check:registry')
  Invoke-BunCommand @('run', 'docs:build')
  Invoke-BunCommand @('run', 'docs:private:build')
  Invoke-BunCommand @('run', 'test:playwright')

  Write-Host "`nCreating one immutable release candidate for exact-artifact validation." -ForegroundColor Cyan
  Invoke-BunCommand @('run', 'release:candidate')
  Invoke-BunCommand @('run', 'test:starter:release')
  Invoke-BunCommand @('run', 'smoke:tarball')
  Invoke-BunCommand @('run', 'release:finalize')
}

Write-Host "`nWindows verification completed successfully." -ForegroundColor Green
