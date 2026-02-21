import React from 'react';
import {StyleProp, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}
export const Button = (props: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[styles.button, {padding: props.padding}, props.style]}>
      {props.children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ffffff14',
    borderRadius: 5,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
