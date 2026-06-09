// backend/middleware/adminMiddleware.js

export const admin = (req, res, next) => {
  // 1. Check if the user object exists (set by your 'protect' middleware)
  if (!req.user) {
    console.log("Admin Middleware: No user found.");
    return res.status(401).json({ message: "Not authorized, no user found." });
  }

  // 2. Check if the user's role is exactly 'admin'
  if (req.user.role === "admin") {
    next(); // Pass control to the controller (deleteDish / updateDish)
  } else {
    console.log(
      `Admin Middleware: Blocked user ${req.user.email}. Role is '${req.user.role}'`,
    );
    return res
      .status(403)
      .json({ message: "Access denied. You must be an admin to do this." });
  }
};
