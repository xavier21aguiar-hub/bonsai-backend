import express from "express";
import crypto from "crypto";
import { User } from "../models/user.js";

const router = express.Router();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    const newUser = new User({
      username,
      password: hashPassword(password)
    });

    await newUser.save();

    res.json({
      _id: newUser._id,
      username: newUser.username
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(400).json({ error: "Contraseña incorrecta" });
    }

    res.json({
      _id: user._id,
      username: user.username
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

export default router;
