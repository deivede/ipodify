import React, { useState, useEffect } from 'react';
import { TouchableHighlight, View, Linking, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Artists, Albums, Tracks, SignIn, Configurations } from './Screens.js'
import { firestore, auth } from './keys'
import styles from './Styles.js'

const Root = createStackNavigator()

export default function App() {

  const [user, loading, error] = useAuthState(auth);
  const [key, setKey] = useState('a')

  const db = firestore.collection('lib').doc(key)

  var [snapshot] = useDocumentData(db)

  useEffect(() => {
    if(user){
      setKey(user.email)
     }
  }, [user])

      return (
        <NavigationContainer>
          <Root.Navigator>
            <Root.Screen name="SignIn" component={SignIn} />
            <Root.Screen name="Configurations" component={Configurations} />
  {snapshot && <Root.Screen name="Artists" initialParams={snapshot} component={Artists}  /> }
{snapshot && <Root.Screen name="Albums" initialParams={snapshot} component={Albums} />}
{snapshot && <Root.Screen name="Tracks" initialParams={snapshot} component={Tracks}  />}
          </Root.Navigator>
      </NavigationContainer>
    )

}
