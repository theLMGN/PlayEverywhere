const electronInstaller = require('electron-winstaller');
resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: 'build/PlayEverywhere-win32-x64',
    outputDirectory: 'build',
    authors: 'theLMGN',
    exe: 'PlayEverywhere.exe'
  });

resultPromise.then(() => console.log("[Win] Packaged"), (e) => console.log(`[Win] Failed`,e));