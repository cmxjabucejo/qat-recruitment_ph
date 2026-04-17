// const jwt = require("jsonwebtoken");

// const authToken = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];

//   if (!token) return res.status(401).json({ message: "Token is required" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // Attach decoded token data to `req.user`
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Invalid token" });
//   }
// };

// module.exports = authToken;

const jwt = require("jsonwebtoken");

const authToken = (req, res, next) => {
  // Let CORS preflight through
  if (req.method === "OPTIONS") return next();

  // Accept "Authorization: Bearer <token>" OR just "<token>"
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;

  if (!token) {
    res.set("WWW-Authenticate", 'Bearer realm="api"');
    return res.status(401).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // e.g. { userid, role, pwdType, iat, exp }
    return next();
  } catch (err) {
    res.set("WWW-Authenticate", 'Bearer error="invalid_token"');
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authToken;
