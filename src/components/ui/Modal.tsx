import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import Colors from './Colors';
import {useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';

export interface ModalProps {
  title?: string;
  color?: string;
  icon?: string;
  close: () => void;
  children: React.ReactNode;
}

export function Modal(props: ModalProps) {
  const {height} = useWindowDimensions();
  const navigation = useNavigation();

  useEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        props.close();
        e.preventDefault();
      }),
    [navigation],
  );

  return (
    <Pressable style={styles.backdrop} onPress={props.close}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{...styles.scrollViewContainer, maxHeight: height / 2}}>
        <View style={styles.modalContainer}>
          {props.title && (
            <View style={styles.titleContainer}>
              {props.icon && (
                <Icon
                  name={props.icon}
                  size={24}
                  color={props.color || Colors.primaryColor}
                />
              )}
              <Text
                style={{
                  ...styles.title,
                  color: props.color || Colors.primaryColor,
                }}>
                {props.title}
              </Text>
            </View>
          )}
          {props.children}
        </View>
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
  },
  scrollViewContainer: {
    backgroundColor: Colors.paneColor,
    borderRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    bottom: 0,
    left: 0,
    right: 0,
    position: 'absolute',
  },
  modalContainer: {
    padding: 10,
    gap: 3,
  },
  titleContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  icon: {
    marginRight: 5,
  },
});
