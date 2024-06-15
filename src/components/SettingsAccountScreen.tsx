import React from 'react';
import {StyleSheet, View} from 'react-native';
import Header from './ui/Header';
import Colors from './ui/Colors';
import {BannerArea} from './SettingsScreen';

const AccountSettings = () => {
  return (
    <View style={styles.pageContainer}>
      <View style={styles.pageContainerInner}>
        <Header title="Settings" />
        <BannerArea />
        <View style={{marginTop: 60, margin: 10}} />
      </View>
    </View>
  );
};

export default AccountSettings;

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.backgroundColor,
    flexDirection: 'column',
    flex: 1,
  },
  pageContainerInner: {
    backgroundColor: Colors.paneColor,

    flex: 1,
    margin: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
