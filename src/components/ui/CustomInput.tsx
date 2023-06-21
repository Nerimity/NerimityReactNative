import React, {forwardRef} from 'react';
import {
  NativeSyntheticEvent,
  ReturnKeyTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputSubmitEditingEventData,
  View,
} from 'react-native';
import Colors from './Colors';

interface Error {
  message: string;
  path: string;
}
interface Props {
  title?: string;
  onText?(text: string): void;
  onSubmit?(event: NativeSyntheticEvent<TextInputSubmitEditingEventData>): void;
  value?: string;
  placeholder?: string;
  secure?: boolean;
  returnKeyType: ReturnKeyTypeOptions;
  autoCorrect?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: Error | string | null;
  errorName?: string | string[];
}

const CustomInput = forwardRef<TextInput, Props>((props, ref) => {
  const error = () => {
    if (props.error && typeof props.error !== 'string') {
      let errorField = props.errorName || props.title;
      if (Array.isArray(errorField)) {
        if (
          errorField
            .map(e => e.toLowerCase())
            .includes(props.error?.path?.toLowerCase())
        ) {
          return props.error.message;
        }
      } else if (
        errorField?.toLowerCase() === props.error.path?.toLowerCase()
      ) {
        return props.error.message;
      }
    }
    if (typeof props.error === 'string') {
      return props.error;
    }
  };

  return (
    <View style={styles.outerContainer}>
      {props.title && <Text style={styles.title}>{props.title}</Text>}
      <View style={styles.customInputContainer}>
        <TextInput
          ref={ref}
          style={styles.customInput}
          autoCorrect={props.autoCorrect}
          autoCapitalize={props.autoCapitalize}
          placeholder={props.placeholder}
          onChangeText={props.onText}
          defaultValue={props.value}
          returnKeyType={props.returnKeyType}
          onSubmitEditing={props.onSubmit}
          secureTextEntry={props.secure}
        />
      </View>
      {error() && <Text style={styles.errorMessage}>{error()}</Text>}
    </View>
  );
});

export default CustomInput;

const styles = StyleSheet.create({
  outerContainer: {},
  title: {
    fontSize: 16,
    marginBottom: 5,
  },
  customInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderBottomColor: Colors.primaryColor,
    borderBottomWidth: 2,
    paddingLeft: 10,
    alignItems: 'flex-end',
  },
  customInput: {
    flex: 1,
  },
  errorMessage: {
    color: Colors.alertColor,
    marginTop: 5,
  },
});
