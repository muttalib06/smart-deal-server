const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://smartDealUser:AjT7cGnuPa9PfE2e@cluster3.rsapi6v.mongodb.net/?appName=Cluster3";

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

    //get data from mongodb

    app.get("/products", async (req, res) => {
      const projectField = { title: 1, email: 1 };
      const cursor = productCollection.find().skip(3);
      const result = await cursor.toArray();
      res.send(result);
    });

    //get data by specific ID;

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    //save data to mongodb

    app.post("/products", async (req, res) => {
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
        res.send({ message: "This is user already exist" });
      } else {
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      }
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
