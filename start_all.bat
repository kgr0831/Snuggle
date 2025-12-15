@echo off
chcp 65001 >nul
echo Snuggle 서버를 시작합니다...

:: 백엔드 실행 (현재 창 안에서 백그라운드 실행)
start /b cmd /c "cd backend && npm run dev"

:: 프론트엔드 실행 (현재 창 안에서 백그라운드 실행)
start /b cmd /c "cd frontend && npm run dev"

:: 서버가 실행될 시간을 잠시 기다립니다 (2초)
timeout /t 2 >nul

:: 크롬 브라우저 열기
start chrome http://localhost:3000

echo.
echo ========================================================
echo  서버가 실행 중입니다.
echo  이 창을 닫으면 서버가 함께 종료됩니다.
echo ========================================================
pause
