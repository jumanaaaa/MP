const express = require('express');
const router = express.Router();

// ✅ FIX: Make sure to import this correctly
// const { signupUser, loginUser } = require('../controller/userController');
// const { forgotPassword } = require('../controller/userController');
const { signupUser, loginUser, forgotPassword } = require('../controller/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { getAllUsers } = require('../controller/userController');
const { deleteUser } = require('../controller/userController');
const { updateUser } = require('../controller/userController');
const { addCapacity } = require('../controller/capacityController');

router.get('/admin-only-data', protect, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Welcome Admin' });
});
router.get('/member-or-admin-data', protect, authorizeRoles('member', 'admin'), (req, res) => {
  res.json({ message: `Welcome ${req.user.role}` });
});
router.get('/all-users', protect, authorizeRoles('admin'), getAllUsers);
router.delete('/user/:id', protect, authorizeRoles('admin'), deleteUser);
router.put('/user/:id', protect, updateUser);
router.post('/signup', protect, authorizeRoles('admin'), signupUser);

router.post('/add-capacity', protect, addCapacity);
router.post('/signup', signupUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.get('/profile', protect, (req, res) => {
  res.json({
    message: 'You are authorized!',
    user: req.user
  });
});

module.exports = router;
