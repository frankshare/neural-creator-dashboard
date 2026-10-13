' Neural Creator Dashboard - hidden launcher for the local static server.
' Installed into the user's Startup folder; starts the dashboard at logon.
' Delete this file from the Startup folder to disable autostart.

Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\dev\neural-creator-dashboard"

ps = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
script = "E:\dev\neural-creator-dashboard\scripts\serve-static.ps1"
cmd = """" & ps & """ -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & script & """ -Port 5180"

sh.Run cmd, 0, False
