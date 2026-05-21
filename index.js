const express = require("express")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require("dotenv")
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const app = express()
dotenv.config()

const port = process.env.PORT;
const uri = process.env.MONGO_URI;

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(
    new URL('http://localhost:3000/api/auth/jwks')
)

const verifyToken = async (req, res, next) => {
    const authHeaders = req?.headers.authorization
    // console.log(authHeaders);
    if (!authHeaders) {
        return res.status(401).send({ message: "unauthorized access" })
    }
    const token = authHeaders.split(" ")[1]
    if (!token) {
        return res.status(401).send({ message: "unauthorized access" })
    }
    // console.log(token);
    try {
        const { payload } = await jwtVerify(token, JWKS)
        console.log(payload);
        next()
    }
    catch (error) {
        return res.status(401).send({ message: "unauthorized access" })
    }
}

async function run() {
    try {

        await client.connect();
        const db = client.db("Study-Nook");
        const roomCollection = db.collection('rooms')
        const bookingCollection = db.collection('booking')

        app.get("/rooms", async (req, res) => {
            const result = await roomCollection.find().toArray()
            res.send(result);
        })

        app.get("/my-rooms/:ownerId", async (req, res) => {
            const { ownerId } = req.params
            const result = await roomCollection.find({ ownerId: ownerId }).toArray()
            res.send(result)
        })

        app.get("/rooms/:id", verifyToken, async (req, res) => {
            const { id } = req.params
            const result = await roomCollection.findOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        app.patch("/booking/:id", async (req, res) => {
            const { id } = req.params
            const { status } = req.body;
            const result = await bookingCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: status } }
            );
            res.send(result);
        })

        app.patch("/rooms/:id", async (req, res) => {
            const { id } = req.params
            const updatedData = req.body

            const result = await roomCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            )
            res.send(result)
        })

        app.delete("/rooms/:id", async (req, res) => {
            const { id } = req.params
            const result = await roomCollection.deleteOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        app.get("/booking/:userId", async (req, res) => {
            const { userId } = req.params
            const result = await bookingCollection.find({ userId: userId }).toArray()
            res.send(result)
        })

        app.post("/booking",verifyToken, async (req, res) => {
            const bookingData = req.body
            console.log(bookingData, "form server");

            const result = await bookingCollection.insertOne(bookingData)
            res.send(result)
        })

        app.post("/rooms", async (req, res) => {
            const roomData = req.body
            // console.log(roomData, "from server");

            const result = await roomCollection.insertOne(roomData)
            res.send(result)
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Server is Running")
})

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})