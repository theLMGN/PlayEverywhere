const ipcRenderer = require('electron').ipcRenderer
var lib = {songs: [], playlists: []}

var queue = []
var current
var needsToLogin = false

function login() {
    needsToLogin = true
}

function setTitle(title) {
    if (!title || title.length == 0) {
        document.title = "PlayAnywhere"
    } else {
        document.title = "PlayAnywhere - " + title
    }
    
}
var event
function download(song) {
    return new Promise(function(a,r) {
        event = a
        ipcRenderer.send("download",song)
        ipcRenderer.once("downloadFinished",a)
    })
}
function timeToString(time){
    var diff = new Date().getTime() - new Date(time).getTime();
    if(diff < 0){
        diff = -diff
    }
    var date=new Date(diff);
    if(date.getTime() > 31536000000){
        return(date.getUTCFullYear()-1970).toString()+" yr"
    }
    if(date.getTime() > 2629800000) {
        return date.getUTCMonth().toString()+" mo"
    }
    if(date.getTime() > 86400000) {
        return date.getUTCDate().toString()+" day"
    }
    if(date.getTime() > 3600000) {
        return date.getUTCHours().toString()+" hr"
    }
    if(date.getTime() > 60000) {
        return date.getUTCMinutes().toString()+" min"
    }
    if(date.getTime() > 1000) {
        return date.getUTCSeconds().toString()+" sec"
    }
    return date.getTime().toString()+" ms"
}


async function grabPlaylist(i) {
    document.querySelector("#loadingBar").style.top = "calc(50vh + 8em)"
    document.querySelector("#loadingLogo").style.top = "calc(50vh - 6em)"
    document.querySelector(".mdl-layout__container").style.pointerEvents = "none"
    document.querySelector(".mdl-layout__container").style.opacity = "0"
    var pl = lib.playlists[i]

    setTitle("Downloading playlist " + pl.name)
    var i = 0
    for (var song of pl.songs) {
        try {
            console.log("Downloading song ", song)
            song.playl = pl.name
            await download(song)
            i += 1
            document.querySelector("#loadingBar").MaterialProgress.setProgress((i / pl.songs.length) * 100)
            ipcRenderer.send("setProgress", i / pl.songs.length)
            setTitle("Downloading playlist " + pl.name + " " + i + "/" + pl.songs.length)
        } catch(e) {}
    }
    document.querySelector("#loadingBar").style.top = "100vh"
    document.querySelector("#loadingLogo").style.top = "-12em"
    document.querySelector(".mdl-layout__container").style.pointerEvents = "all"
    document.querySelector(".mdl-layout__container").style.opacity = "1"
    setTitle()
    ipcRenderer.send("setProgress",-1)
}

function gotLibrary(library) {
    lib = library
    console.log(library)
    var playlistHtml = ""
    lib.playlists.sort(function(a,b) {
        return b.recentTimestamp - a.recentTimestamp
    })
    var i = -1
    for (var playlist of lib.playlists) {
        i += 1
        if (playlist.songs.length > 0) {
            playlistHtml += `<tr onclick="grabPlaylist(${i})">
                <td class="mdl-data-table__cell--non-numeric">${playlist.name}</td>
                <td>${playlist.songs.length}</td>
                <td>${timeToString(new Date(parseInt(playlist.lastModifiedTimestamp / 1000)))}</td>
            </tr>`
        } 
    }
    document.querySelector("#plTable").innerHTML = playlistHtml
    

    document.querySelector("#loadingSpinner").style.top = "100vh"
    document.querySelector("#loadingLogo").style.top = "-12em"
    document.querySelector(".mdl-layout__container").style.pointerEvents = "all"
    setTitle()
    setTimeout(function() {
        document.querySelector(".mdl-layout__container").style.opacity = "1"
    },15)
    setTimeout(function() {
        document.querySelector("#loadingSpinner").style.transition = "none"
    },1000)
}
setTimeout(function() {
    if (needsToLogin) {
        setTitle("Login")
        document.querySelector("#loadingSpinner").style.transition = "none"
        document.querySelector("#login").style.top = "calc(50vh + 8em)"
    } else {
        document.querySelector("#loadingSpinner").style.top = "calc(50vh + 8em)"
    }
},1000) 

function performLogin() {
    document.querySelector("#loadingSpinner").style.top = "calc(50vh + 8em)"
    document.querySelector("#loadingSpinner").style.transition = "1s top"
    document.querySelector("#login").style.top = "110vh"
    ipcRenderer.send("performLogin", [document.querySelector("#username").value,document.querySelector("#password").value])
}
ipcRenderer.on("loginFailed", function() {
    document.querySelector("#loadingSpinner").style.top = "50vh"
    document.querySelector("#login").style.top = "calc(50vh + 8em)"
})
ipcRenderer.on("setTitle",setTitle)