import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import React, {useEffect} from 'react';
import Logo from '../assets/logo.png';

import {View, StyleSheet, Text, Image} from 'react-native';
import {RootStackParamList} from '../../App';

import Colors from './ui/Colors';
import {observer} from 'mobx-react-lite';
import {useStore} from '../store/store';

export type MainNavigationProp = NavigationProp<RootStackParamList>;

const SplashScreen = observer(() => {
  const {account, socket} = useStore();
  const nav = useNavigation<MainNavigationProp>();

  useEffect(() => {
    setTimeout(() => {
      if (account.token === null) {
        nav.dispatch(StackActions.replace('Login'));
        return;
      }
      if (account.token) {
        nav.dispatch(StackActions.replace('Main'));
        socket.connect();
      }
    }, 300);
  }, [account.token, nav, socket]);

  return (
    <View style={styles.pageContainer}>
      <Image style={styles.logo} source={Image.resolveAssetSource(Logo)} />
    </View>
  );
});

export default SplashScreen;

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.paneColor,
    flexDirection: 'column',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    height: 120,
    width: 120,
    borderRadius: 120,
  },
});
