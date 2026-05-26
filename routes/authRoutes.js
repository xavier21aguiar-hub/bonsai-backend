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
      username: newUser.username,
      leaves: newUser.leaves || 0,
      unlockedAchievements: newUser.unlockedAchievements || [],
      purchasedItems: newUser.purchasedItems || [],
      equippedPot: newUser.equippedPot || "terracota"
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
      username: user.username,
      leaves: user.leaves || 0,
      unlockedAchievements: user.unlockedAchievements || [],
      purchasedItems: user.purchasedItems || [],
      equippedPot: user.equippedPot || "terracota"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

router.post("/update-rewards", async (req, res) => {
  try {
    const { userId, newLeaves, newAchievement } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "userId es requerido" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (newLeaves) {
      user.leaves += newLeaves;
    }

    if (newAchievement && !user.unlockedAchievements.includes(newAchievement)) {
      user.unlockedAchievements.push(newAchievement);
    }

    await user.save();

    res.json({
      leaves: user.leaves,
      unlockedAchievements: user.unlockedAchievements
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar recompensas" });
  }
});

router.post("/purchase", async (req, res) => {
  try {
    const { userId, itemId, itemCost } = req.body;

    if (!userId || !itemId || itemCost === undefined) {
      return res.status(400).json({ error: "userId, itemId y itemCost son requeridos" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (user.purchasedItems.includes(itemId)) {
      return res.status(400).json({ error: "Ya tienes este artículo" });
    }

    if (user.leaves < itemCost) {
      return res.status(400).json({ error: "No tienes suficientes hojas" });
    }

    user.leaves -= itemCost;
    user.purchasedItems.push(itemId);

    await user.save();

    res.json({
      leaves: user.leaves,
      purchasedItems: user.purchasedItems,
      equippedPot: user.equippedPot
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al realizar la compra" });
  }
});

router.post("/equip", async (req, res) => {
  try {
    const { userId, potId } = req.body;

    if (!userId || !potId) {
      return res.status(400).json({ error: "userId y potId son requeridos" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (potId !== "terracota" && !user.purchasedItems.includes(potId)) {
      return res.status(403).json({ error: "No tienes este artículo" });
    }

    user.equippedPot = potId;
    await user.save();

    res.json({ equippedPot: user.equippedPot });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al equipar artículo" });
  }
});

export default router;
