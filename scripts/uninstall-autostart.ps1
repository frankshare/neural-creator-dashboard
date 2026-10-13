# 卸载「开机自启」计划任务
#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"
$taskName = "NeuralCreatorDashboard"

$t = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($t) {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "已删除计划任务：$taskName"
} else {
    Write-Host "计划任务不存在：$taskName"
}

Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*serve-static.ps1*" } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host ("已结束进程 " + $_.ProcessId)
    }
