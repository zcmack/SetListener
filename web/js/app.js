<script>
"use strict";

var fwdQuery = 'http://localhost:8414/SetlistServer/query';
//var fwdQuery = 'http://ec2-54-227-6-186.compute-1.amazonaws.com/SetlistServer/query';
var curSongs = null;
var curArtist = null;
var curTitle = '';


function searchSetlist(artistName, callback) {
    var url = 'http://api.setlist.fm/rest/0.1/search/artists.json?artistName=' + artistName;
    $.getJSON(fwdQuery, { q:url})
        .success(function(data) {
            console.log("successfulcall")
            callback(data);
        })
        .error(function(data) {
            console.log("not successful")
            callback(data);
        });
}

function fetchSetlist(setid, callback) {
    var url = 'http://api.setlist.fm/rest/0.1/setlist/' + setid + '.json';
    $.getJSON(fwdQuery, { q:url})
        .success(function(data) {
            callback(data);
        })
        .error(function(data) {
            callback(data);
        });
}

function getArtistEvents(artistName, mbid, callback) {
    var url = 'http://api.setlist.fm/rest/0.1/artist/' + mbid + '/setlists.json';
    $.getJSON(fwdQuery, { q:url})
        .success(function(data) {
            info("");
            callback(data);
        })
        .error(function(data) {
            error("Can't find any recent concerts for " + artistName);
            callback(null);
        });
}

function searchForArtistOld() {
    var artistName = $("#source").val();
    $("#main").hide();
    info("Searching for " + artistName);
    searchSetlist(artistName, function(data) {
        if (data && data['artists']) {
            var artist = null;
            if (data['artists']['@total'] > 1) {
                var artists = data['artists']['artist']
                artist = artists[0];
                for (var i = 0; i < artists.length; i++) {
                    var tartist = artists[i];
                    if (artistName.toLowerCase() === tartist["@name"].toLowerCase()) {
                        artist = tartist;
                        break;
                    } else {
                        if (tartist["@name"].length < artist["@name"].length) {
                            artist = tartist;
                        }
                    }
                }
            } else if (data['artists']['@total'] > 0) {
                artist = data['artists']['artist'];
            } else {
                error("Can't find artist " + artistName);
            }
            if (artist) {
                info("Getting recent shows for " + artistName);
                getArtistEvents(artistName, artist['@mbid'], function(data) {
                    if (data) {
                        showEvents(artistName, data);
                    }
                });
            }
        } else {
            error("Can't find artist " + artistName);
        }
    });
}


function showSetlistFromUrl(url) {
    var fields = url.split('-');
    var setid =  fields[fields.length - 1].replace('.html', '');
    fetchSetlist(setid, function(setlist) {
        if (setlist && 'setlist' in setlist) {
            showShow(setlist.setlist);
        } else {
            error("Can't find a setlist at that url");
        }
    });
}

function searchForArtist() {
    var artistName = $("#source").val();
    $("#main").hide();
    info("Searching for " + artistName);
    if (artistName.indexOf('http://www.setlist.fm/setlist') == 0) {
        showSetlistFromUrl(artistName);
    } else {
        $.getJSON('http://developer.echonest.com/api/v4/artist/search',
            {
                api_key: "ECLJI0GPBJVEXSZDT",
                name:artistName,
                bucket:'id:musicbrainz',
                limit:true
            }, function(data) {
                var response = data.response;
                if (response.status.code == 0 && response.artists.length > 0) {
                    var mbid = response.artists[0].foreign_ids[0].foreign_id;
                    var name = response.artists[0].name;
                    mbid = mbid.split(':')[2];
                    info("Getting recent shows for " + name);
                    getArtistEvents(name,  mbid, function(data) {
                        if (data) {
                            showEvents(name, data);
                        } else {
                            searchForArtistOld();
                        }
                    });
                } else {
                    searchForArtistOld();
                }
            }).error(function() {
                searchForArtistOld();
            });
    }
}


function showEvents(artistName, setdata) {
    var show = getBestShow(setdata);
    showShow(show);
}

function showShow(show) {
    if (show) {
        $("#main").show();
        info("");
        var artistName = show.artist["@name"];
        var title = getTitleFromShow(artistName, show);
        var songs = getSongNamesFromShow(show);
        var url = show.url;
        $("#show-title").text(title).attr('href', url);
        curTitle = title;

        var list = $("#song-list");
        list.empty();
        _.each(songs, function(s) {
            var li = $("<div>").text(s);
            list.append(li);
        });
        curArtist = artistName;
        curSongs = songs;
    } else {
        error("Can't find any shows with songs for " + artistName);
    }
}

function getTitleFromShow(artistName, show) {
    return artistName + " at " + show.venue["@name"] + " on " +
        parseEventDate(show["@eventDate"]);
}

function parseEventDate(date) {
    var fields = date.split('-');
    if (fields.length == 3) {
        var year = (fields[2]);
        var month = (fields[1]);
        var day =  (fields[0]);
        return year + '-' + month + '-' + day;
    } else {
        return date;
    }
}



function getSongNamesFromShow(show) {
    var titles = [];
    if (isArray(show.sets.set)) {
        _.each(show.sets.set, function(set) {
            _.each(set.song, function(s) {
                var title = s["@name"];
                if (title && title.length > 0) {
                    titles.push(title);
                }
            });
        });
    } else if (typeof show.sets === 'object' && 'set' in show.sets) {
        _.each(show.sets.set.song, function(s) {
            var title = s["@name"];
            if (title && title.length > 0) {
                titles.push(title);
            }
        });
    }
    return titles;
}

function savePlaylist() {
    localStorage.setItem('createplaylist-tracks', JSON.stringify(curSongs));
    localStorage.setItem('createplaylist-name', curTitle);
    localStorage.setItem('createplaylist-artist', curArtist);
    loginWithSpotify();
}

function loginWithSpotify() {
    var client_id = '39474be678754f298dee643a3dc0a31d';
    var redirect_uri = 'http://static.echonest.com/SetListener/callback.html';
    var url = 'https://accounts.spotify.com/authorize?client_id=' + client_id +
        '&response_type=token' +
        '&scope=playlist-modify-private' +
        '&redirect_uri=' + encodeURIComponent(redirect_uri);
    var w = window.open(url, 'asdf', 'WIDTH=400,HEIGHT=500');
}

function isArray(obj) {
    return Object.prototype.toString.call( obj ) === '[object Array]'
}

function getBestShow(setData) {
    for (var i = 0; i < setData.setlists.setlist.length; i++) {
        var setList = setData.setlists.setlist[i];
        if (getSongNamesFromShow(setList).length > 0) {
            return setList;
        }
    }
    return null;
}

function error(msg) {
    info(msg);
}

function info(msg) {
    $("#info").text(msg);
}

$(document).ready(
    function() {
        $("#source").keyup(
            function(event) {
                if (event.keyCode == 13) {
                    searchForArtist();
                }
            }
        );
        $("#go").on('click', function() {
            searchForArtist();
        });
        $("#save").on('click', function() {
            savePlaylist();
        });
    }
);

</script>