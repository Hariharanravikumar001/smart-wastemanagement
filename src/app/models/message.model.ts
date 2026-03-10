export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isAdmin: boolean;
  isRead?: boolean;
}
