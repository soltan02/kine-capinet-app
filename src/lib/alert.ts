import { Alert as RNAlert, Platform } from 'react-native';

type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
};

// react-native-web's Alert.alert is a no-op stub, so every confirmation/
// error/success dialog silently does nothing on web and Electron builds.
// This shim falls back to window.confirm/alert there while keeping the
// same Alert.alert(title, message, buttons) call signature everywhere.
function webAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  const fullMessage = [title, message].filter(Boolean).join('\n\n');

  if (!buttons || buttons.length === 0) {
    window.alert(fullMessage);
    return;
  }

  if (buttons.length === 1) {
    window.alert(fullMessage);
    buttons[0].onPress?.();
    return;
  }

  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const confirmButton = buttons.find((b) => b !== cancelButton) || buttons[buttons.length - 1];

  if (window.confirm(fullMessage)) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (Platform.OS === 'web') {
      webAlert(title, message, buttons);
    } else {
      RNAlert.alert(title, message, buttons as any);
    }
  },
};
