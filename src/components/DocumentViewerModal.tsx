import React from 'react';
import { Modal, View, TouchableOpacity, Image, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';

interface Props {
  visible: boolean;
  url: string | null;
  mime?: string;
  onClose: () => void;
}

// A same-page document/photo preview — deliberately not a new browser
// tab/window. Viewing used to go through window.open(), which some
// browser extensions block regardless of the site's own pop-up
// permission (no site-level "allow" fixes that). Rendering inline here
// sidesteps popup blockers entirely since no new browsing context is
// ever created.
const WebFrame: any = 'iframe';

export default function DocumentViewerModal({ visible, url, mime, onClose }: Props) {
  const isImage = (mime || '').startsWith('image/');

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.white} />
        </TouchableOpacity>

        {!url ? (
          <ActivityIndicator size="large" color={Colors.white} />
        ) : isImage ? (
          <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
        ) : Platform.OS === 'web' ? (
          <WebFrame src={url} style={webFrameStyle} title="document" />
        ) : (
          <ActivityIndicator size="large" color={Colors.white} />
        )}
      </View>
    </Modal>
  );
}

const webFrameStyle = {
  width: '100%',
  height: '100%',
  border: 'none',
  backgroundColor: '#fff',
  borderRadius: 12,
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: Spacing.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    flex: 1,
    marginTop: Spacing.xxl,
  },
});
