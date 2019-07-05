var updateInterval;
var alertCounter = 0;

function copyToClipboard(element) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val($(element).text()).select();
    document.execCommand("copy");
    $temp.remove();
}


removeTorrentRequest =  function(id, goodCB, badCB){
    console.log(id);
    $.ajax({
        url: "/remove",
        contentType : "application/json; charset=utf-8",
        type: "POST",
        data: JSON.stringify({"torrent_id" : id})
    }).done(function (data, status) {
        var r = {"status" : status, "data" : data};
        if(goodCB) goodCB(r);
        if(!goodCB) return r;
    }).fail (function (data, status) {
        var r = {"status" : status, "data" : data};
        if(badCB) badCB(r);
        if(!badCB) return r;
    });
};

levelToLabel = function(level){
    switch (level) {
        case 0: return "B";
        case 1: return "KB";
        case 2: return "MB";
        case 3: return "GB";
        case 4: return "TB";
    }

};

formatBytes = function(v){
    let level = 0;
    while(v > 1024){
        v = v/1024;
        level ++;
    }

    v = v.toFixed(2);

    return v + " " + levelToLabel(level);

};

formatTime = function(s){

    let d = new Date(s);

    let r = ""
    let _s = d.getSeconds();
    let _m = d.getMinutes();
    let _h = d.getHours();
    r = _h + ":" + _m + ":" + _s;

    let _d = d.getDate()-1;

    if(_d >= 1){
        if(d === 1){
            r = d + " day, " + r;
        } else {
            r = d + " days, " + r;
        }
    }
    return r;
};


createTorrentRow = function(info){

    // console.log(info);

    let row = document.createElement("div");
    row.classList.add("progress");
    row.classList.add("mb-3");
    row.classList.add("bg-dark");
    row.style.position = "relative";
    row.style.width = "100%";

    row.style.height = "auto";

    // row.style.height = "35px";

    let progressBarCompleted = document.createElement("div");
    progressBarCompleted.classList.add("progress-bar");
    progressBarCompleted.classList.add("progress-bar-animated");
    progressBarCompleted.classList.add("progress-bar-striped");
    progressBarCompleted.style.position = "absolute";
    progressBarCompleted.style.height= "100%";

    // let progressBarToDo = document.createElement("div");
    // progressBarToDo.classList.add("progress-bar");
    // progressBarToDo.classList.add("bg-dark");



    switch (info.status) {
        case 0:
            progressBarCompleted.classList.add("bg-secondary");
            break;
        case 1:
        case 2:
        case 3:
            progressBarCompleted.classList.add("bg-warning");
            break;
        case 4:
        case 5:
            progressBarCompleted.classList.add("bg-info");
            break;
        case 6:
            progressBarCompleted.classList.add("bg-success");
            break;
        case 7:
            progressBarCompleted.classList.add("bg-dark");
            break;

    }




    progressBarCompleted.role = "progressbar";
    progressBarCompleted.setAttribute("aria-valuenow", info.percentDone * 100);
    progressBarCompleted.setAttribute("aria-valuemin", "0");
    progressBarCompleted.setAttribute("aria-valuemax", "100");

    // progressBarToDo.role = "progressbar";
    // progressBarToDo.setAttribute("aria-valuenow", (1-info.percentDone) * 100);
    // progressBarToDo.setAttribute("aria-valuemin", "0");
    // progressBarToDo.setAttribute("aria-valuemax", "100");



    // console.log(info.percentDone)

    progressBarCompleted.style.width = "" + info.percentDone * 100 + "%";
    // progressBarToDo.style.width = "" + (1-info.percentDone) * 100 + "%";

    let torrentTitle = document.createElement("h6");
    torrentTitle.innerText = info.name;
    torrentTitle.classList.add("font-bold");
    torrentTitle.classList.add("pl-2");
    torrentTitle.classList.add("pt-2");

    torrentTitle.style.position = "relative";
    torrentTitle.style.maxWidth = "80%";



    let progressPercentage = document.createElement("h6");
    progressPercentage.innerText = (info.percentDone * 100 ).toFixed(2) + "%";
    progressPercentage.classList.add("font-bold");
    progressPercentage.classList.add("text-right");
    progressPercentage.classList.add("mb-0");
    progressPercentage.classList.add("pr-2");
    progressPercentage.classList.add("pt-2");
    progressPercentage.style.position = "absolute";
    progressPercentage.style.right= "15px";

    progressPercentage.style.maxWidth = "15%";


    if(info.error !== 0) {
        progressPercentage.classList.add("text-danger");
        torrentTitle.classList.add("text-danger");
    } else {
        progressPercentage.classList.add("text-white");
        torrentTitle.classList.add("text-white");
    }

// <button type="button" class="btn btn-primary">Primary</button>

    // let deleteButton = document.createElement("button");
    // deleteButton.classList.add("btn");


    row.appendChild(progressBarCompleted);
    // row.appendChild(progressBarToDo);
    row.appendChild(torrentTitle);
    row.appendChild(progressPercentage);
    // row.appendChild(deleteButton);

    row.onclick = function () {
        // console.log("CLICK");
        $("#torrentInfoModalTitle").text(info.name);
        console.log("Set id ", info.id);

        $("#torrentInfoModalRemoveButton").attr("remove-id", info.id);

        $("#torrentInfoModalMagnetLink").text(info.magnetLink);

        $("#torrentInfoModalMagnetLink").on('click', function () {
            console.log("Copy torrentInfoModalMagnetLink");
            copyToClipboard($(this));
        });

        $("#torrentInfoModal").modal('toggle');

        if(info.error !== 0){
            $("#torrentInfoModalErrorRow").show();
            $("#torrentInfoModalErrorDiv").text(info.errorString);
        } else {
            $("#torrentInfoModalErrorRow").hide();
        }

        $("#torrentInfoModalFileSize").text(formatBytes(info.totalSize));
        $("#torrentInfoModalPeersNumber").text(info.peers.length)

    };

    return row;

}


