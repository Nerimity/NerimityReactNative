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
  children: JSX.Element | JSX.Element[];
  radius?: number;
  styles?: StyleProp<ViewStyle>;
  handleColor?: string;
  handlePosition?: 'left' | 'bottom';
  unstable_pressDelay?: number;
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
        unstable_pressDelay={props.unstable_pressDelay}
        style={styles.pressable}
        android_ripple={{color: 'gray'}}
        onPress={props.onPress}>
        <SelectedHandle
          selected={props.selected}
          color={props.handleColor}
          position={props.handlePosition}
        />
        {props.children}
      </Pressable>
    </View>
  );
}

const SelectedHandle = (props: {
  selected?: boolean;
  color?: string;
  position?: 'left' | 'bottom';
}) => {
  return props.selected ? (
    <View
      style={[
        styles.selectedHandle,
        props.color ? {backgroundColor: props.color} : undefined,
        props.position === 'bottom' ? styles.bottomHandle : undefined,
      ]}
    />
  ) : null;
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
  bottomHandle: {
    left: undefined,
    bottom: 0,
    height: 3,
    width: 15,
  },
});
