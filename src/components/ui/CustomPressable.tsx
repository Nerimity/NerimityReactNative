import React from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Colors from './Colors';

interface CustomPressable {
  selected?: boolean;
  onPress?: ((event: GestureResponderEvent) => void) | null;
  children: JSX.Element;
  radius?: number;
  styles?: StyleProp<ViewStyle>;
}
export default function CustomPressable(props: CustomPressable) {
  return (
    <View
      style={[
        styles.pressableContainer,
        props.radius ? {borderRadius: props.radius} : undefined,
        props.styles,
      ]}>
      <Pressable
        style={styles.pressable}
        android_ripple={{color: 'gray'}}
        onPress={props.onPress}>
        <SelectedHandle selected={props.selected} />
        {props.children}
      </Pressable>
    </View>
  );
}

const SelectedHandle = (props: {selected?: boolean}) => {
  return props.selected ? <View style={styles.selectedHandle} /> : null;
};

const styles = StyleSheet.create({
  pressableContainer: {
    overflow: 'hidden',
    borderRadius: 10,
  },
  pressable: {alignItems: 'center', justifyContent: 'center'},
  selectedHandle: {
    height: 15,
    position: 'absolute',
    left: 0,
    borderRadius: 8,
    width: 3,
    backgroundColor: Colors.primaryColor,
  },
});
