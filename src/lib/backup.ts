import { writeAsStringAsync, cacheDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

// ─── Admin data export / automated backups ───────────────────
// Snapshots are created server-side (weekly cron + this on-demand RPC),
// stored in the RLS-protected `data_backups` table (admin-read-only).
// Exporting writes the JSON payload to a local file and hands it to the
// OS share sheet so the admin can save/email/AirDrop it.

export interface BackupSummary {
  id: string;
  created_at: string;
}

export async function listBackups(): Promise<BackupSummary[]> {
  const { data, error } = await supabase
    .from('data_backups')
    .select('id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as BackupSummary[]) || [];
}

export async function createBackupNow(): Promise<string> {
  const { data, error } = await supabase.rpc('create_data_backup');
  if (error) throw error;
  return data as string;
}

export async function shareBackup(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('data_backups')
    .select('payload, created_at')
    .eq('id', id)
    .single();
  if (error || !data) throw error || new Error('backup_not_found');

  const dateStr = String(data.created_at).slice(0, 10);
  const path = `${cacheDirectory}kine-cabinet-backup-${dateStr}.json`;
  await writeAsStringAsync(path, JSON.stringify(data.payload, null, 2));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('sharing_unavailable');
  await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Kine Cabinet — backup' });
}
