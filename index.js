const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const serviceAccount = require("./smart-deal-auth-firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// validate token;

const verifyFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.token_email = decoded.email;
    console.log(decoded);
    next();
  } catch {
    return res.status(403).send({ message: "Forbidden access" });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster3.rsapi6v.mongodb.net/?appName=Cluster3`;

// mongodb client

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("smart deals server is running perfectly");
});

async function run() {
  try {
    //connect the client to the mongodb
    await client.connect();
    //   send a ping to confirm a successful connection;

    //create database and collection
    const database = client.db("smartDB");
    const productCollection = database.collection("products");
    const userCollection = database.collection("users");
    const bidsCollection = database.collection("bids");

    //get data from mongodb

    app.get("/products", async (req, res) => {
      const projectField = { title: 1, email: 1 };
      const cursor = productCollection.find().skip(3);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get recent data from mongodb;
    app.get("/recent-products", async (req, res) => {
      const cursor = productCollection.find().sort({ crated_at: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    //get data by specific ID;

    app.get("/product-detail/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // token related API;

    app.post("/getToken", (req, res) => {
      const loggedUser = req.body;
      const token = jwt.sign(loggedUser, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token: token });
    });

    //save data to mongodb

    app.post("/products", verifyFirebaseToken, async (req, res) => {
      // console.log("header in the post ", req.headers);
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    // save users to mongodb;
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "This is user already exist" });
      } else {
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // bid collection
    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });

    app.get("/products/bids/:productId", async (req, res) => {
      const productId = req.params.productId;
      const query = { product: productId };
      const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/bids", verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;

      const query = {};
      if (email) {
        query.buyer_email = email;
        if (email !== req.token_email) {
          return res.status(403).send({ message: "Unauthorized access" });
        }
      }
      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //update data

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updateProduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updateProduct,
      };

      const result = await productCollection.updateOne(query, update);
      res.send(result);
    });

    //delete data from mongodb

    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB"
    );

    app.listen(port, () => {
      console.log(`This is server is running on port ${port}`);
    });
  } finally {
    // await client.close()
  }
}
run().catch(console.dir);
