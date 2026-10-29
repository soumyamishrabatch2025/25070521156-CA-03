import { getUserBalance, getTransactionHistory, sendMoney } from "./transaction.service.js";

const getBalance = async (req, res) => {
    try {
        const balance = await getUserBalance(req.user.id);
        return res.status(200).json({ success: true, balance });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }

        return res.status(500).json({ success: false, error: "Unable to retrieve balance" });
    }
};

const send = async (req, res) => {
    const { recipientEmail, amount } = req.body ?? {};

    if (typeof recipientEmail !== "string" || !recipientEmail.trim()) {
        return res.status(400).json({ success: false, error: "Recipient email is required" });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: "Amount must be a positive number" });
    }

    if (amount !== Number(amount.toFixed(2))) {
        return res.status(400).json({ success: false, error: "Amount can have at most two decimal places" });
    }

    try {
        const transaction = await sendMoney(req.user.id, recipientEmail, amount);
        return res.status(201).json({
            success: true,
            message: "Transfer completed",
            transaction
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }

        console.error("Unable to complete transfer:", error);
        return res.status(500).json({ success: false, error: "Unable to complete transfer" });
    }
};

const getHistory = async (req, res) => {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isNaN(parsedLimit) ? 20 : Math.min(Math.max(parsedLimit, 1), 100);

    try {
        const transactions = await getTransactionHistory(req.user.id, limit);
        return res.status(200).json({ success: true, transactions });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Unable to retrieve transaction history" });
    }
};

export { getBalance, getHistory, send };
