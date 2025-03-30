const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

const url = "mongodb://localhost:27017";
const dbName = "produits_service";
let db;

async function connectDB() {
  try {
    const client = await MongoClient.connect(url);
    db = client.db(dbName);
    const PORT = 4002;
    app.listen(PORT, () => {
      console.log(`Serveur en ligne : http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Erreur de connexion à MongoDB :", err);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/livraisons", async (req, res) => {
  if (!db) return res.status(500).send("Base de données non initialisée");
  try {
    const livraisons = await db.collection("livraisons").find({}).toArray();
    res.status(200).json(livraisons);
  } catch (err) {
    res.status(500).send("Erreur serveur");
  }
});

app.get("/livraison/:id", async (req, res) => {
  const { id } = req.params;
  if (!db) return res.status(500).send("Base de données non initialisée");
  try {
    const livraison = await db.collection("livraisons").findOne({ id_livraison: id });
    if (!livraison) return res.status(404).json({ message: "Livraison non trouvée" });
    res.status(200).json(livraison);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/livraison/ajouter", async (req, res) => {
  const { id_commande, transporteur } = req.body;
  if (!id_commande || !transporteur) return res.status(400).json({ message: "Données manquantes" });
  if (!db) return res.status(500).send("Base de données non initialisée");
  try {
    const newLivraison = {
      id_livraison: `LIV00${Math.floor(Math.random() * 1000)}`,
      id_commande,
      transporteur,
      statut: "expédié",
      date_expedition: new Date().toISOString(),
      date_livraison: null,
    };
    await db.collection("livraisons").insertOne(newLivraison);
    res.status(201).json({ message: "Livraison ajoutée avec succès", livraison: newLivraison });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.put("/livraison/:id", async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;
  if (!db) return res.status(500).send("Base de données non initialisée");
  if (!statut) return res.status(400).json({ message: "Le statut est requis" });
  const statutsValides = ["expédié", "en transit", "livré", "annulé"];
  if (!statutsValides.includes(statut)) return res.status(400).json({ message: "Statut invalide" });
  try {
    const updateData = {
      statut,
      ...(statut === "livré" && { date_livraison: new Date().toISOString() }),
    };
    const result = await db.collection("livraisons").updateOne({ id_livraison: id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ message: "Livraison non trouvée" });
    res.status(200).json({ message: "Statut mis à jour", statut });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

connectDB();