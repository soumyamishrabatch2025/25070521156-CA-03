import jwt from "jsonwebtoken";

const authenticateUser = async (req, res, next) => {
    const authorization = req.headers.authorization;
    const token = req.headers.authtoken
        ?? (authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined);

    if (!token) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (typeof payload === "string" || !payload.id) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        req.user = { id: payload.id };
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
};

export default authenticateUser;