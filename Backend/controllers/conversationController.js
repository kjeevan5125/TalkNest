import Conversation from "../models/Conversation.js";
import User from "../models/user.js";

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

export const createGroup = async (req, res) => {
  try {
    const { groupName, participants } = req.body;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({
        message: "Group name is required",
      });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        message: "At least one participant is required",
      });
    }

    const currentUserId = req.user._id.toString();

    const participantIds = participants.map((id) => id.toString());

    if (!participantIds.includes(currentUserId)) {
      participantIds.push(currentUserId);
    }

    const conversation = await Conversation.create({
      participants: participantIds,
      isGroup: true,
      groupName: groupName.trim(),
      groupAdmin: req.user._id,
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error("Create group error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      isGroup: true,
      groupAdmin: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({
        message: "Only the group admin can add members",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (conversation.participants.includes(userId)) {
      return res.status(400).json({
        message: "User is already a member of this group",
      });
    }

    conversation.participants.push(userId);

    await conversation.save();

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Add member error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      isGroup: true,
      groupAdmin: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({
        message: "Only the group admin can remove members",
      });
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "Group admin cannot remove themselves",
      });
    }

    const isMember = conversation.participants.some(
      (participant) => participant.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(400).json({
        message: "User is not a member of this group",
      });
    }

    conversation.participants = conversation.participants.filter(
      (participant) => participant.toString() !== userId.toString()
    );

    await conversation.save();

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Remove member error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      isGroup: true,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Group not found or you are not a member",
      });
    }

    if (
      conversation.groupAdmin.toString() ===
      req.user._id.toString()
    ) {
      return res.status(400).json({
        message: "Group admin cannot leave the group",
      });
    }

    conversation.participants = conversation.participants.filter(
      (participant) =>
        participant.toString() !== req.user._id.toString()
    );

    await conversation.save();

    res.status(200).json({
      message: "You left the group successfully",
      conversation,
    });
  } catch (error) {
    console.error("Leave group error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email isOnline")
      .populate({
        path: "lastMessage",
        select: "sender text isDelivered isRead createdAt",
      })
      .sort({ updatedAt: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};