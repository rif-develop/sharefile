// ==UserScript==
// @name         pcloud remote
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  pcloud remote upload files!
// @author       You
// @include      http://localhost/remote.html
// @include      http://localhost/remote.html?debug
// @include      http://svcplus.eu5.org/remote.html
// @include      http://svcplus.eu5.org/remote.html?debug
// @grant        GM_xmlhttpRequest
// @connect      pcloud.com
// @run-at       document-start
// @updateURL    https://github.com/yujie03/sharefile/raw/master/pcloud/Tampermonkey.js
// @downloadURL  https://github.com/yujie03/sharefile/raw/master/pcloud/Tampermonkey.js

// ==/UserScript==

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function(fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

var pcloud_username = 'eurfiv85614@chacuo.net';
var pcloud_password = 'zaq1qazqaz';
var pcloud_Origin = 'https://www.pcloud.com';
var pcloud_Referer = 'https://www.pcloud.com/';
var useragent =
    'User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36';
var pcloud_post_headers = {
    'User-agent': useragent,
    'Accept': 'application/json',
    'Origin': pcloud_Origin,
    'Referer': pcloud_Referer,
    'Content-type': 'application/x-www-form-urlencoded'
};
var pcloud_get_headers = {
    'User-agent': useragent,
    'Accept': 'application/json',
    'Origin': pcloud_Origin,
    'Referer': pcloud_Referer
};
var auth = '';
var today = new Date().Format("yyyy-MM-dd");
var rootmetadata = null;
var folderid = 0;
var files = [];
var filesMap = {};

function object2form(data) {
    let ret = ''
    for (let it in data) {
        ret += encodeURIComponent(it) + '=' + encodeURIComponent(data[it]) + '&'
    }
    return ret
}

function login(cb) {
    var data = {
        username: pcloud_username,
        password: pcloud_password,
        os: 4,
        osversion: '0.0.0'
    };
    data = object2form(data);
    //debugger;
    GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://api.pcloud.com/login',
        headers: pcloud_post_headers,
        data: data,
        onload: response => {
            if (response.readyState == 4) {
                var json_data = JSON.parse(response.responseText);
                auth = json_data.auth;
                cb && cb();
            }
            console.log(response.responseText);
        }
    });
}

function createFolder(cb) {
    if (rootmetadata != null) {
        for (let i = 0; i < rootmetadata.contents.length; i++) {
            if (rootmetadata.contents[i].name == today) {
                folderid = rootmetadata.contents[i].folderid;
                break;
            }
        }
        if (folderid != 0)
            cb && cb();
        return;
    }
    var data = {
        folderid: 0,
        name: today,
        auth: auth
    };
    data = object2form(data);
    debugger;
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://api.pcloud.com/createfolder?' + data,
        headers: pcloud_get_headers,
        onload: response => {
            console.log(response.responseText);
            if (response.readyState == 4) {
                var json_data = JSON.parse(response.responseText);
                if (json_data.result == 0) {
                    folderid = json_data.metadata.folderid;
                    cb && cb();
                }
                if (json_data.result == 2004) {
                    listFolder(0, function() {
                        createFolder(cb);
                    });
                }
            }
            console.log(response.responseText);
        }
    });
}

function listFolder(folderid, cb) {
    var data = {
        folderid: folderid,
        recursive: 0,
        iconformat: 'id',
        getkey: 1,
        getpublicfolderlink: 1,
        auth: auth
    };
    data = object2form(data);
    debugger;
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://api.pcloud.com/listfolder?' + data,
        headers: pcloud_get_headers,
        onload: response => {
            console.log(response.responseText);
            if (response.readyState == 4) {
                var json_data = JSON.parse(response.responseText);
                if (json_data.result == 0) {
                    if (folderid == 0)
                        rootmetadata = json_data.metadata;
                    cb && cb(json_data.metadata);
                }
            }
            console.log(response.responseText);
        }
    });
}

function downloadfile(url, filename, cb) {
    var rd1 = Math.ceil(Math.random() * 80000000 + 10000000);
    var rd2 = Math.ceil(Math.random() * 899 + 100);
    var progresshash = 'upload-' + rd1 + '-xhr-' + rd2;
    var data = {
        folderid: folderid,
        progresshash: progresshash,
        nopartial: 1,
        url: url,
        auth: auth
    };
    data = object2form(data);
    let f = {
        progresshash,
        url,
        filename,
        fileid: 0,
        link: '',
        status: 'waiting',
        downloaded: 0,
        size: 0
    }
    files.push(f);
    filesMap[url] = f;
    storeLocal();
    GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://api8.pcloud.com/downloadfile',
        headers: pcloud_post_headers,
        data: data,
        onload: response => {
            console.log(response.responseText);
            if (response.readyState == 4) {
                var json_data = JSON.parse(response.responseText);
                if (json_data.result == 0) {
                    debugger;
                    f.fileid = json_data.metadata[0].fileid;
                    f.status = "ready";
                    f.hash = json_data.metadata[0].hash;
                    f.size = json_data.metadata[0].size;
                    f.filename = json_data.metadata[0].name;
                    if (filename != null && filename != "") {
                        f.filename = filename;
                        renamefile(f, cb);
                    } else {
                        cb && cb(fileid);
                    }
                } else
                    cb && cb(-1);
            } else {
                cb && cb(-2);
            }
            console.log(response.responseText);
        }
    });
}

