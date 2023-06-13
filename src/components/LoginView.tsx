import React, {useRef, useState} from 'react';

import {View, StyleSheet, Text, TextInput, StatusBar} from 'react-native';

import Colors from './ui/Colors';
import CustomInput from './ui/CustomInput';
import CustomButton from './ui/CustomButton';
import {loginRequest} from '../services/UserService';
import {storeUserToken} from '../utils/EncryptedStore';
import {useStore} from '../store/store';
import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import {RootStackParamList} from '../../App';

export default function LoginView() {
  return (
    <View style={styles.pageContainer}>
      <StatusBar backgroundColor={Colors.paneColor} />

      <CenteredContainer />
    </View>
  );
}

export type MainNavigationProp = NavigationProp<RootStackParamList>;

const CenteredContainer = () => {
  const [loggingIn, setLoggingIn] = useState(false);
  const {account, socket} = useStore();
  const [error, setError] = useState({message: '', path: ''});
  const nav = useNavigation<MainNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const passwordRef = useRef<TextInput>(null);

  const onLoginPress = async () => {
    if (loggingIn) {
      return;
    }
    setError({message: '', path: ''});
    setLoggingIn(true);
    const response = await loginRequest(email.trim(), password.trim()).catch(
      setError,
    );
    setLoggingIn(false);
    if (!response) {
      return;
    }
    storeUserToken(response.token);
    account.setToken(response.token);
    nav.dispatch(StackActions.replace('Main'));
    socket.connect();
  };

  return (
    <View style={styles.centeredContainer}>
      <Text style={styles.title}>Login to continue</Text>
      <View style={styles.inputs}>
        <CustomInput
          title="Email"
          errorName={['email', 'usernameAndTag']}
          returnKeyType="next"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmit={() => passwordRef.current?.focus()}
          onText={setEmail}
          value={email}
          error={error}
        />
        <CustomInput
          title="Password"
          secure
          returnKeyType="done"
          ref={passwordRef}
          onText={setPassword}
          value={password}
          error={error}
        />
      </View>
      <CustomButton
        title={loggingIn ? 'Logging In...' : 'Login'}
        icon="login"
        onPress={onLoginPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.paneColor,
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'center',
  },
  centeredContainer: {
    alignSelf: 'center',
    padding: 10,
    width: '100%',
    gap: 30,
  },
  title: {
    color: Colors.primaryColor,
    fontWeight: 'bold',
    fontSize: 20,
  },
  inputs: {
    gap: 20,
  },
});
