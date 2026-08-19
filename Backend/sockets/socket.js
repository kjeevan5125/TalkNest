import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/user.js";

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      socket.userId = decoded.userId;

      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  const onlineUsers = new Map();

  io.on("connection",async (socket) => {
    console.log("User connected:", socket.id);
    console.log("User ID:", socket.userId);
    socket.join(String(socket.userId));

    const userId = String(socket.userId);

    const currentConnections = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, currentConnections + 1);

    if (currentConnections === 0) {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
      });

      io.emit("userOnline", {
        userId,
      });
    }

    socket.on("joinConversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          console.log(
            `User ${socket.userId} is not a participant of ${conversationId}`
          );

          return;
        }

        socket.join(String(conversationId));

        console.log(
          `Socket ${socket.id} joined conversation ${conversationId}`
        );
      } catch (error) {
        console.error(
          "Join conversation error:",
          error.message
        );
      }
    });

    socket.on("sendMessage", async ({ conversationId, text }, callback) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          if (callback) {
            callback({
              success: false,
              message: "You are not a participant of this conversation",
            });
          }

          return;
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          text,
        });

        const populatedMessage = await Message.findById(
          message._id
        ).populate("sender", "name email");

        io.to(String(conversationId)).emit(
          "newMessage",
          populatedMessage
        );

        if (callback) {
          callback({
            success: true,
            message: populatedMessage,
          });
        }

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
        });

        console.log("Message sent:", message._id);
      } catch (error) {
        console.error(
          "Socket message error:",
          error.message
        );

        if (callback) {
          callback({
            success: false,
            message: "Failed to send message",
          });
        }
      }
    });

    socket.on("messageDelivered", async (messageId) => {
      try {
        const message = await Message.findById(messageId);

        if (!message) {
          console.log(`Message ${messageId} not found`);
          return;
        }

        const conversation = await Conversation.findOne({
          _id: message.conversation,
          participants: socket.userId,
        });

        if (!conversation) {
          console.log(
            `User ${socket.userId} is not a participant of this conversation`
          );

          return;
        }

        await Message.findByIdAndUpdate(messageId, {
          isDelivered: true,
        });

        io.to(String(message.sender)).emit("messageDelivered", {
          messageId: message._id,
        });

        console.log("Message delivered:", messageId);
      } catch (error) {
        console.error(
          "Message delivery error:",
          error.message
        );
      }
    });

    socket.on("markAsRead", async (conversationId) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          console.log(
            `User ${socket.userId} is not a participant of ${conversationId}`
          );

          return;
        }

        const result = await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: socket.userId },
            isRead: false,
          },
          {
            $set: {
              isRead: true,
            },
          }
        );

        console.log(
          `Messages marked as read: ${result.modifiedCount}`
        );
      } catch (error) {
        console.error(
          "Mark as read error:",
          error.message
        );
      }
    });

    socket.on("typing", (conversationId) => {
      socket.to(String(conversationId)).emit("userTyping", {
        userId: socket.userId,
      });
    });

    socket.on("stopTyping", (conversationId) => {
      socket.to(String(conversationId)).emit("userStoppedTyping", {
        userId: socket.userId,
      });
    });

    socket.on("disconnect", async() => {
      console.log("User disconnected:", socket.id);

      const userId = String(socket.userId);
      const currentConnections = onlineUsers.get(userId) || 0;

      if (currentConnections <= 1) {
        onlineUsers.delete(userId);

        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
        });

        io.emit("userOffline", {
          userId,
        });
      } else {
        onlineUsers.set(userId, currentConnections - 1);
      }
    });
  });

  return io;
};

export default initializeSocket;