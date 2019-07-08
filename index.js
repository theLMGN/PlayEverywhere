const electron = require("electron")
const proc = require('child_process')
const {app, BrowserWindow,ipcMain} = require('electron')
const path = require('path')
const os = require("os")
const fs = require("fs")
const fetch = require("node-fetch")
const PlayMusic = require("playmusic")
const NodeID3 = require("node-id3")
const sanitize = require("sanitize-filename");

var pm = new PlayMusic();

var library = {}

if (typeof electron == "string") {
    const child = proc.spawn(electron, ["."]) // spawn Electron if running from node
} else {
    var music = app.getPath("music")
    var appdata = app.getPath("userData")
    var confPath = path.join(appdata, "/playeverywhere_conf.json")
    console.log("[Conf]", confPath)

    let mainWindow

    function getLibrary() {
        return new Promise(function(a,r) {
            pm.getAllTracks({ limit : 49500 },function(err, library) {
               if (err) {r(err)}
               a(library.data.items)
            });
        })
    }
    function getPlaylists() {
        return new Promise(function(a,r) {
            pm.getPlayLists(function(err, playlists) {
               if (err) {r(err)}
               a(playlists.data.items)
            });
        })
    }
    function getPlaylistSongs() {
        return new Promise(function(a,r) {
            pm.getPlayListEntries({limit:49500},function(err, tracks) {
               if (err) {r(err)}
               a(tracks.data.items)
            });
        })
    }

    function login() {
        console.log("[Conf] Reading config")
        try {
            var conf = JSON.parse(fs.readFileSync(confPath).toString())
            console.log("[Conf]",conf)
            console.log("[Login] Logging in with credentials")
            pm.init(conf, async function(err) {
                if (err) {
                    console.log("[Conf]",err)
                    mainWindow.webContents.executeJavaScript("login()")
                } else {
                    console.log("[Login] Success!")
                    mainWindow.webContents.executeJavaScript("setTitle('Loading library')")
                    console.log("[Library] Grabbing library")
                    library.songs = await getLibrary()
                    console.log("[Library]",library.songs.length, "songs in library")

                    console.log("[Library] Grabbing playlists")
                    library.playlists = await getPlaylists()
                    console.log("[Library]",library.playlists.length, "playlists")

                    console.log("[Library] Grabbing songs in playlists")
                    var songs = await getPlaylistSongs()
                    console.log("[Library] Adding songs to playlists")
                    for (var song of songs) {
                        var inPl = false
                        for (var p in library.playlists) {
                            if (!library.playlists[p].songs) {library.playlists[p].songs = []}
                            if (song.playlistId == library.playlists[p].id) {
                                inPl = true
                                library.playlists[p].songs.push(song)
                            }
                        }
                        if (!inPl) {console.log(song)}
                    }
                    console.log("[Library] Sending to client")

                    mainWindow.webContents.executeJavaScript("gotLibrary(" + JSON.stringify(library) + ")")
                }
            })
        } catch(e) {
            console.log("[Conf]",e)
            mainWindow.webContents.executeJavaScript("login()")
        }
    }

    ipcMain.on("performLogin",function(evt,args) {
        console.log("[Login] Logging in with credentials",args.join(":"))
        pm.login({email: args[0], password: args[1]}, function(err,creds) {
            if(err) {
                console.error("[Login]",err)
                var ferr = err.toString()
                if (ferr == "Error: 403 error from server") {ferr = "Incorrect username/password"}
                electron.dialog.showErrorBox("Failed to login!", ferr)
                evt.reply("loginFailed",ferr)
            } else {
                console.log("[Login] Got credentials",creds)
                console.log("[Conf] Writing credentials to disk")
                fs.writeFileSync(confPath,JSON.stringify(creds))
                console.log("[Conf] Done, logging in.")
                login()
            }
            
        })
    })

    function createWindow () {
        console.log("[Electron] Creating window")
        mainWindow = new BrowserWindow({
            width: 700,
            height: 600,
            show:false,
            vibrancy: "ultra-dark",
            webPreferences: {
                nodeIntegration: true
            }
        })
        mainWindow.setMenu(null)

        mainWindow.loadFile('ui/index.html')
        mainWindow.on('closed', function () {
            console.log("[Electron] Cya")
            mainWindow = null
        })
        mainWindow.once('ready-to-show', async () => {
            if (os.platform() == "darwin") {
                mainWindow.webContents.executeJavaScript("document.body.style.background = 'transparent'")
            } else {
                mainWindow.webContents.executeJavaScript("document.body.style.background = '#333'")
            }

            console.log("[Electron] It's showtime!")
            setTimeout(function() {
                mainWindow.show()
            }, 150)
            login()
        })
        
        function download(url,p) {
            return new Promise(function(a,r) {
                //console.log("[DL]", url, "->",p)
                fetch(url).then(res => {
                    const dest = fs.createWriteStream(p);
                    res.body.pipe(dest);
                    res.body.on("end", function() {
                        //console.log("   [DL] Finished!")
                        a()
                        
                    })

                });
            })
        }

        function createIfDoesntExist(folder) {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder)
            }
        }

        ipcMain.on('download', (event, arg) => {
            try {
                var tr = arg.track
                if (!tr) {
                    for (var a of library.songs) {
                        if (a.id == arg.trackId) {
                            tr = a
                            tr.storeId = a.id
                        }
                    }
                }
                var outputPath = (path.join(music,"PlayEverywhere",sanitize(arg.playl),sanitize(tr.album),sanitize(tr.title)+ ".mp3"))
                if (!fs.existsSync(outputPath)) {
                    if (tr) {
                        pm.getStreamUrl(tr.storeId, async function(err,url) {
                            var temp = path.join(appdata, "/playeverywhere_cache")
                            if (!fs.existsSync(temp)) {
                                fs.mkdirSync(temp)
                            }
                            await download(url, path.join(temp,"/",tr.storeId + ".mp3"))
                            await download(tr.albumArtRef[0].url, path.join(temp,"/",tr.storeId + ".jpg"))
                            NodeID3.write({
                                TALB: tr.album,
                                artist: tr.artist,
                                publisher: tr.albumArtist,
                                partOfSet: tr.discNumber,
                                genre: tr.genre,
                                title: tr.title,
                                trackNumber: tr.trackNumber,
                                year: tr.year,
                                comment: "Downloaded from Google Play Music.\n" + JSON.stringify(tr),
                                APIC: path.join(temp,"/",tr.storeId + ".jpg"),
                            }, path.join(temp,"/",tr.storeId + ".mp3"))
                            createIfDoesntExist(music)
                            createIfDoesntExist(path.join(music,"PlayEverywhere"))
                            createIfDoesntExist(path.join(music,"PlayEverywhere"))
                            createIfDoesntExist(path.join(music,"PlayEverywhere",sanitize(arg.playl)))
                            createIfDoesntExist(path.join(music,"PlayEverywhere",sanitize(arg.playl),sanitize(tr.album)))
                            fs.renameSync(path.join(temp,"/",tr.storeId + ".mp3"),outputPath)
                            fs.unlinkSync(path.join(temp,"/",tr.storeId + ".jpg"))
                            event.reply("downloadFinished")
                        });
                    } else {
                        console.error("[DL] No storeId",arg)
                        event.reply("downloadFinished")
                    }
                } else {
                    event.reply("downloadFinished")
                }
            } catch(e) {
                console.error("[DL]",e,arg)
                event.reply("downloadFinished")
            }
            
        })

        ipcMain.on('setProgress', (event, arg) => {
            mainWindow.setProgressBar(arg)
        })


    }

    app.on('ready', createWindow)

    // Quit when all windows are closed.
    app.on('window-all-closed', function () {
        app.quit()
    })

}