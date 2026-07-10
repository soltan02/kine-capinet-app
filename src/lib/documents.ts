import { Platform, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase, ClientAttachment } from './supabase';

const BUCKET = 'client-documents';

export interface PickedFile {
  uri: string;
  name: string;
  mime: string;
  size?: number;
}

const sanitize = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 80) || 'document';

const nameFromUri = (uri: string) => {
  const last = uri.split('/').pop() || 'document';
  return decodeURIComponent(last.split('?')[0]);
};

/** Open the system document picker. Returns null if cancelled. */
export async function pickDocument(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, name: a.name || nameFromUri(a.uri), mime: a.mimeType || 'application/octet-stream', size: a.size ?? undefined };
}

/** Pick a photo from the gallery or camera. Returns null if cancelled/denied. */
export async function pickImage(fromCamera: boolean): Promise<PickedFile | null> {
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('permission_denied');

  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync(opts)
    : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName || nameFromUri(a.uri) || `photo_${Date.now()}.jpg`,
    mime: a.mimeType || 'image/jpeg',
    size: a.fileSize ?? undefined,
  };
}

/** Upload a picked file to the private bucket under the client's folder. */
export async function uploadClientDocument(clientId: string, file: PickedFile): Promise<ClientAttachment> {
  const base64 = await readAsStringAsync(file.uri, { encoding: EncodingType.Base64 });
  const bytes = decode(base64);
  const path = `${clientId}/${Date.now()}_${sanitize(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.mime,
    upsert: false,
  });
  if (error) throw error;
  return {
    id: path,
    name: file.name,
    path,
    mime: file.mime,
    size: file.size,
    uploaded_at: new Date().toISOString(),
  };
}

/** Short-lived signed URL for opening/downloading a stored document. */
export async function getDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error || new Error('signed_url_failed');
  return data.signedUrl;
}

/** Open a stored (or legacy externally-linked) document/photo.
 *
 * On web, opening a signed URL requires fetching it first (createSignedUrl
 * is a network round-trip) and only then calling window.open — but by the
 * time that await resolves, the browser no longer considers it a direct
 * user gesture, so the popup gets silently blocked (no window, no error).
 * The fix is the standard one: open a blank tab synchronously, in the same
 * tick as the tap, and only navigate it to the real URL once we have it. */
export async function openDocument(att: ClientAttachment): Promise<void> {
  if (Platform.OS === 'web') {
    const tab = window.open('', '_blank');
    if (!tab) throw new Error('popup_blocked');
    try {
      const url = att.path ? await getDocumentUrl(att.path) : att.url;
      if (!url) { tab.close(); return; }
      tab.location.href = url;
    } catch (e) {
      tab.close();
      throw e;
    }
    return;
  }

  const url = att.path ? await getDocumentUrl(att.path) : att.url;
  if (url) await Linking.openURL(url);
}

/** Remove a stored document. */
export async function deleteClientDocument(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
