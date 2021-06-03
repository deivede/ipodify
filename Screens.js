import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TouchableHighlight, Button, StyleSheet, Text, View, Linking, Image } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, ResponseType, useAuthRequest, refreshAsync } from 'expo-auth-session';
import { firebaseInit, spotifyApi, auth, firestore, clientId } from './keys'
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import { SocialIcon } from 'react-native-elements';
import * as Google from 'expo-google-app-auth';
import "./ipodify.png"
import styles from './Styles.js'


WebBrowser.maybeCompleteAuthSession();

const Artists = ({ navigation, route }) => {

  const { document } = route.params
  const array = document.artists
  var elementArray = []

  elementArray = array.map(artist => (
          <TouchableHighlight
            style={styles.box}
            underlayColor="#80dfff"
            onPress={() => {
            navigation.push('Albums', {paramA: array.indexOf(artist)})
            }}>
            <Text style={styles.text}>
              {artist.name}
            </Text>
          </TouchableHighlight>
          )
        )

  return (
    <ScrollView style={styles.container}>
    {elementArray}
    </ScrollView>
        )
}

const Albums = ({ navigation, route }) => {

  const { document } = route.params
  const artistsList = document.artists
  const selectedArtist = route.params.paramA
  const array = artistsList[selectedArtist].albums
  var elementArray = []

  elementArray = array.map(album => (
    <TouchableHighlight
      style={styles.box}
      underlayColor="#80dfff"
      onPress={() => {
      navigation.push('Tracks', {paramA: selectedArtist,   paramA2: array.indexOf(album)})
      }}>
      <Text style={styles.text}>
        {album.name}
      </Text>
    </TouchableHighlight>
  ))

  return (
    <ScrollView style={styles.container}>
        {elementArray}
    </ScrollView>
        )
}

const Tracks = ({ navigation, route }) => {

    const handlePress = (url) => useCallback(async () => {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(`Don't know how to open this URL: ${url}`);
    }
  }, [url]);

    const { document } = route.params
    const artistsList = document.artists
    const selectedArtist = route.params.paramA
    const selectedAlbum = route.params.paramA2

    const array = artistsList[selectedArtist].albums[selectedAlbum].tracks
    var elementArray = []

    elementArray = array.map(track => (
                            <TouchableHighlight
                              style={styles.box}
                              underlayColor="#80dfff"
                              onPress={handlePress(track.url)}>
                                  <Text style={styles.text}>
                                    {track.name}
                                  </Text>
                            </TouchableHighlight>
                          )
                   )

  return (
    <ScrollView style={styles.container}>
      {elementArray}
    </ScrollView>
        )

}

const SignIn = ({ navigation, route }) => {

  const [user, loading, error] = useAuthState(auth);

  async function signInWithGoogleAsync() {
      const result = await Google.logInAsync({
        androidStandaloneAppClientId: '706309522310-98kcqm9pnr0k2mc9hvlf1b6rf5b32dac.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
      });

      if (result.type === 'success') {
        const credential = firebase.auth.GoogleAuthProvider.credential(result.idToken);
        firebase.auth().signInWithCredential(credential);
      }
  }
  const [loadingLib, setLoadingLib] =  useState('No user')
  const [key, setKey] = useState('a')
  const db = firestore.collection('lib').doc(key)
  var [snapshot] = useDocumentData(db)

  useEffect(() => {
    if(user){
      setKey(user.email)
      setLoadingLib('Loading Player...')
     }
  }, [user])

  useEffect(() => {
    if(snapshot){
      setLoadingLib('Player')
    }
  }, [snapshot])

  return (
    <>
    <View style={styles.image}>
    <Image
    source={ require('./ipodify.png')}
    style={styles.logo}
    />
    </View>
    <View>
    <Text style={{textAlign: 'center',
                  fontWeight: 'bold'}}>
    {user ? user.email : 'No user. Sign In below'}
    </ Text>
    </View>
    <SocialIcon
      title={loadingLib}
      button
      light
      onPress={() => {
         navigation.push('Artists')
        }}
    />
    <SocialIcon
      title="Configurations"
      button
      light
      onPress={() => {
         navigation.push('Configurations')
        }}
    />
    <SocialIcon
      title="Sign with Google"
      button
      light
      type='google'
      disable={user}
      onPress={() => {
        signInWithGoogleAsync();
        }}
    />
    <SocialIcon
      title="Logout"
      button
      light
      disable={!user}
      onPress={() => {
         auth.signOut()
        }}
    />
    </>
  )
}

