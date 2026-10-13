# 个人工作台面板 —— 本地常驻静态服务器
# 只服务 dist-local/（真实数据），绑定本机回环地址，不对外网开放。
# 由 scripts\launch-dashboard.vbs 以隐藏窗口方式调用。

param(
    [int]$Port = 5180,
    [string]$Root = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Join-Path (Split-Path -Parent $PSScriptRoot) "dist-local"
}
$Root = [IO.Path]::GetFullPath($Root)

if (-not (Test-Path $Root -PathType Container)) {
    Write-Host "找不到站点目录：$Root"
    exit 1
}

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".mjs"  = "text/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".map"  = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".gif"  = "image/gif"
    ".ico"  = "image/x-icon"
    ".mp4"  = "video/mp4"
    ".webm" = "video/webm"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".txt"  = "text/plain; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
# localhost 前缀不需要管理员注册；127.0.0.1 通常也可以，失败就跳过。
foreach ($p in @("http://localhost:$Port/", "http://127.0.0.1:$Port/")) {
    try { $listener.Prefixes.Add($p) } catch { }
}

try {
    $listener.Start()
} catch {
    Write-Host "监听失败（端口被占用或需要管理员注册 URL 前缀）：$($_.Exception.Message)"
    exit 1
}

Write-Host "serving $Root"
Write-Host "listening $($listener.Prefixes -join ' , ')"

while ($listener.IsListening) {
    $ctx = $null
    try { $ctx = $listener.GetContext() } catch { break }

    try {
        $req = $ctx.Request
        $res = $ctx.Response

        $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
        if ([string]::IsNullOrEmpty($path) -or $path -eq "/") { $path = "/index.html" }

        $rel  = $path.TrimStart("/") -replace "/", [IO.Path]::DirectorySeparatorChar
        $full = [IO.Path]::GetFullPath((Join-Path $Root $rel))

        # 防目录穿越
        $ok = $full.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)
        if (-not $ok -or -not (Test-Path $full -PathType Leaf)) {
            $res.StatusCode = 404
            $body = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $res.ContentType = "text/plain; charset=utf-8"
            $res.ContentLength64 = $body.Length
            $res.OutputStream.Write($body, 0, $body.Length)
            $res.Close()
            continue
        }

        $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
        if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = "application/octet-stream" }
        $res.Headers["Cache-Control"] = "no-cache"
        $res.Headers["Accept-Ranges"] = "bytes"

        $len = (Get-Item $full).Length
        $isHead = ($req.HttpMethod -eq "HEAD")
        $rangeHeader = $req.Headers["Range"]

        if ($rangeHeader -and $rangeHeader -match "bytes=(\d*)-(\d*)") {
            $start = 0
            $end = $len - 1
            if ($matches[1] -ne "") { $start = [int64]$matches[1] }
            if ($matches[2] -ne "") { $end = [int64]$matches[2] }
            if ($start -lt 0) { $start = 0 }
            if ($end -ge $len) { $end = $len - 1 }
            if ($start -gt $end) { $res.StatusCode = 416; $res.Close(); continue }

            $count = $end - $start + 1
            $res.StatusCode = 206
            $res.Headers["Content-Range"] = "bytes $start-$end/$len"
            $res.ContentLength64 = $count
            if (-not $isHead) {
                $fs = [IO.File]::OpenRead($full)
                try {
                    [void]$fs.Seek($start, [IO.SeekOrigin]::Begin)
                    $buf = New-Object byte[] 65536
                    $remaining = $count
                    while ($remaining -gt 0) {
                        $toRead = [Math]::Min($buf.Length, $remaining)
                        $read = $fs.Read($buf, 0, $toRead)
                        if ($read -le 0) { break }
                        $res.OutputStream.Write($buf, 0, $read)
                        $remaining -= $read
                    }
                } finally { $fs.Close() }
            }
        } else {
            $res.StatusCode = 200
            $res.ContentLength64 = $len
            if (-not $isHead) {
                $fs = [IO.File]::OpenRead($full)
                try {
                    $buf = New-Object byte[] 65536
                    while (($read = $fs.Read($buf, 0, $buf.Length)) -gt 0) {
                        $res.OutputStream.Write($buf, 0, $read)
                    }
                } finally { $fs.Close() }
            }
        }

        $res.Close()
    } catch {
        try { $ctx.Response.StatusCode = 500; $ctx.Response.Close() } catch { }
    }
}

try { $listener.Stop() } catch { }
