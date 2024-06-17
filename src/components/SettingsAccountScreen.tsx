import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import Header from './ui/Header';
import Colors from './ui/Colors';
import {BannerArea} from './SettingsScreen';
import SettingsBlock from './ui/SettingsBlock';
import CustomInput from './ui/CustomInput';

const AccountSettings = () => {
  return (
    <View style={styles.pageContainer}>
      <Header title="Account Settings" showGoBack />
      <ScrollView style={styles.pageContainerInner}>
        <BannerArea />
        <View style={{marginTop: 60, margin: 10, gap: 8}}>
          <InputBlock icon="mail" title="Email" />
          <InputBlock icon="face" title="Username" />
          <InputBlock icon="local-offer" title="Tag" />
        </View>
      </ScrollView>
    </View>
  );
};

const InputBlock = (props: {
  icon: string;
  title: string;
  description?: string;
}) => {
  return (
    <SettingsBlock
      label={props.title}
      icon={props.icon}
      description={props.description}>
      <CustomInput returnKeyType="done" />
    </SettingsBlock>
  );
};

export default AccountSettings;

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.paneColor,
    flexDirection: 'column',
    flex: 1,
  },
  pageContainerInner: {
    flex: 1,
    margin: 2,
    overflow: 'hidden',
  },
});
