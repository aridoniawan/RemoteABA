@echo off
setlocal enabledelayedexpansion
title RustDesk Configurator
echo ===================================================
echo     Konfigurasi Otomatis RustDesk Client
echo     Server: remote.aba-id.com
echo ===================================================
echo.

:: Cek apakah dijalankan sebagai Administrator
fsutil dirty query %systemdrive% >nul
if %errorlevel% neq 0 (
    echo [INFO] Membutuhkan hak akses Administrator untuk mengkonfigurasi sistem...
    echo Silakan klik "Yes" pada jendela peringatan UAC yang akan muncul.
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

set /p CLIENT_NAME="Masukkan Nama Anda / Perusahaan (Lalu tekan Enter): "
if "%CLIENT_NAME%"=="" set "CLIENT_NAME=Unknown Client"

echo.
echo [1/3] Mencari Instalasi RustDesk...
set "EXE_PATH="

if exist "C:\Program Files\RustDesk\rustdesk.exe" (
    set "EXE_PATH=C:\Program Files\RustDesk\rustdesk.exe"
) else if exist "C:\Program Files (x86)\RustDesk\rustdesk.exe" (
    set "EXE_PATH=C:\Program Files (x86)\RustDesk\rustdesk.exe"
) else if exist "%LOCALAPPDATA%\RustDesk\rustdesk.exe" (
    set "EXE_PATH=%LOCALAPPDATA%\RustDesk\rustdesk.exe"
) else if exist "%LOCALAPPDATA%\Programs\RustDesk\rustdesk.exe" (
    set "EXE_PATH=%LOCALAPPDATA%\Programs\RustDesk\rustdesk.exe"
)

if "!EXE_PATH!"=="" (
    echo [ERROR] Aplikasi RustDesk tidak ditemukan di PC ini!
    echo Harap install dan jalankan RustDesk terlebih dahulu sebelum menggunakan script ini.
    pause
    exit /b
)

echo Ditemukan di: !EXE_PATH!

echo [2/3] Menerapkan Konfigurasi dan Password...
:: Jalankan bagian PowerShell yang ada di bawah marker
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s = (Get-Content '%~f0' -Raw) -split '(?m)^:: --- POWERSHELL SCRIPT ---$'; Invoke-Command -ScriptBlock ([scriptblock]::Create($s[1])) -ArgumentList '!EXE_PATH!', '!CLIENT_NAME!'"

echo.
echo ===================================================
echo     SELESAI! Konfigurasi Berhasil Diterapkan.
echo     Admin sekarang dapat meremote PC ini.
echo ===================================================
pause
exit /b

:: --- POWERSHELL SCRIPT ---
param([string]$ExePath, [string]$ClientName)
$API_URL = "https://script.google.com/macros/s/AKfycbwcWrMws1lhl7pQ-likOHpmtXdRYFPZrHsvHEfyS6MsG5bOsini3-HbxgL_y4EkMnOleg/exec"

Write-Host "Menerapkan konfigurasi jaringan..."
# Pindah ke direktori RustDesk agar CLI berjalan sempurna
$exeDir = Split-Path $ExePath
Set-Location -Path $exeDir

# 1. Konfigurasi via CLI (--config JSON base64 reversed)
$json = '{"host":"remote.aba-id.com","relay":"remote.aba-id.com:21117","api":"https://remote.aba-id.com","key":"pLEQgFTrRcNN5uMLjnlshGAtIgKcqYhY08wi47Z5X3s="}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$b64 = [System.Convert]::ToBase64String($bytes).Replace('=', '')
$charArray = $b64.ToCharArray()
[Array]::Reverse($charArray)
$reversedB64 = -join $charArray
& $ExePath --config $reversedB64 | Out-Null
Start-Sleep -Seconds 1

Write-Host "Menerapkan password..."
& $ExePath --password "locABA2021" | Out-Null
Start-Sleep -Seconds 2

Write-Host "Me-restart RustDesk Service..."
$service = Get-Service -Name "RustDesk" -ErrorAction SilentlyContinue
if ($service) {
    Restart-Service -Name "RustDesk" -Force
    Start-Sleep -Seconds 3
}

Write-Host "[3/3] Membaca ID dan Mengirim ke Admin..."
$id = ""
try {
    $id = (& $ExePath --get-id | Out-String).Trim()
} catch {}

if (-not $id) {
    $files = @(
        "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml",
        "$env:APPDATA\RustDesk\config\RustDesk2.toml"
    )
    foreach ($file in $files) {
        if (Test-Path $file) {
            $conf = Get-Content $file -ErrorAction SilentlyContinue | Out-String
            if ($conf -match "(?m)^id\s*=\s*'([^']+)'") {
                $id = $matches[1]
                break
            }
        }
    }
}

if ($id) {
    Write-Host "ID Ditemukan: $id" -ForegroundColor Green
    $body = @{action='add'; rustdeskId=$id; name=$ClientName; notes='Auto-Configured'} | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Uri $API_URL -Method Post -Body $body -ContentType 'application/json' | Out-Null
        Write-Host "Data berhasil dikirim ke Dashboard Admin." -ForegroundColor Green
    } catch {
        Write-Host "Gagal mengirim data ke server. Periksa koneksi internet." -ForegroundColor Red
    }
} else {
    Write-Host "Gagal membaca ID otomatis." -ForegroundColor Red
}
