'use client';

import React from 'react';

interface ApprovalRequestProps {
  message: string;
  approvalId: string;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

export default function ApprovalRequest({ message, approvalId, onApprove, onReject }: ApprovalRequestProps) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {/* Approval message bubble - matches assistant message style */}
      <div className="bg-mathtai-tan/20 border-2 border-mathtai-tan rounded-lg px-4 py-3 max-w-[85%]">
        <p className="text-gray-900 text-sm whitespace-pre-wrap">{message}</p>
      </div>
      
      {/* Approval buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(approvalId)}
          className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors border border-gray-300"
        >
          Approve
        </button>
        <button
          onClick={() => onReject(approvalId)}
          className="bg-mathtai-red text-white px-4 py-2 rounded-lg font-medium hover:bg-mathtai-red/90 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

