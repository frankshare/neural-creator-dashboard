$log = Join-Path $PSScriptRoot "check-autostart.log"
try { Start-Transcript -Path $log -Force | Out-Null } catch { }
$taskName = "NeuralCreatorDashboard"
Write-Host ("任务文件存在: " + (Test-Path "$env:SystemRoot\System32\Tasks\$taskName"))
Write-Host "--- schtasks /query /v ---"
cmd /c ("schtasks /query /tn " + $taskName + " /v /fo LIST") 2>&1 | Write-Host
Write-Host "--- Get-ScheduledTask ---"
$t = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($t) {
    Write-Host ("State    = " + $t.State)
    Write-Host ("UserId   = " + $t.Principal.UserId)
    Write-Host ("RunLevel = " + $t.Principal.RunLevel)
    $t.Triggers | ForEach-Object { Write-Host ("Trigger  = " + $_.CimClass.CimClassName) }
} else { Write-Host "未找到任务" }
Write-Host ("5180 监听: " + [bool](Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue))
try { Stop-Transcript | Out-Null } catch { }
