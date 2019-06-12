var updateInterval;
var player;

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
        goodCB(data);
    }).fail(function (data, status) {
        badCB(data);
    })
};

createSourceListItem = function(item){
    console.log(item);
    let r = document.createElement("div");
    r.classList.add("col-12");
    r.classList.add("btn");
    r.classList.add("btn-dark");
    r.classList.add("font-weight-light");
    r.classList.add("mt-1");
    r.classList.add("text-left");
    r.classList.add("pr-4");

    r.onclick = function(){
        console.log(item);
        // player.src({type : item.type, src : item.href});
        player.src({type : "video/webm", src : item.href});
    }


    r.innerText = item.file;

    return r;
};

populateSourcesList = function(obj){

    console.log("pSL");

    var files = obj.files;
    var dirs = obj.directories;


    console.log(files, dirs);

    for(let i = 0; i < files.length; i++){
        let item = files[i]
        item = createSourceListItem(item);
        $("#sourceList").append(item);

    }
};

getSourcesList = function(goodCB, badCB){
    $.ajax({
        url: "/sources/",
        type: "GET"
    }).done(function (data, status) {
        console.log("get /sources");
        console.log(status);
        console.log(data);

        if(goodCB) return goodCB(data);
        return data;

    }).fail (function (data, status) {
        console.log("bad get /sources");
        if(badCB) return badCB(data);
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
    console.log("status");
    console.log(status);

    // console.log(status.torrentsStatus.torrents.length)

    $("#torrentsContainer").empty();

    if(status.torrentsStatus.torrents.length > 0) {
        $(".hidden-if-torrents").hide();
        for(let i = 0; i < status.torrentsStatus.torrents.length; i++){
            let row = createTorrentRow(status.torrentsStatus.torrents[i]);
            $("#torrentsContainer").append(row);
        };
    } else {

        $(".hidden-if-torrents").show();
    }

    populateStatsModal(status);

};

createNewError = function(text){
    let _alert = document.createElement("div");
    _alert.classList.add("alert");
    _alert.classList.add("alert_danger");
    _alert.classList.add("bg-danger");
    _alert.classList.add("text-white");
    _alert.classList.add("text-weight-light");

    _alert.setAttribute("role", "alert");

    _alert.innerText = text;

    return _alert;
};

displayError = function(error){
    console.log("error");
    console.log(error);

    clearInterval(updateInterval);
    $("#myTabContent").hide();
    $("#errorContainer").attr("style", "visibility : visible");


    if(error.syscall === "connect" && error.code === "ECONNREFUSED"){
        var _err = createNewError("Node cannot connect to transmission. Start Transmission and reload the page.")
    }


    $("#errorBox").append(_err);

};

monitor = function(t){
    updateInterval = setInterval(update, t);
};

update = function(){
    getTransmissionStatus(function (status) {
        renderStatus(status)
    }, function (error) {
        displayError(error.responseJSON);
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
    })

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
        }, function (info) {
            $("#torrentInfoModal").modal('hide');
            displayError(info);
        })
    });
}


setupPlayer = function(){
    player = videojs("myPlayer");
};

window.onload = function () {
    onChangeFileNameUpload();
    onClickModalUploadButton();
    onClickMagnetUploadButton();
    onClickTorrentRemoveButton();
    update();
    getSourcesList(populateSourcesList, displayError);
    monitor(2000);
    setupPlayer();
};