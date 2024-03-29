import React, {forwardRef, useCallback, useRef} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Modal, ModalRef} from './ui/Modal';
import CustomPressable from './ui/CustomPressable';
import Colors from './ui/Colors';

interface Props {
  items: DropdownItem[];
  selectedId: string;
  title?: string;
  icon?: string | JSX.Element;
}

export interface DropdownItem {
  id: string | number;
  label: string;
  data?: any;
  circleColor?: string;
  onClick?: () => void;
}

export const Dropdown = (props: Props) => {
  const selectedItem = props.items.find(item => item.id === props.selectedId);
  const modalRef = useRef<ModalRef>(null);

  const handlePresentModalPress = useCallback(() => {
    modalRef.current?.modal.present();
  }, []);

  return (
    <View>
      {props.title && <Text style={styles.title}>{props.title}</Text>}
      <CustomPressable onPress={handlePresentModalPress}>
        <View style={styles.selectedItemContainer}>
          <Item item={selectedItem!} />
          <Icon name="expand-more" size={20} />
        </View>
      </CustomPressable>

      <DropdownModal
        ref={modalRef}
        title={props.title}
        items={props.items}
        close={() => modalRef.current?.modal.dismiss()}
        selectedItemId={props.selectedId}
      />
    </View>
  );
};

interface DropDownModalProps {
  title?: string;
  selectedItemId: string;
  items: DropdownItem[];
  close: () => void;
}

const DropdownModal = forwardRef<ModalRef, DropDownModalProps>((props, ref) => {
  return (
    <Modal ref={ref} title={props.title}>
      <View style={styles.modalContainer}>
        {props.items.map(item => (
          <CustomPressable
            onPress={() => {
              item.onClick?.();
              props.close();
            }}>
            <View
              style={[
                styles.modalItemContainer,
                item.id === props.selectedItemId &&
                  styles.modalItemSelectedContainer,
              ]}>
              {item.id === props.selectedItemId && (
                <View style={styles.selectedPill} />
              )}
              <Item item={item} key={item.id} />
            </View>
          </CustomPressable>
        ))}
      </View>
    </Modal>
  );
});

const Item = (props: {item: DropdownItem}) => {
  return (
    <View style={styles.itemInnerContainer}>
      {props.item.circleColor && (
        <View
          style={{...styles.circle, backgroundColor: props.item.circleColor}}
        />
      )}
      <Text>{props.item.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primaryColor,
    marginBottom: 8,
    marginLeft: 8,
  },
  selectedItemContainer: {
    flexDirection: 'row',
    backgroundColor: '#0009',
    borderRadius: 8,
    alignItems: 'center',
    padding: 8,
    height: 50,
    borderColor: 'rgba(255,255,255,.2)',
    borderWidth: 1,
    margin: 2,
  },
  modalContainer: {
    gap: 2,
  },
  modalItemContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    alignItems: 'center',
    padding: 12,
    paddingLeft: 12,
  },
  modalItemSelectedContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  selectedPill: {
    position: 'absolute',
    left: 0,
    backgroundColor: Colors.primaryColor,
    height: 16,
    width: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  itemInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 8,
    height: 8,
    borderRadius: 8,
    marginRight: 8,
  },
});
