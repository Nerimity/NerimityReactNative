import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import CustomPressable from './CustomPressable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from './Colors';

interface CustomButtonProps {
  title?: string;
  icon?: string;
  onPress(): void;
  padding?: number;
  margin?: number;
  styles?: StyleProp<ViewStyle>;
  color?: string;
}

export default function CustomButton(props: CustomButtonProps) {
  return (
    <View style={{margin: props.margin || 3}}>
      <CustomPressable
        radius={8}
        styles={styles.pressableStyles}
        onPress={props.onPress}>
        <View
          style={[
            {
              padding: props.padding || 11,
            },
            styles.buttonInnerContainer,
            props.styles,
          ]}>
          {props.icon && (
            <Icon color={props.color || Colors.primaryColor} name={props.icon} size={20} />
          )}
          {props.title && <Text style={{...styles.text, color: props.color || Colors.primaryColor}}>{props.title}</Text>}
        </View>
      </CustomPressable>
    </View>
  );
}
const styles = StyleSheet.create({
  buttonInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pressableStyles: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  text: {},
});
