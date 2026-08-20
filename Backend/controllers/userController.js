import User from "../models/user.js";

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
    }).select("name email isOnline");

    res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};