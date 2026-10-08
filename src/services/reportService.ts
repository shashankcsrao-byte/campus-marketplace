import { supabase } from '../lib/supabase';
import type { ReportReason } from '../types';

/** Whether the current user has already reported this listing. */
export async function hasReported(listingId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Files a report. Reporting the same listing twice counts as success. */
export async function reportListing(listingId: string, reason: ReportReason, details: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .insert({ listing_id: listingId, reason, details: details.trim() || null });
  if (error && error.code !== '23505') throw error;
}
