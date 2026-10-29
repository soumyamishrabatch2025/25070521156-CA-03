import express from "express";
import dotenv from "dotenv";
import connectDB from "./lib/connectDB.js";
import authRouter from "./routes/auth/auth.route.js";
import transactionRouter from "./routes/transaction/transaction.route.js";

dotenv.config({
    path: ".env"
});


const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "localhost";


const app = express();
connectDB(process.env.DATABASE_URL);

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionRouter);


app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
