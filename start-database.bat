@echo off
echo Starting PostgreSQL database on port 5432...
"D:\postgresql\bin\pg_ctl.exe" start -D "D:\postgresql\data"
if %ERRORLEVEL% EQU 0 (
    echo PostgreSQL started successfully on port 5432!
) else (
    echo Starting postgres.exe directly...
    start /B "PostgreSQL" "D:\postgresql\bin\postgres.exe" -D "D:\postgresql\data"
)
pause
