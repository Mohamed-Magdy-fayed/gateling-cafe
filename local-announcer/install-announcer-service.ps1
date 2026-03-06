Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# One-file installer for cafe PCs:
# - Sets machine-level env vars (only if missing)
# - Installs + starts the Windows Service (auto-start on reboot)

$ServiceName = 'GatelingAnnouncer'

$DefaultEndUrl = 'https://cafe.gateling.com/api/local-announcer/end-reservation'
$DefaultEndToken = 'pMtkPL2TsCEQDL+bOCpbWFYABK9OZjgKmH8Og0REVW0='

function Test-IsAdmin {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-SelfElevate {
  $scriptPath = $PSCommandPath
  if (-not $scriptPath) {
    throw 'Cannot self-elevate because script path is unknown.'
  }

  $argsList = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', "`"$scriptPath`""
  )

  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argsList | Out-Null
}

function Get-MachineEnv([string]$name) {
  return [Environment]::GetEnvironmentVariable($name, 'Machine')
}

function Set-MachineEnvIfMissing([string]$name, [string]$value) {
  $existing = Get-MachineEnv $name
  if ($null -ne $existing -and $existing.Trim().Length -gt 0) {
    Write-Host "Env var already set: $name"
    return
  }

  [Environment]::SetEnvironmentVariable($name, $value, 'Machine')
  Write-Host "Set env var: $name"
}

function Read-TokenIfNeeded {
  if ($DefaultEndToken -ne '__SET_ME__' -and $DefaultEndToken.Trim().Length -gt 0) {
    return $DefaultEndToken
  }

  $secure = Read-Host 'Enter GATELING_ANNOUNCER_END_TOKEN' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not (Test-IsAdmin)) {
  Write-Host 'Requesting Administrator permission...'
  Invoke-SelfElevate
  exit 0
}

$here = Split-Path -Parent $PSCommandPath
$exePath = Join-Path $here 'Gateling.Announcer.exe'

if (-not (Test-Path $exePath)) {
  throw "Could not find Gateling.Announcer.exe next to this script. Expected: $exePath"
}

# 1) Ensure machine environment variables exist (do NOT overwrite existing)
Set-MachineEnvIfMissing 'GATELING_ANNOUNCER_END_URL' $DefaultEndUrl

$tokenExisting = Get-MachineEnv 'GATELING_ANNOUNCER_END_TOKEN'
if ($null -eq $tokenExisting -or $tokenExisting.Trim().Length -eq 0) {
  $token = Read-TokenIfNeeded
  if ($null -eq $token -or $token.Trim().Length -eq 0) {
    throw 'Token cannot be empty.'
  }
  [Environment]::SetEnvironmentVariable('GATELING_ANNOUNCER_END_TOKEN', $token, 'Machine')
  Write-Host 'Set env var: GATELING_ANNOUNCER_END_TOKEN'
} else {
  Write-Host 'Env var already set: GATELING_ANNOUNCER_END_TOKEN'
}

# 2) Install/start service
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $svc) {
  Write-Host "Installing Windows Service '$ServiceName'..."
  & $exePath --install-service --service-name $ServiceName
} else {
  Write-Host "Windows Service '$ServiceName' already installed. Ensuring auto-start + running..."
  & sc.exe config $ServiceName start= auto | Out-Null
}

# 3) Restart to pick up environment variables
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc) {
  if ($svc.Status -eq 'Running') {
    Restart-Service -Name $ServiceName -Force
  } else {
    Start-Service -Name $ServiceName
  }
}

Write-Host 'Done. The announcer service is installed and set to start automatically.'
Write-Host 'If audio is not playing, run /test-beep against http://127.0.0.1:17777/test-beep'