export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next(); // They are admin, let them pass
  } else {
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};
