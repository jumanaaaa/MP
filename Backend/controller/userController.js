const User = require('../models/user');
const bcrypt = require('bcryptjs');
// @desc    Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a user
exports.createUser = async (req, res) => {
  const { name, email } = req.body;
  try {
    const newUser = await User.create({ name, email });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
const user = require('../models/user');

exports.signupUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
// exports.loginUser = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Check if user exists
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ error: 'Invalid email or password' });
//     }

//     // Compare passwords
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ error: 'Invalid email or password' });
//     }

//     // ✅ Login successful — return user role
//     res.status(200).json({
//       message: 'Login successful',
//       role: user.role,
//       name: user.firstName + ' ' + user.lastName
//     });

//   } catch (err) {
//     res.status(500).json({ error: 'Server error' });
//   }
// };

const jwt = require('jsonwebtoken');

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 🔍 1. Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // 🔐 2. Compare entered password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // 🔏 3. Sign JWT token with user's ID and role
    const token = jwt.sign(
      { id: user._id, role: user.role },  // Payload
      process.env.JWT_SECRET,            // Secret key
      { expiresIn: process.env.JWT_EXPIRES_IN } // Expiry time
    );

    // ✅ 4. Send response with token and user details
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        email: user.email
      }
    });

  } catch (err) {
    console.error("JWT Login Error:", err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: "Password reset link sent (if user exists)" });
    }

    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString("hex");

    console.log(`Reset token for ${email}: ${resetToken}`);

    res.status(200).json({
      message: "Password reset link sent",
      resetToken
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Admin: View all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
};
// ✅ Admin: Delete user by ID
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
// ✅ Admin or Member: Update profile (self or others)
exports.updateUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // Members can only update themselves
    if (req.user.role === 'member' && req.user._id !== targetUserId) {
      return res.status(403).json({ error: 'Members can only update their own profile' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User updated', user: updatedUser });

  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};



