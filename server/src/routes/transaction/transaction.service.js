import mongoose from "mongoose";
import Transaction from "../../models/Transaction.js";
import User from "../../models/User.js";

const getUserBalance = async (userId) => {
    const user = await User.findById(userId).select("balance");

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    return user.balance;
};

const sendMoney = async (senderId, recipientEmail, amount) => {
    let session;

    try {
        session = await mongoose.startSession();
        let transaction;

        await session.withTransaction(async () => {
            const recipient = await User.findOne({ email: recipientEmail.trim() }).session(session);

            if (!recipient) {
                const error = new Error("Recipient not found");
                error.status = 404;
                throw error;
            }

            if (recipient._id.equals(senderId)) {
                const error = new Error("You cannot send money to yourself");
                error.status = 400;
                throw error;
            }

            const sender = await User.findOneAndUpdate(
                { _id: senderId, balance: { $gte: amount } },
                { $inc: { balance: -amount } },
                { new: true, session }
            );

            if (!sender) {
                const error = new Error("Insufficient balance");
                error.status = 400;
                throw error;
            }

            await User.updateOne(
                { _id: recipient._id },
                { $inc: { balance: amount } },
                { session }
            );

            [transaction] = await Transaction.create(
                [{ sender: sender._id, recipient: recipient._id, amount }],
                { session }
            );
        });

        return transaction;
    } catch (error) {
        if (error.code === 20 || error.codeName === "IllegalOperation") {
            const topologyError = new Error(
                "Transfers require MongoDB to run as a replica set or sharded cluster. Configure MongoDB and restart the server."
            );
            topologyError.status = 503;
            throw topologyError;
        }

        throw error;
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

const getTransactionHistory = async (userId, limit) => Transaction.find({
    $or: [{ sender: userId }, { recipient: userId }]
})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("sender", "email")
    .populate("recipient", "email");

export { getTransactionHistory, getUserBalance, sendMoney };
