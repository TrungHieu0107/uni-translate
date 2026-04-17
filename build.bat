@echo off
setlocal enabledelayedexpansion
echo ========================================
echo  Column Translator - One Click Build
echo ========================================
echo.

REM --- Check Rust ---
echo [CHECK] Rust toolchain...
rustc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Rust is not installed.
    echo Install from: https://rustup.rs
    pause
    exit /b 1
)
echo OK: Rust found.

REM --- Check Node.js ---
echo [CHECK] Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed.
    echo Install from: https://nodejs.org
    pause
    exit /b 1
)
echo OK: Node.js found.

REM --- Check npm ---
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found.
    pause
    exit /b 1
)
echo OK: npm found.

echo.
echo ========================================
echo  Building...
echo ========================================
echo.

REM --- Install dependencies ---
echo [1/3] Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo OK: Dependencies installed.
echo.

REM --- Tauri Build ---
echo [2/3] Building Tauri app (release)...
call npm run tauri build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Tauri build failed. Check error messages above.
    pause
    exit /b 1
)

REM --- Done ---
echo.
echo [3/3] Build complete!
echo.
echo Output locations:
if exist "src-tauri\target\release\bundle\nsis\" (
    echo   [OK] NSIS Installer:  src-tauri\target\release\bundle\nsis\
)
if exist "src-tauri\target\release\bundle\msi\" (
    echo   [OK] MSI Installer:   src-tauri\target\release\bundle\msi\
)
if exist "src-tauri\target\release\UniTranslate SQL.exe" (
    echo   [OK] Standalone Exe:  src-tauri\target\release\UniTranslate SQL.exe
) else if exist "src-tauri\target\release\uni-translate-sql.exe" (
    echo   [OK] Standalone Exe:  src-tauri\target\release\uni-translate-sql.exe
)
echo.

REM Open folder
if exist "src-tauri\target\release\bundle\nsis\" (
    echo Opening NSIS folder...
    start "" "src-tauri\target\release\bundle\nsis"
) else if exist "src-tauri\target\release\bundle\" (
    echo Opening bundle folder...
    start "" "src-tauri\target\release\bundle"
) else if exist "src-tauri\target\release\" (
    echo Opening release folder...
    start "" "src-tauri\target\release"
) else (
    echo WARNING: Output folders not found.
)

pause
