/**
 * In-memory store for approval responses
 * In production, consider using Redis or a database
 */

interface ApprovalData {
  approved: boolean;
  timestamp: number;
}

const approvalStore = new Map<string, ApprovalData>();

/**
 * Store an approval response
 */
export function storeApproval(approvalId: string, approved: boolean): void {
  approvalStore.set(approvalId, {
    approved,
    timestamp: Date.now()
  });
  
  // Clean up old approvals (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, data] of approvalStore.entries()) {
    if (data.timestamp < oneHourAgo) {
      approvalStore.delete(id);
    }
  }
}

/**
 * Check approval status
 * Returns null if approval not found or expired
 */
export function checkApproval(approvalId: string): boolean | null {
  const approval = approvalStore.get(approvalId);
  if (!approval) return null;
  return approval.approved;
}

/**
 * Remove an approval from the store (after it's been used)
 */
export function removeApproval(approvalId: string): void {
  approvalStore.delete(approvalId);
}

