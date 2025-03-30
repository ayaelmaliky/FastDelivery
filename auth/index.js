const express = require("express");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
app.use(express.json());

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017";
const dbName = "produits_service";
const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_super_securise";
let db;

// Connexion à la base de données
async function connectDB() {
  try {
    const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log("Connexion réussie avec Mongo");
    db = client.db(dbName);

    const PORT = process.env.PORT || 4002;
    app.listen(PORT, () => console.log(`Serveur en ligne : http://localhost:${PORT}`));
  } catch (err) {
    console.error("Impossible de se connecter à la base de données :", err);
    process.exit(1);
  }
}

// Middleware pour vérifier le token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Authentification requise, token absent" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Échec de l'authentification, token invalide" });
  }
};

// Route d'accueil
app.get("/", (req, res) => res.send("Hi"));

// Inscription d'un utilisateur
app.post("/auth/register", async (req, res) => {
  const { email, password, nom } = req.body;
  if (!email || !password || !nom) return res.status(400).json({ message: "Veuillez remplir tous les champs obligatoires" });

  try {
    const userExists = await db.collection("users").findOne({ email });
    if (userExists) return res.status(400).json({ message: "L'email renseigné est déjà utilisé" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashedPassword, nom, date_creation: new Date() };
    await db.collection("users").insertOne(newUser);

    res.status(201).json({ message: "Compte créé avec succès", user: { email, nom } });
  } catch (err) {
    console.error("Erreur lors de l'inscription :", err);
    res.status(500).json({ message: "Une erreur interne est survenue" });
  }
});

// Connexion d'un utilisateur
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Veuillez fournir un email et un mot de passe" });

  try {
    const user = await db.collection("users").findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }
    
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "24h" });
    res.status(200).json({ message: "Connexion réussie", token, user: { email: user.email, nom: user.nom } });
  } catch (err) {
    console.error("Erreur lors de la connexion :", err);
    res.status(500).json({ message: "Une erreur interne est survenue" });
  }
});

// Récupération du profil utilisateur
app.get("/auth/profil", verifyToken, async (req, res) => {
  try {
    const user = await db.collection("users").findOne({ _id: req.user.userId }, { projection: { password: 0 } });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.status(200).json(user);
  } catch (err) {
    console.error("Erreur lors de la récupération du profil :", err);
    res.status(500).json({ message: "Une erreur interne est survenue" });
  }
});

// Connexion à la base de données
connectDB();