function fetchuploadStatus(cb) {
    for (let i in files) {
        if ((files[i].status == "waiting" || files[i].status == "downloading") && files[i].fileid == 0) {
            //debugger;
            uploadprogress(files[i], cb);
        }
    }
}

function uploadprogress(f, cb) {
    let data = {
        progresshash: f.progresshash,
        auth: auth
    };
    data = object2form(data);
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://api8.pcloud.com/uploadprogress?' + data,
        headers: pcloud_get_headers,
        onload: response => {
            console.log(response.responseText);
            if (response.readyState == 4) {
                var json_data = JSON.parse(response.responseText);
                if (json_data.result == 0) {
                    for (let i in json_data.files) {
                        let url = json_data.files[i].url;
                        if (json_data.finished) {
                            filesMap[url].fileid = json_data.files[i].metadata.fileid;
                            filesMap[url].hash = json_data.files[i].metadata.hash;
                            filesMap[url].status = json_data.files[i].status;
                            filesMap[url].filename = json_data.files[i].metadata.name;
                            filesMap[url].downloaded = json_data.files[i].downloaded;
                            filesMap[url].size = json_data.files[i].size;
                        } else if (filesMap[url].fileid == 0) {
                            filesMap[url].downloaded = json_data.files[i].downloaded;
                            filesMap[url].size = json_data.files[i].size;
                            filesMap[url].status = json_data.files[i].status;
                        }
                        cb && cb(filesMap[url]);
                    }
                }
            }
        }
    });
}

function renamefile(f, cb) {
    var data = {
        fileid: f.fileid,
        toname: f.filename,
        auth: auth
    };
    data = object2form(data);
    debugger;
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://api.pcloud.com/renamefile?' + data,
        headers: pcloud_get_headers,
        onload: response => {
            console.log(response.responseText);
            if (response.readyState == 4) {
                var json_data = JSON.parse(response.responseText);
                if (json_data.result == 0) {
                    cb && cb(json_data.metadata.fileid);
                }
            }
        }
    });
}

function getfilelink(f, cb) {
    var data = {
        fileid: f.fileid,
        hashCache: f.hash,
        forcedownload: 1,
        auth: auth
    };
    data = object2form(data);
    debugger;
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://api.pcloud.com/getfilelink?' + data,
        headers: pcloud_get_headers,
        onload: response => {
            console.log(response.responseText);
            if (response.readyState == 4) {
                var json_data = JSON.parse(response.responseText);
                if (json_data.result == 0) {
                    f['link'] = "http://" + json_data.hosts[0] + json_data.path;
                    cb && cb(f);
                }
            }
            console.log(response.responseText);
        }
    });
}

function getfilelinkByUrl(url, cb) {
    getfilelink(filesMap[url], cb);
}

function remoteupload(url, filename) {
    function redo() {
        remoteupload(url, filename);
    }
    if (auth == '') {
        login(redo);
        return;
    }
    if (folderid == 0) {
        createFolder(redo);
        return;
    }
    downloadfile(url, filename);
}

function storeLocal() {
    if (auth != '') {
        let t = {
            timestamp: new Date().getTime(),
            auth,
            today,
            rootmetadata,
            folderid,
            files
        };
        localStorage.setItem('pcloud', JSON.stringify(t));
    }
}

function readLocal(){
    let st = localStorage.getItem('pcloud');
    if (st != null)
        st = JSON.parse(st);
    if (st != null) {
        if (new Date().getTime() - st.timestamp < 1000 * 60 * 60) {
            auth = st.auth == "" ? auth : st.auth;
            today = st.today;
            rootmetadata = st.rootmetadata == null ? rootmetadata : st.rootmetadata;
            folderid = st.folderid == 0 ? folderid : st.folderid;
            files = st.files;
            for(var f in files){
                filesMap[files[f].url] = files[f];
            }
        }
    }
}

(function() {
    unsafeWindow.pcloudRemote = {
        remoteupload,
        fetchuploadStatus,
        getfilelinkByUrl,
        storeLocal,
        readLocal,
        get filelist() {
            return files
        },
        deletefile(index){
            files.splice(index,1);
        }
    }

})();