onChangeFileNameUpload = function(){
    $('#modalFileInput').on('change',function(e){
        // console.log(e.target.files)
        var uploadingFiles = e.target.files.length;
        let out = "" + uploadingFiles + " file";
        if(uploadingFiles !== 1) out += "s";
        out += " selected.";
        $(this).next('.custom-file-label').html(out);
    })
};

onSuccessfulUpload = function(){
    $('.navbar-toggler').click();
    $('#addTorrentModal').modal('hide');
    $('#modalFileInput').next('.custom-file-label').text("Choose file(s)");
    $("#modalMagnetInput").val("")

};

onClickModalUploadButton = function(){
    $("#modalUploadButton").click(function () {
        // console.log($("#modalFileInput"));
        var file_data = $("#modalFileInput").prop("files");
        var form_data = new FormData();

        for(let i = 0; i < file_data.length; i++){

            form_data.append('file', file_data[i]);

        }
        console.log(form_data);

        $.ajax({
            url: "/upload/torrent",
            contentType : "multipart/form-data",
            type: "POST",
            data: form_data,
            processData: false,
            contentType: false
        }).done(function (data, status) {
                console.log("DONE");
                // ("#modalFileInput").val();
                console.log(status);
                console.log(data);
                onSuccessfulUpload();
            }).fail (function (data, status) {
                console.log("ERROR");
                console.log(status);
                console.log(data);
        });
    });
};

getTransmissionStatus = function(goodCB, badCB){
    $.ajax({
        url : "/status",
        method : "GET"
    }).done(function (data, status) {
        if(goodCB) return goodCB(data);
        return data;
    }).fail(function (data, status) {
        if(badCB) return badCB(data);
        return data;
    })
};

createSourceListItem = function(item){
    console.log(item);
    let r = document.createElement("div");
    r.classList.add("col-8");
    r.classList.add("mx-auto");
    r.classList.add("btn");
    r.classList.add("btn-dark");
    r.classList.add("font-weight-light");
    r.classList.add("mt-1");
    r.classList.add("text-left");
    r.classList.add("pr-4");


    if(typeof item === 'string') r.innerText = item;
    if(typeof item === 'object') r.innerText = item.file;

    return r;
};

