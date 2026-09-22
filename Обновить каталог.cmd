@echo off
cd /d "%~dp0"
node scripts/generate-posters.mjs
if errorlevel 1 goto poster_error
node scripts/build-site.mjs --catalog-only
if errorlevel 1 (echo Catalog update failed.) else (echo Catalog updated. Refresh the local website.)
pause
exit /b

:poster_error
echo Poster generation failed. Install FFmpeg and retry.
pause
exit /b 1
