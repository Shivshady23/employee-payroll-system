const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
}

const User = require("./models/User");

const getSanitizedMongoUri = () =>
  (process.env.MONGO_URI || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

const setupDatabase = async () => {
  try {
    const mongoUri = getSanitizedMongoUri();

    if (!mongoUri) {
      throw new Error("MONGO_URI is missing. Set it in your environment.");
    }

    if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
      throw new Error(
        'Invalid MONGO_URI format. It must start with "mongodb://" or "mongodb+srv://".'
      );
    }

    // Connect to MongoDB
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Connected to MongoDB");

    // Check if test users already exist
    const adminExists = await User.findOne({ email: "admin@example.com" });
    const superadminExists = await User.findOne({ email: "superadmin@example.com" });

    if (adminExists && superadminExists) {
      console.log("✅ Test users already exist - skipping setup");
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("password123", 10);
    console.log("✅ Password hashed");

    // Create admin user if doesn't exist
    if (!adminExists) {
      await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: hashedPassword,
        role: "admin",
        employeeId: null
      });
      console.log("✅ Admin user created");
    }

    // Create superadmin user if doesn't exist
    if (!superadminExists) {
      await User.create({
        name: "Superadmin User",
        email: "superadmin@example.com",
        password: hashedPassword,
        role: "superadmin",
        employeeId: null
      });
      console.log("✅ Superadmin user created");
    }

    console.log("\n🎉 Database setup complete!");
    console.log("\n📝 Test Credentials:");
    console.log("├─ Admin:      admin@example.com / password123");
    console.log("└─ Superadmin: superadmin@example.com / password123");
    console.log("\n✨ Ready to start the application!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Setup error:", error.message);
    process.exit(1);
  }
};

setupDatabase();
