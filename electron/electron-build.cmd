@echo off
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build:web
npx electron-builder --win.skipSigning
exit /b %ERRORLEVEL%