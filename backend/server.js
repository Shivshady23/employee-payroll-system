const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();




const app = express(); // 👈 FIRST CREATE APP

/* ===== MIDDLEWARE ===== */
app.use(cors());
app.use(express.json());

/* ===== ROUTES ===== */
const employeeRoutes = require("./routes/employeeRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/api/employees", employeeRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/auth", authRoutes);

// Health check for Vercel/monitoring.
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* ===== DB ===== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected 😎"))
  .catch(err => console.error(err));

/* ===== SERVER ===== */
// Vercel provides the server; exporting the app creates a serverless function.
module.exports = app;

// Allow local development without Vercel.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
