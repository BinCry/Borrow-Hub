import { apiClient } from '../api/client';
import { User } from '../../types/domain';

export type DisputeStatus =
  | 'OPEN'
  | 'WAITING_RESPONSE'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CLOSED';

export type DisputeReason = 'RETURN_ISSUE' | 'LOST_ASSET' | string;

export type Dispute = {
  id: string;
  rentalId: string;
  openedById: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  resolutionSummary?: string | null;
  openedBy: User;
  rental: {
    ownerId: string;
    renterId: string;
    asset?: { title?: string };
  };
  events: {
    id: string;
    eventType: string;
    content: string;
    createdAt: string;
    actor?: User | null;
  }[];
};

export type RespondDisputePayload = {
  content: string;
  evidenceIds?: string[];
};

export const DisputesService = {
  async listMine(status?: DisputeStatus): Promise<Dispute[]> {
    const response = await apiClient.get<Dispute[]>('/disputes/my', {
      params: status ? { status, role: 'participant' } : { role: 'participant' },
    });
    return response.data;
  },

  async getById(id: string): Promise<Dispute> {
    const response = await apiClient.get<Dispute>(`/disputes/${id}`);
    return response.data;
  },

  async respond(id: string, payload: RespondDisputePayload): Promise<Dispute> {
    const response = await apiClient.post<Dispute>(`/disputes/${id}/respond`, payload);
    return response.data;
  },

  async acceptDamageReport(id: string, note?: string): Promise<Dispute> {
    const response = await apiClient.post<Dispute>(
      `/disputes/${id}/accept-damage-report`,
      note?.trim() ? { note: note.trim() } : {},
    );
    return response.data;
  },
};
