@echo off
cd /d "%~dp0"
node scripts/build-site.mjs --catalog-only
if errorlevel 1 (echo Catalog update failed.) else (echo Catalog updated. Refresh the local website.)
pause
