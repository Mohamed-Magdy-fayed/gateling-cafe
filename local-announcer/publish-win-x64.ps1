Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$proj = Join-Path $PSScriptRoot 'Gateling.Announcer\Gateling.Announcer.csproj'
$outDir = Join-Path $root 'local-announcer\dist'

if (Test-Path $outDir) {
  Remove-Item -Recurse -Force $outDir
}

$dotnetCmd = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnetCmd) {
  Write-Error @'
The .NET SDK is required to build the local announcer, but `dotnet` was not found on this machine.

Install the .NET SDK (recommended):
- https://dotnet.microsoft.com/download

After installing, reopen your terminal and re-run:
  powershell -ExecutionPolicy Bypass -File .\local-announcer\publish-win-x64.ps1
'@
  exit 1
}

& dotnet publish $proj -c Release -r win-x64 -o $outDir `
  /p:PublishSingleFile=true `
  /p:IncludeNativeLibrariesForSelfExtract=true `
  /p:SelfContained=true `
  /p:EnableCompressionInSingleFile=true

Write-Host "Published to $outDir"
