echo "[macOS] Building"
electron-packager . PlayEverywhere --platform darwin --out ./build --overwrite --icon ./ui/img/logo.icns
echo "[macOS] Packaging"
electron-installer-dmg ./build/PlayEverywhere-darwin-x64/PlayEverywhere.app PlayEverywhere --out=./build --icon=./ui/img/logo.icns --overwrite