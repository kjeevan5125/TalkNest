import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/user.js";
import { setSocketServer } from "../config/socketServer.js";

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  setSocketServer(io);

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth.token;

      if (!token) {
        return next(
          new Error(
            "Authentication required"
          )
        );
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      socket.userId =
        decoded.userId;

      next();
    } catch (error) {
      next(
        new Error(
          "Invalid or expired token"
        )
      );
    }
  });

  const onlineUsers = new Map();

  io.on(
    "connection",
    async (socket) => {
      console.log(
        "User connected:",
        socket.id
      );

      console.log(
        "User ID:",
        socket.userId
      );

      socket.join(
        String(socket.userId)
      );

      const userId =
        String(socket.userId);

      const currentConnections =
        onlineUsers.get(userId) || 0;

      onlineUsers.set(
        userId,
        currentConnections + 1
      );

      if (currentConnections === 0) {
        await User.findByIdAndUpdate(
          socket.userId,
          {
            isOnline: true,
          }
        );

        io.emit("userOnline", {
          userId,
        });
      }

      socket.on(
        "joinConversation",
        async (conversationId) => {
          try {
            const conversation =
              await Conversation.findOne({
                _id: conversationId,
                participants:
                  socket.userId,
              });

            if (!conversation) {
              return;
            }

            socket.join(
              String(conversationId)
            );
          } catch (error) {
            console.error(
              "Join conversation error:",
              error.message
            );
          }
        }
      );

      socket.on(
        "sendMessage",
        async (
          { conversationId, text },
          callback
        ) => {
          try {
            const trimmedText = text?.trim();

            if (!conversationId || !trimmedText) {
              if (callback) {
                callback({
                  success: false,
                  message: "A message cannot be empty",
                });
              }

              return;
            }

            const conversation =
              await Conversation.findOne({
                _id: conversationId,
                participants:
                  socket.userId,
              });

            if (!conversation) {
              if (callback) {
                callback({
                  success: false,
                  message:
                    "You are not a participant of this conversation",
                });
              }

              return;
            }

            const message =
              await Message.create({
                conversation:
                  conversationId,
                sender:
                  socket.userId,
                text: trimmedText,
              });

            const populatedMessage =
              await Message.findById(
                message._id
              ).populate(
                "sender",
                "name email"
              );

            await Conversation.findByIdAndUpdate(
              conversationId,
              {
                lastMessage:
                  message._id,
              }
            );

            conversation.participants.forEach(
              (participantId) => {
                io.to(String(participantId)).emit(
                  "newMessage",
                  populatedMessage
                );
              }
            );

            if (callback) {
              callback({
                success: true,
                message:
                  populatedMessage,
              });
            }
          } catch (error) {
            console.error(
              "Socket message error:",
              error.message
            );

            if (callback) {
              callback({
                success: false,
                message:
                  "Failed to send message",
              });
            }
          }
        }
      );

      socket.on(
        "messageDelivered",
        async (messageId) => {
          try {
            const message =
              await Message.findById(
                messageId
              );

            if (!message) {
              return;
            }

            const conversation =
              await Conversation.findOne({
                _id: message.conversation,
                participants:
                  socket.userId,
              });

            if (!conversation) {
              return;
            }

            if (
              String(message.sender) ===
              String(socket.userId)
            ) {
              return;
            }

            await Message.findByIdAndUpdate(
              messageId,
              {
                $addToSet: {
                  deliveredTo: socket.userId,
                },
              }
            );

            io.to(
              String(message.sender)
            ).emit(
              "messageDelivered",
              {
                messageId:
                  message._id,
                userId: socket.userId,
              }
            );
          } catch (error) {
            console.error(
              "Message delivery error:",
              error.message
            );
          }
        }
      );

      socket.on(
        "markAsRead",
        async (conversationId) => {
          try {
            const conversation =
              await Conversation.findOne({
                _id: conversationId,
                participants:
                  socket.userId,
              });

            if (!conversation) {
              return;
            }

            const messages =
              await Message.find({
                conversation:
                  conversationId,
                sender: {
                  $ne: socket.userId,
                },
                readBy: {
                  $ne: socket.userId,
                },
              }).select(
                "_id sender"
              );

            if (!messages.length) {
              return;
            }

            await Message.updateMany(
              {
                conversation:
                  conversationId,
                sender: {
                  $ne: socket.userId,
                },
                readBy: {
                  $ne: socket.userId,
                },
              },
              {
                $addToSet: {
                  readBy: socket.userId,
                },
              }
            );

            const senderIds = [
              ...new Set(
                messages.map(
                  (message) =>
                    String(
                      message.sender
                    )
                )
              ),
            ];

            senderIds.forEach(
              (senderId) => {
                io.to(senderId).emit(
                  "messagesRead",
                  {
                    conversationId,
                    messageIds:
                      messages.map(
                        (message) =>
                          message._id
                      ),
                    userId: socket.userId,
                  }
                );
              }
            );
          } catch (error) {
            console.error(
              "Mark as read error:",
              error.message
            );
          }
        }
      );

      socket.on(
        "groupCreated",
        async (conversationId) => {
          try {
            const conversation =
              await Conversation.findOne({
                _id: conversationId,
                isGroup: true,
                participants:
                  socket.userId,
              })
                .populate(
                  "participants",
                  "name email isOnline"
                )
                .populate(
                  "groupAdmin",
                  "name email"
                );

            if (!conversation) {
              return;
            }

            conversation.participants.forEach(
              (participant) => {
                io.to(
                  String(
                    participant._id
                  )
                ).emit(
                  "newConversation",
                  conversation
                );
              }
            );
          } catch (error) {
            console.error(
              "Group created error:",
              error.message
            );
          }
        }
      );

      socket.on(
        "groupUpdated",
        async (conversationId) => {
          try {
            const conversation =
              await Conversation.findOne({
                _id: conversationId,
                isGroup: true,
              });

            if (!conversation) {
              return;
            }

            const isAdmin =
              String(
                conversation.groupAdmin
              ) ===
              String(socket.userId);

            const isParticipant =
              conversation.participants.some(
                (participant) =>
                  String(participant) ===
                  String(socket.userId)
              );

            if (
              !isAdmin &&
              !isParticipant
            ) {
              return;
            }

            const participantIds =
              conversation.participants.map(
                (participant) =>
                  String(participant)
              );

            const updatedConversation =
              await Conversation.findById(
                conversationId
              )
                .populate(
                  "participants",
                  "name email isOnline"
                )
                .populate(
                  "groupAdmin",
                  "name email"
                );

            const recipients = [
              ...new Set([
                ...participantIds,
                String(socket.userId),
              ]),
            ];

            recipients.forEach(
              (recipientId) => {
                io.to(
                  recipientId
                ).emit(
                  "groupUpdated",
                  updatedConversation
                );
              }
            );
          } catch (error) {
            console.error(
              "Group update error:",
              error.message
            );
          }
        }
      );

      socket.on(
        "typing",
        (conversationId) => {
          socket
            .to(
              String(conversationId)
            )
            .emit(
              "userTyping",
              {
                userId:
                  socket.userId,
                conversationId,
              }
            );
        }
      );

      socket.on(
        "stopTyping",
        (conversationId) => {
          socket
            .to(
              String(conversationId)
            )
            .emit(
              "userStoppedTyping",
              {
                userId:
                  socket.userId,
                conversationId,
              }
            );
        }
      );

      socket.on(
        "disconnect",
        async () => {
          const userId =
            String(socket.userId);

          const currentConnections =
            onlineUsers.get(
              userId
            ) || 0;

          if (
            currentConnections <= 1
          ) {
            onlineUsers.delete(
              userId
            );

            await User.findByIdAndUpdate(
              socket.userId,
              {
                isOnline: false,
              }
            );

            io.emit(
              "userOffline",
              {
                userId,
              }
            );
          } else {
            onlineUsers.set(
              userId,
              currentConnections - 1
            );
          }
        }
      );
    }
  );

  return io;
};

export default initializeSocket;
