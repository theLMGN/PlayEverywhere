echo "[Linux] Building..."
electron-packager . PlayEverywhere --platform linux --out ./build --overwrite --icon ./ui/img/logo.ico

echo "[Linux] Packaging DEB"
electron-installer-debian --src build/PlayEverywhere-linux-x64/ --dest build/ --overwrite --arch x64
echo "[Linux] Packaging RPM"
electron-installer-redhat --src build/PlayEverywhere-linux-x64/ --dest build/ --overwrite --arch x64
echo "[Linux] Packaging Flatpak"
electron-installer-flatpak --src build/PlayEverywhere-linux-x64/ --dest build/ --overwrite --arch x64