createSourceListFile = function(item){


    var file = createSourceListItem(item);

    console.log(file);

    file.onclick = function(){

        console.log(item.href);
        let url = "video/" + item.href;
        console.log(url);
        $("#myPlayer").attr("src", url);
        $("#myPlayer").attr("type", "video/mp4");

        $("#playerRow").addClass("pt-2");
        $("#playerRow").removeClass("d-none");

    };

    return file;
}

createSourceListDir = function (dirname){

    var dir = createSourceListItem(dirname);
    console.log("Create dir " + dirname);

    dir.onclick = function () {
        showPlayerNaviButtons();
        console.log("Click on " + dirname);
        getSourcesList(populateSourcesList, displayNotification, dirname);
    };

    return dir;
};

showPlayerNaviButtons = function(){
    $("#playerNaviButtons").removeClass("d-none");
};

hidePlayerNaviButtons = function(){
    $("#playerNaviButtons").addClass("d-none");
};

populateSourcesList = function(obj){

    // console.log("pSL");

    var files = obj.files;
    var dirs = obj.directories;


    // console.log(files, dirs);

    $("#sourceList").empty();

    for(let i = 0; i < files.length; i++){
        let item = files[i];
        item = createSourceListFile(item);
        $("#sourceList").append(item);
    }

    for(let i = 0; i < dirs.length; i++){
        let dir = dirs[i];
        dir = createSourceListDir(dir);
        $("#sourceList").append(dir);
    }

    if(obj.injectedDir !== ""){
        showPlayerNaviButtons();
    } else {
        hidePlayerNaviButtons();
    }
};

getSourcesList = function(goodCB, badCB, dir){
    var path = "/sources/";
    if(!dir) dir = "";
    if(dir) path += dir;
    $.ajax({
        url: path,
        type: "GET"
    }).done(function (data, status) {
        // console.log("get /sources" + dir);
        // console.log(status);
        // console.log(data);
        dir ? data.injectedDir = dir : data.injectedDir = "";

        if(goodCB) return goodCB(data);
        return data;

    }).fail (function (data, status) {
        console.log("bad get /sources");
        if(badCB) return badCB(data, "danger");
        return data;

    });
};

populateStatsModal = function(data){
    let downloaded = formatBytes(data['cumulative-stats'].downloadedBytes);
    let uploaded = formatBytes(data['cumulative-stats'].uploadedBytes);
    let addedFiles = data['cumulative-stats'].filesAdded
    let activeTime = formatTime(data['cumulative-stats'].secondsActive);
    let timeStarted = data['cumulative-stats'].sessionCount;
    let downSpeed = formatBytes(data.downloadSpeed) + "/s";
    let upSpeed = formatBytes(data.uploadSpeed) + "/s";

    $("#statsModalDownloadedBytes").text(downloaded);
    $("#statsModalUploadedBytes").text(uploaded);
    $("#statsModalAddedFiles").text(addedFiles);
    $("#statsModalActiveTime").text(activeTime);
    $("#statsModalStartedTime").text(timeStarted);
    $("#statsModalDownloadSpeed").text(downSpeed);
    $("#statsModalUploadSpeed").text(upSpeed);
};

renderStatus = function(status){

    $("#myTabContent").show();
    $("#errorContainer").attr("style", "visibility : hidden");

    // console.log("status");
    console.log(status);

    // console.log(status.torrentsStatus.torrents.length)

    $("#torrentsContainer").empty();

    if(status.torrentsStatus.torrents.length > 0) {
        for(let i = 0; i < status.torrentsStatus.torrents.length; i++){
            let row = createTorrentRow(status.torrentsStatus.torrents[i]);
            $("#torrentsContainer").append(row);
        };
    };
    populateStatsModal(status);

};

