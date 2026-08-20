import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;

    const trimmedText = text?.trim();

    if (!conversationId || !trimmedText) {
      return res.status(400).json({
        message: "Conversation ID and message text are required",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({
        message: "You are not a participant of this conversation",
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text: trimmedText,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name email"
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send message error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({
        message: "You are not a participant of this conversation",
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get messages error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};
