@echo off
rem Builds the optimized production version and serves it on http://localhost:3107
rem (much smoother than "npm run dev": no HMR, no React dev checks, minified code).
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run fast
