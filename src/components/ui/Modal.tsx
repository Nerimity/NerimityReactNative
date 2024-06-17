import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import Colors from './Colors';
import {useEffect} from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {BottomSheetModalMethods} from '@gorhom/bottom-sheet/lib/typescript/types';

export interface ModalProps {
  title?: string;
  color?: string;
  icon?: string;
  children: React.ReactNode;
  onChange?: (isShowing: boolean) => void;
}

export interface ModalRef {
  modal: BottomSheetModalMethods;
}

export const Modal = forwardRef<ModalRef, ModalProps>((props, ref) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const {height} = useWindowDimensions();
  const [isShowing, setIsShowing] = useState<boolean>(false);

  const updateIsShowing = useCallback(
    (val: boolean) => {
      setIsShowing(val);
      props.onChange?.(val);
    },
    [props],
  );

  useImperativeHandle(ref, () => ({
    modal: bottomSheetModalRef.current!,
  }));

  useEffect(() => {
    const backAction = () => {
      if (isShowing) {
        bottomSheetModalRef.current?.close();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [isShowing]);

  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      enableDynamicSizing={true}
      backdropComponent={renderBackdrop}
      maxDynamicContentSize={height / 2}
      onChange={idx => {
        updateIsShowing(idx < 0 ? false : true);
      }}
      handleIndicatorStyle={{
        backgroundColor: Colors.primaryColor,
      }}
      backgroundStyle={{backgroundColor: Colors.paneColor}}>
      <BottomSheetScrollView>
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
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

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