createNewNotification = function(text, type){

// <div class="alert alert-warning alert-dismissible fade show" role="alert">
        // <strong>Holy guacamole!</strong> You should check in on some of those fields below.
    // <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        // <span aria-hidden="true">&times;</span>
    // </button>
    // </div>


    let _alert = document.createElement("div");


    switch (type) {
        case "danger":
            _alert.classList.add("alert-danger");
            break;
        case "success":
            _alert.classList.add("alert-success");
            break;
        default:
            _alert.classList.add("alert-primary");
    }
    // _alert.classList.add("mx-auto");
    _alert.classList.add("mt-2");
    _alert.classList.add("pl-2");
    _alert.classList.add("pr-2");
    _alert.classList.add("alert");
    _alert.classList.add("col-md-6");
    _alert.classList.add("offset-md-3");

    _alert.classList.add("alert-dismissible");
    _alert.classList.add("fade");
    _alert.classList.add("show");
    _alert.classList.add("font-weight-light");
    _alert.setAttribute("role", "alert");


    _alert.innerHTML = text;

    let _alertButton = document.createElement("button");
    _alertButton.setAttribute("type", "button");
    _alertButton.classList.add("close");
    _alertButton.setAttribute("data-dismiss", "alert");
    _alertButton.setAttribute("aria-label", "Close");

    let _alertButtonSpan = document.createElement("span");
    _alertButtonSpan.setAttribute("aria-hidden", "true");
    _alertButtonSpan.innerHTML = "&times;";

    _alertButton.appendChild(_alertButtonSpan);
    _alert.appendChild(_alertButton);

    let id = "dismissible-alert-" + alertCounter;
    alertCounter++;

    _alert.id = id;

    setTimeout(function () {
        $("#"+id).alert('close');
    }, 3000);

    console.log(id);

    return _alert;
};

displayNotification = function(message, type){
    console.log("message");
    console.log(message);

    clearInterval(updateInterval);
    // $("#myTabContent").hide();
    // $("#errorContainer").attr("style", "visibility : visible");


    if(message.syscall === "connect" && message.code === "ECONNREFUSED"){
        var _err = createNewNotification("Cannot connect to Transmission: Start Transmission and reload the page.", type)
    } else if(message.result) {
        let errorText = message.result[0].replace(new RegExp("<h1>", 'g'), "<h5>").replace(new RegExp("</h1>", 'g'), "</h5\>");
        var _err = createNewNotification(errorText, type);
    } else if(message.Error) {
        var _err = createNewNotification(message.Error, type);
    } else if(message.errno === "ENOTFOUND"){
        var _err = createNewNotification("Cannot connect to " + message.hostname, type);
    } else {
        var _err = createNewNotification(message, type);
    }


    $("#errorBox").append(_err);

};

monitor = function(t){
    // console.log("Call monitor");
    updateInterval = setInterval(update, t);
};

update = function(){
    getTransmissionStatus(function (status) {
        renderStatus(status)
    }, function (error) {
        displayNotification(error.responseJSON, "danger");
    });
};



onClickMagnetUploadButton = function(){

    $("#modalMagnetButton").click(function () {

        var magnetLink = $("#modalMagnetInput").val();

        if(magnetLink){

            var jsonData = { magnet_link : magnetLink };

            console.log(jsonData);

            $.ajax({
                url: "/upload/magnet",
                type: 'POST',
                data: JSON.stringify(jsonData),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json'
            }).done(function (data, status) {
                console.log("DONE");
                // ("#modalFileInput").val();
                console.log(status);
                console.log(data);
                onSuccessfulUpload();
            }).fail (function (data, status) {
                console.log("ERROR");
                console.log(status);
                console.log(data);
            });

        }
    });

};

onClickTorrentRemoveButton = function(){

    $("#torrentInfoModalRemoveButton").on('click',function () {
        let id = $(this).attr("remove-id");
        id = parseInt(id);
        console.log("Removing torrent with id " + id);
        removeTorrentRequest(id, function (info) {
            let deletedId = info.data.result.deleted[0];
            console.log("Removed torrent with id " + deletedId);
            $("#torrentInfoModal").modal('hide');
            update();
        }, function (info) {
            $("#torrentInfoModal").modal('hide');
            displayNotification(info, "success");
        })
    });
}
onClickNaviHomeButton = function(){
    $("#NaviHome").click(function () {
        hidePlayerNaviButtons();
        $("#playerRow").addClass("d-none");
        getSourcesList(populateSourcesList, displayNotification);
    });
};

requestSetup = function(transmissionAuth, goodcb, badcb){

    $.ajax({
        url: "/setup",
        type: 'POST',
        data: JSON.stringify(transmissionAuth),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
    }).done(function (data, status) {
        console.log("POST /setup");
        // ("#modalFileInput").val();

        if(goodcb) return goodcb(data);
        return data;
    }).fail (function (data, status) {
        console.log("POST /setup");
        console.log("ERROR");
        console.log(data);
        console.log(status);

        if (badcb) return badcb(data);
        return data;
    });
};