const Configurations = ({ navigation, route }) => {

 const [user] = useAuthState(auth);
 const [loading, setLoading] = useState('Add your library')

 const [key, setKey] = useState('a')
 const db = firestore.collection('lib').doc(key)

 var [snapshot] = useDocumentData(db)

 useEffect(() => {
   if(user){
     setKey(user.email)
    }
 }, [user])

 useEffect(() => {
   if(snapshot){
     setKey(user.email)
     setLoading('Update Library')
    }
 }, [snapshot])

 const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Token,
      clientId: clientId,
      scopes: ['user-follow-read', 'user-follow-modify'],
      usePKCE: false,
      redirectUri: makeRedirectUri({
        scheme: "exp"
      }),
    },
     {
      authorizationEndpoint: 'https://accounts.spotify.com/authorize',
      tokenEndpoint: 'https://accounts.spotify.com/api/token',
    }
  )

  useEffect(() => {

    if (response?.type === 'success') {

      async function login() {
         const { access_token } = response.params;

         spotifyApi.setAccessToken(access_token);

         const doc = firestore.collection('lib').doc(user.email);

             const getArtists = await spotifyApi.getFollowedArtists({limit: 50});

             setLoading("loading...")

             const unsortedItems = getArtists.body.artists.items;

             var artistsItems = unsortedItems.sort(function(a, b) {
                var textA = a.name.toUpperCase();
                var textB = b.name.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });

             if(getArtists.body.artists.cursors.after !== null) {
               const nextArtists = await spotifyApi.getFollowedArtists({limit: 50, after: getArtists.body.artists.cursors.after})
               artistsItems = artistsItems.concat(nextArtists.body.artists.items)
             }

             var artists = { artists: [] };

             for(let a=0; a< artistsItems.length; a++) {
               let item = {};
               item.url = artistsItems[a].external_urls.spotify
               item.id =  artistsItems[a].id
               item.name = artistsItems[a].name
               item.albums = []
               item.visible = true

               artists.artists.push(item)
             }

// Add Albums

             for(let i=0; i < artistsItems.length; i++) {

              const albums = await spotifyApi.getArtistAlbums(artistsItems[i].id, {limit: 50, include_groups:'album'});
              var albumItems = albums.body.items;

              if(albumItems.total > 50){
                const moreAlbums = await spotifyApi.getArtistAlbums(artistsItems[i].id, {limit: 50, offset: 50, include_groups:'album'});
                const moreAlbumsItems = moreAlbums.body.items;
                albumItems = albumItems.concat(moreAlbumsItems)
              }

              for(let b=0; b < albumItems.length ; b++) {
                 var album = {}
                 album.id = albumItems[b].id
                 album.name = albumItems[b].name
                 album.type = albumItems[b].type
                 album.tracks = []
                 album.visible = true

                 artists.artists[i].albums.push(album)
              }

               for(let y=0; y < albumItems.length; y++) {
                 const albumTracks = await spotifyApi.getAlbumTracks(artists.artists[i].albums[y].id);
                 const albumTracksItems = albumTracks.body.items

                 for(let c=0; c < albumTracksItems.length; c++) {
                 var tracks = {}
                 tracks.id = albumTracksItems[c].id
                 tracks.name = albumTracksItems[c].name
                 tracks.url = albumTracksItems[c].external_urls.spotify

                 artists.artists[i].albums[y].tracks.push(tracks)
               }
             }

// Add Singles

             const single = await spotifyApi.getArtistAlbums(artistsItems[i].id, {limit: 50, include_groups:'single'});
             var singlesItems = single.body.items;

             var singles = {
                tracks:[],
                name: "Artist singles"
              }

             for(let d=0; d < singlesItems.length; d++) {
                var track = {}
                track.id = singlesItems[d].id
                track.name = singlesItems[d].name
                track.album_type = singlesItems[d].album_type
                track.url = singlesItems[d].external_urls.spotify

                singles.tracks.push(track)
             }

             artists.artists[i].albums.unshift(singles)
           }

           doc.set({ document: artists });
           setLoading("Library added");
        }

       login();
     }
  }, [response]);

  return (
    <SocialIcon
      title={loading}
      button
      light
      onPress={() => {
        promptAsync();
        }}
    />

  );
}

export { Artists, Albums, Tracks, SignIn, Configurations }
