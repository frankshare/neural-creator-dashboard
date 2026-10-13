# 把个人工作台面板注册成「开机自启」的计划任务（无需登录即启动）
# 必须以管理员身份运行。
#Requires -RunAsAdministrator

$ErrorActionPreference = "Continue"

$logFile = Join-Path $PSScriptRoot "install-autostart.log"
try { Start-Transcript -Path $logFile -Force | Out-Null } catch { }

$taskName = "NeuralCreatorDashboard"
$script   = Join-Path $PSScriptRoot "serve-static.ps1"
$root     = Split-Path -Parent $PSScriptRoot
$port     = 5180
$ps       = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

try {
    Write-Host "[0/5] 停掉可能在跑的旧实例"
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*serve-static.ps1*" } |
        ForEach-Object {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            Write-Host ("      已结束 pid " + $_.ProcessId)
        }
    Start-Sleep -Seconds 2

    Write-Host "[1/5] 移除「登录时」的启动文件夹条目"
    $legacy = Join-Path ([Environment]::GetFolderPath('Startup')) "NeuralDashboard.vbs"
    if (Test-Path $legacy) { Remove-Item $legacy -Force; Write-Host "      已移除" } else { Write-Host "      无需移除" }

    Write-Host "[2/5] 注册任务（schtasks：系统启动时 / SYSTEM / 最高权限）"
    $tr = '"' + $ps + '" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $script + '" -Port ' + $port
    cmd /c ('schtasks /create /tn "' + $taskName + '" /tr "' + $tr + '" /sc onstart /ru SYSTEM /rl HIGHEST /f 2>&1') | ForEach-Object { Write-Host ("      " + $_) }

    Write-Host "[3/5] 修正运行限制（不限时 / 电池照跑 / 失败重试）"
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
    Set-ScheduledTask -TaskName $taskName -Settings $settings | Out-Null
    $chk = Get-ScheduledTask -TaskName $taskName
    Write-Host ("      ExecutionTimeLimit        = " + $chk.Settings.ExecutionTimeLimit)
    Write-Host ("      DisallowStartIfOnBatteries = " + $chk.Settings.DisallowStartIfOnBatteries)
    Write-Host ("      StopIfGoingOnBatteries     = " + $chk.Settings.StopIfGoingOnBatteries)
    Write-Host ("      RestartCount               = " + $chk.Settings.RestartCount)

    Write-Host "[4/5] 确认任务定义落盘"
    $tf = Join-Path $env:SystemRoot ("System32\Tasks\" + $taskName)
    if (Test-Path $tf) { Write-Host "      OK 已生成" } else { Write-Host "      失败 没生成" }

    Write-Host "[5/5] 立刻启动验证"
    cmd /c ('schtasks /run /tn "' + $taskName + '" 2>&1') | ForEach-Object { Write-Host ("      " + $_) }
    Start-Sleep -Seconds 6
    $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($c) { Write-Host "      OK $port 正在监听" } else { Write-Host "      警告 $port 未监听" }
} catch {
    Write-Host "安装失败：" + $_.Exception.Message
} finally {
    try { Stop-Transcript | Out-Null } catch { }
}
