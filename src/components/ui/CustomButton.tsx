import React from 'react';
import {StyleProp, Text, View, ViewStyle} from 'react-native';
import CustomPressable from './CustomPressable';

interface CustomButtonProps {
  title: string;
  onPress(): void;
  padding?: number;
  margin?: number;
  styles?: StyleProp<ViewStyle>;
}

export default function CustomButton(props: CustomButtonProps) {
  return (
    <View style={{margin: props.margin || 3}}>
      <CustomPressable radius={8} onPress={props.onPress}>
        <View style={{padding: props.padding || 11}}>
          <Text>{props.title}</Text>
        </View>
      </CustomPressable>
    </View>
  );
}
