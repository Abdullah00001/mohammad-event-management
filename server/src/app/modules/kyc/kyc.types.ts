export interface DiditWebhookPayload {
  session_id: string;
  status: 'Approved' | 'Declined' | 'Abandoned' | 'In Review';
  vendor_data: string; // user ID
  rejection_reason?: string | null;
  data?: any; // extracted document data
}
