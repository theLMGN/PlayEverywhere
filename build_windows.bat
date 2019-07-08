@echo "[Win] Building"
start electron-packager . PlayEverywhere --platform win32 --out ./build --overwrite --icon ./ui/img/logo.ico
@echo "[Win] Packaging"
node package-windows.js