// middleware/auth.js
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).send("Access Denied");

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Includes id, email, role, etc.
    next();
  } catch (err) {
    return res.status(400).send("Invalid Token");
  }
}

module.exports = verifyToken;
