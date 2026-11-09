$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectDirectory '.local\server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Output 'No saved local server process.'; exit 0 }
$serverProcessId = [int](Get-Content -LiteralPath $pidFile)
$server = Get-CimInstance Win32_Process -Filter "ProcessId = $serverProcessId"
$serverEntry = Join-Path $projectDirectory 'server\index.mjs'
if ($server -and $server.CommandLine.Contains($serverEntry)) {
  Stop-Process -Id $serverProcessId
  Write-Output 'Stopped the firdbird-website local server.'
} elseif ($server) {
  throw 'The saved process ID belongs to a different command; it was not stopped.'
} else { Write-Output 'The saved local server is already stopped.' }
Remove-Item -LiteralPath $pidFile
