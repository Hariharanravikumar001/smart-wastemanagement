export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'location' | 'link';
  mediaUrl?: string;
  timestamp: Date;
  isAdmin?: boolean;
  isRead?: boolean;
  isDelivered?: boolean;
  isDeletedForEveryone?: boolean;
  deletedFor?: string[];
  opportunityId?: string;
}