requestDisconnect = function(goodcb, badcb){

    $.ajax({
        url: "/disconnect",
        type: 'POST',
        data: null
    }).done(function (data, status) {
        console.log("POST /disconnect");
        // ("#modalFileInput").val();

        if(goodcb) return goodcb(data);
        return data;
    }).fail (function (data, status) {
        console.log("POST /disconnect");
        console.log("ERROR");
        console.log(data);
        console.log(status);

        if (badcb) return badcb(data);
        return data;
    });
};

requestTransmissionAuth = function () {
    let transmissionAuth = {};
    transmissionAuth.user = $("#transmissionUsername").val();
    transmissionAuth.passwd = $("#transmissionPassword").val();
    // transmissionAuth.host = $("#transmissionHost").val();
    transmissionAuth.port = $("#transmissionPort").val();

    console.log(transmissionAuth);
    
    requestSetup(transmissionAuth, function (data) {
        console.log(data.Result);
        if(data.Result === "Authenticated") displayNotification("Successfully authenticated!", "success");
        console.log(status);
        checkForAuth();
    }, function (data) {
        if(data.status === 401) {
            let transmissionResponseText = JSON.parse(data.responseText);
            console.log(transmissionResponseText);
            displayNotification(transmissionResponseText.Error, "danger");
        }

        checkForAuth();
    })
};

onClickSetTransmissionAuth = function(){
    $("#setTransmissionAuth").click(requestTransmissionAuth);
};

clearAuthenticationFields = function(){
    $("#transmissionPort").val("");
    $("#transmissionUsername").val("");
    $("#transmissionPassword").val("");
};

checkForAuth = function(){

    getTransmissionStatus(function () {
        $("#mainContainer").show();
        $("#authContainer").hide();
        $("#myTabContent").show();
        $("#setTransmissionAuth").click(null);

        // onChangeFileNameUpload();
        // onClickModalUploadButton();
        // onClickMagnetUploadButton();
        // onClickTorrentRemoveButton();
        // onClickNaviHomeButton();
        // update();
        // getSourcesList(populateSourcesList, displayError);
        // monitor(2000);
    }, function () {
        $("#mainContainer").hide();
        $("#authContainer").show();
        $("#myTabContent").hide();
        clearAuthenticationFields();

    })
};
onClickPlayerNavItem = function(){
    $("#playerNavItem").click(function () {
      getSourcesList(function (data) {
            console.log(data);
            console.log(data.files.length)
            if(data.files.length === 0 && data.directories.length === 0) return displayNotification("No data found.", "warning");
      }, function (data) {

      })
    })
}

onClickDisconnectButton = function(){
    $("#disconnectButton").click(function () {
        if(window.confirm("Disconnect from Movie Handler?")){
            requestDisconnect(function () {
                displayNotification("Successfully Disconnected!", "success");
                checkForAuth();
            }, function () {
                displayNotification("Cannot disconnect!", "danger");
                checkForAuth();
            })
        }
    });
};



window.onload = function () {
    checkForAuth();
    onClickSetTransmissionAuth();
    onChangeFileNameUpload();
    onClickModalUploadButton();
    onClickMagnetUploadButton();
    onClickTorrentRemoveButton();
    onClickNaviHomeButton();
    onClickPlayerNavItem();
    onClickDisconnectButton();
    update();
    getSourcesList(populateSourcesList, displayNotification);
    monitor(2000);

    onkeyup = function(e) {
        // console.log(e);
        if(e.target === $("#setTransmissionAuth")) return;
        if (e.key === "Enter") requestTransmissionAuth();
    }

    $(".modal").on('show.bs.modal', function () {
        console.log("shown");
        $("#mainContainer").attr("style", "filter: blur(8px)");
        $(".navbar").attr("style", "filter: blur(8px)");
        // filter: blur(8px);
    });

    $(".modal").on('hidden.bs.modal', function () {
        console.log("hidden");
        $("#mainContainer").attr("style", "filter: blur(0px)");
        $(".navbar").attr("style", "filter: blur(0px)");
    })
};