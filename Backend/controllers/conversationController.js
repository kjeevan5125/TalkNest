import Conversation from "../models/Conversation.js";

export const createOrGetConversation = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const currentUserId = req.user._id;

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: {
        $all: [currentUserId, userId],
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, userId],
      });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Conversation error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};