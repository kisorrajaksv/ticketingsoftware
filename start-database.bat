@echo off
echo Checking PostgreSQL status...
"D:\postgresql\bin\pg_ctl.exe" status -D "D:\postgresql\data" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo PostgreSQL is ALREADY running on port 5432!
    pause
    exit /b 0
)

echo Starting PostgreSQL database on port 5432...
"D:\postgresql\bin\pg_ctl.exe" start -D "D:\postgresql\data" -w -t 60
if %ERRORLEVEL% EQU 0 (
    echo PostgreSQL started successfully on port 5432!
) else (
    echo pg_ctl failed, launching PostgreSQL in a minimized background window...
    start "PostgreSQL Server" /MIN "D:\postgresql\bin\postgres.exe" -D "D:\postgresql\data"
    timeout /t 3 >nul
    echo PostgreSQL launched! Keep the minimized PostgreSQL window open while developing.
)
pause
