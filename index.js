const express = require("express")
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require("dotenv")
const cors = require('cors')
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

async function run() {
    try {
        
        await client.connect();
        const db = client.db("Study-Nook");
        const roomCollection = db.collection('rooms')

        app.get("/rooms", async(req, res)=>{
            const result = await roomCollection.find().toArray()
            res.send(result);
        })

        app.post("/rooms", async(req, res)=>{
            const roomData = req.body
            console.log(roomData, "from server");
            
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