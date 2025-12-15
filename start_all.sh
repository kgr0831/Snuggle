#!/bin/bash

echo "Snuggle 서버를 시작합니다..."

# 백엔드 실행 (백그라운드)
cd backend && npm run dev &
BACKEND_PID=$!

# 프론트엔드 실행 (백그라운드)
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# 서버 실행 대기
echo "서버가 시작될 때까지 1초 대기합니다..."
sleep 1

# 브라우저 열기 (macOS)
echo "크롬 브라우저를 엽니다..."
# macOS에서는 'open', Linux에서는 'xdg-open'을 사용합니다. 혹시 몰라 둘 다 시도해봅니다.
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:3000"
else
    xdg-open "http://localhost:3000" || echo "브라우저를 자동으로 열 수 없습니다. http://localhost:3000 으로 접속하세요."
fi

echo ""
echo "========================================================"
echo " 서버가 실행 중입니다."
echo " 종료하려면 이 터미널에서 Ctrl + C 를 누르세요."
echo "========================================================"

# 백그라운드 프로세스들이 종료될 때까지 대기
wait $BACKEND_PID $FRONTEND_PID
