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
    Write-Host "[0/4] 先停掉可能在跑的旧实例"
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*serve-static.ps1*" } |
        ForEach-Object {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            Write-Host ("      已结束 pid " + $_.ProcessId)
        }
    Start-Sleep -Seconds 2

    Write-Host "[1/4] 移除「登录时」的启动文件夹条目"
    $legacy = Join-Path ([Environment]::GetFolderPath('Startup')) "NeuralDashboard.vbs"
    if (Test-Path $legacy) { Remove-Item $legacy -Force; Write-Host "      已移除 $legacy" } else { Write-Host "      无需移除" }

    Write-Host "[2/4] 注册计划任务（schtasks /sc onstart /ru SYSTEM）"
    $tr = '"' + $ps + '" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $script + '" -Port ' + $port
    Write-Host "      /tr = $tr"
    $out = cmd /c ('schtasks /create /tn "' + $taskName + '" /tr "' + $tr + '" /sc onstart /ru SYSTEM /rl HIGHEST /f 2>&1')
    $out | ForEach-Object { Write-Host ("      " + $_) }

    Write-Host "[3/4] 确认任务文件落盘"
    $tf = Join-Path $env:SystemRoot ("System32\Tasks\" + $taskName)
    if (Test-Path $tf) { Write-Host "      OK 任务文件已生成" } else { Write-Host "      失败 任务文件没生成" }
    cmd /c ('schtasks /query /tn "' + $taskName + '" 2>&1') | ForEach-Object { Write-Host ("      " + $_) }

    Write-Host "[4/4] 立刻启动验证"
    cmd /c ('schtasks /run /tn "' + $taskName + '" 2>&1') | ForEach-Object { Write-Host ("      " + $_) }
    Start-Sleep -Seconds 6
    $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($c) { Write-Host "      OK $port 正在监听" } else { Write-Host "      警告 $port 未监听" }
} catch {
    Write-Host "安装失败：" + $_.Exception.Message
} finally {
    try { Stop-Transcript | Out-Null } catch { }
}
