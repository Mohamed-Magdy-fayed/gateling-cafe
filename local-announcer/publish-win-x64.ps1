Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$proj = Join-Path $PSScriptRoot 'Gateling.Announcer\Gateling.Announcer.csproj'
$baseOutDir = Join-Path $root 'local-announcer\dist'
$outDir = $baseOutDir

if (Test-Path $outDir) {
  try {
    Remove-Item -Recurse -Force $outDir
  }
  catch {
    # If the EXE is currently running (service/helper), dist may be locked.
    # Publish to a new folder instead so builds still work.
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $outDir = Join-Path $root ("local-announcer\\dist-$stamp")
    Write-Warning "Could not remove '$baseOutDir' (likely locked). Publishing to '$outDir' instead."
    if (Test-Path $outDir) {
      Remove-Item -Recurse -Force $outDir
    }
  }
}

$dotnet = $null

$dotnetCmd = Get-Command dotnet -ErrorAction SilentlyContinue
if ($dotnetCmd) {
  $dotnet = $dotnetCmd.Source
} else {
  $fallback = @(
    'C:\Program Files\dotnet\dotnet.exe',
    'C:\Program Files (x86)\dotnet\dotnet.exe'
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1

  if ($fallback) {
    $dotnet = $fallback
    Write-Host "Using dotnet from: $dotnet"
  }
}

if (-not $dotnet) {
  Write-Error @'
The .NET SDK is required to build the local announcer, but `dotnet` was not found on PATH
and could not be located in the default install directory.

Install the .NET SDK:
- https://dotnet.microsoft.com/download

Then reopen your terminal and re-run:
  powershell -ExecutionPolicy Bypass -File .\local-announcer\publish-win-x64.ps1
'@
  exit 1
}

& $dotnet publish $proj -c Release -r win-x64 -o $outDir `
  /p:PublishSingleFile=true `
  /p:IncludeNativeLibrariesForSelfExtract=true `
  /p:SelfContained=true `
  /p:EnableCompressionInSingleFile=true

$installer = Join-Path $PSScriptRoot 'install-announcer-service.ps1'
if (Test-Path $installer) {
  Copy-Item -Force $installer (Join-Path $outDir 'install-announcer-service.ps1')
}

Write-Host "Published to $outDir"
