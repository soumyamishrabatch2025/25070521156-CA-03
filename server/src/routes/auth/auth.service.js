import User from "../../models/User.js";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const isUniqueUser = async (email) => {

    const user = await User.findOne({ email: email });


    if (!user) {
        return {userExists: false, user};
    }

    return {userExists: true, user};
}

const createUser = async (email, hashPassword) => {


    const newUser = await User.create({email, password: hashPassword});

    return newUser;
}

const createJwtToken = (payload) => {

    const JWT_SECRET = process.env.JWT_SECRET;
    const token = jwt.sign(payload, JWT_SECRET);

    return token;
}

const hash = async (password) => {

    const hashPassword = await bcrypt.hash(password, 10);

    return hashPassword;
}

const hashCompare = async (password, hashPassword) => {
    const isCorrectPassword = await bcrypt.compare(password, hashPassword);


    return isCorrectPassword;
}


export { isUniqueUser, createUser, createJwtToken, hash, hashCompare };