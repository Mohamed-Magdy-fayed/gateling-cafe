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

# 2.5) Install/start interactive playback helper (Scheduled Task)
# Ducking other apps' audio sessions generally requires running in the interactive user session.
$taskName = 'GatelingAnnouncerUserAgent'

# When this script is elevated, $env:USERNAME can sometimes resolve to the elevated context.
# Prefer the currently active console user when available.
$interactiveUser = $null
try {
  $interactiveUser = (Get-CimInstance Win32_ComputerSystem).UserName
}
catch {
  $interactiveUser = $null
}

if ($null -eq $interactiveUser -or $interactiveUser.Trim().Length -eq 0) {
  $interactiveUser = "$env:USERDOMAIN\$env:USERNAME"
}

$userId = $interactiveUser
if ($userId -notmatch '\\') {
  $domain = $env:USERDOMAIN
  if ($null -eq $domain -or $domain.Trim().Length -eq 0) {
    $domain = $env:COMPUTERNAME
  }
  $userId = "$domain\$userId"
}

try {
  Import-Module ScheduledTasks -ErrorAction Stop

  # Launch helper detached + hidden so closing terminals won't kill it.
  # (Running the EXE directly from a console ties it to that console.)
  $helperArgs = "--user-agent --port 17778"
  $psCmd = "Start-Process -FilePath `"$exePath`" -ArgumentList `"$helperArgs`" -WorkingDirectory `"$here`" -WindowStyle Hidden"
  # Use EncodedCommand to avoid fragile quoting issues in Task Scheduler.
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($psCmd))
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -EncodedCommand $encoded"
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  # Do NOT use Highest here. Scheduled Tasks cannot show a UAC prompt; Highest often causes silent failures.
  $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet -Hidden -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

  # Replace any existing task in case the EXE path or principal changed.
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Out-Null
  Write-Host "Scheduled Task '$taskName' installed for '$userId' (user-session helper on port 17778)."

  # Best-effort verification that helper is actually listening.
  $ok = $false
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 300
    try {
      $null = Invoke-RestMethod http://127.0.0.1:17778/health -TimeoutSec 1
      $ok = $true
      break
    }
    catch {
      # keep retrying
    }
  }

  if (-not $ok) {
    $info = Get-ScheduledTaskInfo -TaskName $taskName -ErrorAction SilentlyContinue
    Write-Warning "User-agent helper did not start (port 17778 not reachable). Task LastTaskResult: $($info.LastTaskResult)"
    try {
      $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
      Write-Warning "Task Principal: $($task.Principal.UserId) LogonType=$($task.Principal.LogonType) RunLevel=$($task.Principal.RunLevel)"
      Write-Warning "Task Action: $($task.Actions.Execute) $($task.Actions.Arguments)"
    }
    catch {
      # ignore
    }
  }
}
catch {
  Write-Warning "Failed to create/start Scheduled Task '$taskName'. Ducking may not work in service mode. Error: $($_.Exception.Message)"
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
Write-Host 'If ducking is not working, ensure the user-session helper is running on http://127.0.0.1:17778/health'