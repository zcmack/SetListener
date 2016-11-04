# The Set Listener

This is the source for a fork of the web app called The Set Listener. The original app
creates a Spotify playlist for your favorite artist's most recent
show. This fork will do the same, but for Google Play Music.
 The app uses the Setlist.fm API and the Spotify API. 



The original app is online at [The Set Listener](http://static.echonest.com/SetListener)



# The Server

The Set Listener has a server component that manages the API interaction with setlist.fm
because the setlist.fm API doesn't support cross-domain access.


# The Web App
The web app is a relatively simple app that solicits and artist name from the user, finds
recents shows by that artist via setlist.fm, looks up the Google Play Music tracks and creates a playlist. 
This uses the gmusicapi python module and is not officially supported by Google in any way.

