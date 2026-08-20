import Conversation from "../models/Conversation.js";
import User from "../models/user.js";
import { getSocketServer } from "../config/socketServer.js";

const populateConversation = (conversationId) =>
  Conversation.findById(conversationId)
    .populate("participants", "name email isOnline")
    .populate("groupAdmin", "name email");

const publishGroupUpdate = (conversation, recipientIds) => {
  const io = getSocketServer();

  if (!io) return;

  [...new Set(recipientIds.map(String))].forEach((userId) => {
    io.to(userId).emit("groupUpdated", conversation);
  });
};

export const createOrGetConversation = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const currentUserId = req.user._id;

    if (String(userId) === String(currentUserId)) {
      return res.status(400).json({
        message: "You cannot create a conversation with yourself",
      });
    }

    const otherUser = await User.findById(userId).select("_id");

    if (!otherUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

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

    conversation = await Conversation.findById(
      conversation._id
    ).populate(
      "participants",
      "name email isOnline"
    );

    res.status(200).json(conversation);
  } catch (error) {
    console.error(
      "Conversation error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { groupName, participants } =
      req.body;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({
        message: "Group name is required",
      });
    }

    if (
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return res.status(400).json({
        message:
          "At least one participant is required",
      });
    }

    const currentUserId =
      req.user._id.toString();

    const participantIds =
      participants.map((id) =>
        id.toString()
      );

    if (
      !participantIds.includes(
        currentUserId
      )
    ) {
      participantIds.push(
        currentUserId
      );
    }

    const conversation =
      await Conversation.create({
        participants: participantIds,
        isGroup: true,
        groupName: groupName.trim(),
        groupAdmin: req.user._id,
      });

    const populatedConversation = await populateConversation(conversation._id);

    const io = getSocketServer();
    if (io) {
      populatedConversation.participants.forEach((participant) => {
        io.to(String(participant._id)).emit("newConversation", populatedConversation);
      });
    }

    res.status(201).json(
      populatedConversation
    );
  } catch (error) {
    console.error(
      "Create group error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const { conversationId } =
      req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        isGroup: true,
        groupAdmin: req.user._id,
      });

    if (!conversation) {
      return res.status(403).json({
        message:
          "Only the group admin can add members",
      });
    }

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const alreadyMember =
      conversation.participants.some(
        (participant) =>
          String(participant) ===
          String(userId)
      );

    if (alreadyMember) {
      return res.status(400).json({
        message:
          "User is already a member of this group",
      });
    }

    conversation.participants.push(
      userId
    );

    await conversation.save();

    const updatedConversation = await populateConversation(conversationId);
    publishGroupUpdate(updatedConversation, updatedConversation.participants.map((participant) => participant._id));

    res.status(200).json(
      updatedConversation
    );
  } catch (error) {
    console.error(
      "Add member error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const removeMember = async (
  req,
  res
) => {
  try {
    const { userId } = req.body;
    const { conversationId } =
      req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        isGroup: true,
        groupAdmin: req.user._id,
      });

    if (!conversation) {
      return res.status(403).json({
        message:
          "Only the group admin can remove members",
      });
    }

    if (
      String(userId) ===
      String(req.user._id)
    ) {
      return res.status(400).json({
        message:
          "Group admin cannot remove themselves",
      });
    }

    const isMember =
      conversation.participants.some(
        (participant) =>
          String(participant) ===
          String(userId)
      );

    if (!isMember) {
      return res.status(400).json({
        message:
          "User is not a member of this group",
      });
    }

    const removedMemberId = String(userId);

    conversation.participants =
      conversation.participants.filter(
        (participant) =>
          String(participant) !==
          String(userId)
      );

    await conversation.save();

    const updatedConversation = await populateConversation(conversationId);
    publishGroupUpdate(updatedConversation, [
      ...updatedConversation.participants.map((participant) => participant._id),
      removedMemberId,
    ]);

    res.status(200).json(
      updatedConversation
    );
  } catch (error) {
    console.error(
      "Remove member error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const leaveGroup = async (
  req,
  res
) => {
  try {
    const { conversationId } =
      req.params;

    const conversation =
      await Conversation.findOne({
        _id: conversationId,
        isGroup: true,
        participants: req.user._id,
      });

    if (!conversation) {
      return res.status(404).json({
        message:
          "Group not found or you are not a member",
      });
    }

    if (
      String(conversation.groupAdmin) ===
      String(req.user._id)
    ) {
      return res.status(400).json({
        message:
          "Group admin cannot leave the group",
      });
    }

    const leavingMemberId = String(req.user._id);

    conversation.participants =
      conversation.participants.filter(
        (participant) =>
          String(participant) !==
          String(req.user._id)
      );

    await conversation.save();

    const updatedConversation = await populateConversation(conversationId);
    publishGroupUpdate(updatedConversation, [
      ...updatedConversation.participants.map((participant) => participant._id),
      leavingMemberId,
    ]);

    res.status(200).json({
      message: "You left the group successfully",
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error("Leave group error:", error.message);
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const changeGroupAdmin = async (req, res) => {
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
        message: "Only the group admin can assign a new admin",
      });
    }

    const isMember = conversation.participants.some(
      (participant) => String(participant) === String(userId)
    );

    if (!isMember) {
      return res.status(400).json({
        message: "User must be a member of the group to become admin",
      });
    }

    conversation.groupAdmin = userId;
    await conversation.save();

    const updatedConversation = await populateConversation(conversationId);
    publishGroupUpdate(
      updatedConversation,
      updatedConversation.participants.map((participant) => participant._id)
    );

    res.status(200).json(updatedConversation);
  } catch (error) {
    console.error("Change group admin error:", error.message);
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
      .populate("groupAdmin", "name email")
      .populate({
        path: "lastMessage",
        select: "sender text isDelivered isRead createdAt",
      })
      .sort({
        updatedAt: -1,
      });

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error.message);
    res.status(500).json({
      message: "Server error",
    });
  }
};
