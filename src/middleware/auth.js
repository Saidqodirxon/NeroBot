const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// JWT token yaratish
const generateToken = (admin) => {
  return jwt.sign(
    { id: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// JWT middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token topilmadi' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin topilmadi' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Noto\'g\'ri token' 
    });
  }
};

// Role checking middleware
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Sizda ruxsat yo\'q' 
      });
    }
    next();
  };
};

module.exports = {
  generateToken,
  authMiddleware,
  checkRole
};