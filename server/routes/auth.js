import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/index.js";

const router = Router();

const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number.");
  }
  return errors;
};

router.post("/register", async (req, res) => {
  console.log("Received registration request with body:", req.body);
  const { username, password } = req.body;
  if (!username || !password) {
    console.log("Registration failed: Username or password missing.");
    return res.status(400).json({ message: "Username and password required" });
  }

  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    console.log(`Registration failed for user ${username}:`, passwordErrors);
    return res.status(400).json({
      message: "Password does not meet requirements.",
      errors: passwordErrors,
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { username, password: hashedPassword },
    });
    console.log(`User ${username} created successfully with ID: ${user.id}`);
    res
      .status(201)
      .json({ message: "User created successfully", userId: user.id });
  } catch (error) {
    // P2002 is the Prisma code for a unique constraint violation
    if (error.code === "P2002") {
      console.log(`Registration failed: Username ${username} already exists.`);
      return res.status(409).json({ message: "Username already exists" });
    }
    console.error("Server error during registration:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  console.log("Received login request for username:", req.body.username);
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.log(`Login failed: User ${username} not found.`);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    console.log(`Login failed: Invalid password for user ${username}.`);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Create and sign a JWT
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  console.log(`User ${username} logged in successfully.`);
  res.json({ token, userId: user.id, username: user.username });
});

export default router;
