// middleware/auth.js
const jwt = require("jsonwebtoken");

/**
 * verifyToken(allowedRoles)
 * Example usage:
 *   verifyToken() → any authenticated user
 *   verifyToken(["admin"]) → admin only
 *   verifyToken(["admin", "member"]) → both roles
 */
function verifyToken(allowedRoles = []) {
  return function (req, res, next) {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Access Denied: No token provided" });

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      req.user = verified;

      // Optional role check
      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access Denied: Insufficient role" });
      }

      next();
    } catch (err) {
      console.error("JWT Verification Error:", err.message);
      res.status(400).json({ message: "Invalid Token" });
    }
  };
}

module.exports = verifyToken;
