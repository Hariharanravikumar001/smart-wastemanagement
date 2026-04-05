import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: Server;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: '*', // In production, replace with specific origins
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    // Join a room based on user ID for private messaging
    socket.on('join', async (userId: string) => {
      if (userId) {
        socket.join(userId);
        (socket as any).userId = userId;
        console.log(`User ${userId} joined their private room`);

        // Update online status in DB
        try {
          const User = (await import('../models/User')).default;
          await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() });
          
          // Broadcast status to everyone
          io.emit('user_status', { userId, isOnline: true });
        } catch (err) {
          console.error('Error updating user online status:', err);
        }
      }
    });

    // Handle delivery acknowledgment
    socket.on('delivery_ack', async (data: { messageId: string, senderId: string }) => {
      try {
        const Message = (await import('../models/Message')).default;
        await Message.findByIdAndUpdate(data.messageId, { isDelivered: true });
        
        // Notify the sender that the message was delivered
        io.to(data.senderId).emit('message_delivered', { messageId: data.messageId });
        console.log(`✅ Delivery acknowledged for message ${data.messageId}`);
      } catch (err) {
        console.error('Error handling delivery acknowledgment:', err);
      }
    });

    // Handle message deletion
    socket.on('delete_message', async (data: { messageId: string, type: 'me' | 'everyone', userId: string }) => {
      try {
        const Message = (await import('../models/Message')).default;
        const message = await Message.findById(data.messageId);
        
        if (!message) return;

        if (data.type === 'everyone') {
          // Deleting for everyone: mark flag and clear content for privacy
          message.isDeletedForEveryone = true;
          message.content = 'This message was deleted';
          message.mediaUrl = undefined;
          await message.save();
          
          // Notify both parties (sender and receiver)
          io.to(message.sender_id.toString()).emit('message_update', message);
          io.to(message.receiver_id.toString()).emit('message_update', message);
          console.log(`🗑️ Message ${data.messageId} deleted for everyone`);
        } else {
          // Deleting for me: add to deletedFor array
          if (!message.deletedFor.includes(data.userId as any)) {
            message.deletedFor.push(data.userId as any);
            await message.save();
          }
          // Notify the user who deleted it (to update their local UI if needed)
          io.to(data.userId).emit('message_update', message);
          console.log(`🗑️ Message ${data.messageId} deleted for user ${data.userId}`);
        }
      } catch (err) {
        console.error('Error handling message deletion:', err);
      }
    });

    socket.on('disconnect', async () => {
      const userId = (socket as any).userId;
      console.log('Client disconnected:', socket.id, userId || '');
      
      if (userId) {
        try {
          const User = (await import('../models/User')).default;
          await User.findByIdAndUpdate(userId, { isOnline: false, lastActive: new Date() });
          
          // Broadcast status to everyone
          io.emit('user_status', { userId, isOnline: false, lastActive: new Date() });
        } catch (err) {
          console.error('Error updating user offline status:', err);
        }
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: any): void => {
  if (io) {
    io.to(userId).emit(event, data);
    console.log(`Emitted ${event} to user ${userId}`);
  }
};
