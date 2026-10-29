import { isUniqueUser, createUser, createJwtToken, hashCompare, hash } from "./auth.service.js";

const register = async (req, res) => {

    try {

        let { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and Password are required" });
        }

        let { userExists, user } = await isUniqueUser(email);

        if (userExists) {
            return res.status(400).json({ success: false, error: "User already exists" })
        }

        const hashPassword = await hash(password);

        const newUser = await createUser(email, hashPassword);

        const token = createJwtToken({ id: newUser._id, email: newUser.email });

        return res.status(201).json({ success: true, message: "User registered successfully", token });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}

const login = async (req, res) => {

    try {

        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and Password are required" })
        }

        const { userExists, user } = await isUniqueUser(email);
        if (!userExists) {
            return res.json({ success: false, error: "User does not exist" });
        }

        const isCorrectPassword = await hashCompare(password, user.password);

        if (!isCorrectPassword) {
            return res.status(401).json({ success: false, error: "Invalid Credentials" })
        }

        const token = createJwtToken({ id: user._id, email: user.email });

        return res.status(201).json({ success: true, msg: "User Logged In", token });

    } catch (error) {
        return res.status(500).json({ success: false, error: "Internal Server Error" })
    }
}

export { register, login };