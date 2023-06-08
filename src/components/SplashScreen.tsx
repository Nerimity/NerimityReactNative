import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import React, {useEffect} from 'react';

import {View, StyleSheet, Text} from 'react-native';
import {RootStackParamList} from '../../App';

import Colors from './ui/Colors';
import {observer} from 'mobx-react-lite';
import {useStore} from '../store/store';

export type MainNavigationProp = NavigationProp<RootStackParamList>;

const SplashScreen = observer(() => {
  const {account, socket} = useStore();
  const nav = useNavigation<MainNavigationProp>();

  useEffect(() => {
    if (account.token === null) {
      nav.dispatch(StackActions.replace('Login'));
      return;
    }
    if (account.token) {
      nav.dispatch(StackActions.replace('Main'));
      socket.connect();
    }
  }, [account.token, nav, socket]);

  return (
    <View style={styles.pageContainer}>
      <Text style={styles.loadingText}>Very Cool Loading Screen...</Text>
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
  loadingText: {
    color: Colors.primaryColor,
    fontWeight: 'bold',
    fontSize: 30,
    textAlign: 'center',
    margin: 10,
  },
});
