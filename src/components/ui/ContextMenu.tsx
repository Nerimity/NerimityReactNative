import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';

import Colors from "./Colors";
import CustomPressable from "./CustomPressable";
import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";


export interface ContextMenuOption {
  title?: string;
  icon?: string;
  color?: string;
  onPress?: (item: ContextMenuOption) => void;
  separator?: boolean;
}

export function ContextMenu(props: { header?: JSX.Element, close: () => void, items: ContextMenuOption[] }) {
  const { height } = useWindowDimensions();
  const navigation = useNavigation();

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        props.close();
        e.preventDefault()
      }),
    [navigation]
  );


  const onPress = (item: ContextMenuOption) => {
    item?.onPress?.(item);
    props.close();
  }
  return (
    <Pressable style={styles.backdrop} onPress={props.close}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ ...styles.scrollViewContainer, maxHeight: height / 2 }}>
        {props.header}
        <View style={styles.contextMenuContainer}>
          {props.items.map((item, i) => (
            <ContextItem
              key={i}
              title={item.title}
              color={item.color}
              icon={item.icon}
              separator={item.separator}
              onPress={() => onPress(item)}
            />
          ))}
        </View>
      </ScrollView>
    </Pressable>
  )
}


function ContextItem(props: { separator?: boolean; title?: string, icon?: string; color?: string; onPress: () => void; }) {

  if (props.separator) {
    return <View style={styles.separator} />
  }

  return (
    <CustomPressable onPress={props.onPress}>
      <View style={styles.contextItemContainer}>
        <Icon name={props.icon || "texture"} size={20} color={props.color || "white"} />
        <Text style={{ color: props.color || 'white' }}>{props.title}</Text>
      </View>
    </CustomPressable>
  )
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
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    bottom: 0,
    left: 0,
    right: 0,
    position: 'absolute',

  },
  contextMenuContainer: {
    padding: 10,
    gap: 3,
  },
  contextItemContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: 6,
    height: 40,
    flexShrink: 0,
    width: "100%",
    gap: 5,
  },
  separator: {
    height: 1,
    width: "100%",
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  }
});