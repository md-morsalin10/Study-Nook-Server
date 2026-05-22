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
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
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

        // await client.connect();
        const db = client.db("Study-Nook");
        const roomCollection = db.collection('rooms')
        const bookingCollection = db.collection('booking')

        // await roomCollection.updateMany(
        //     { hourlyRate: { $type: "string" } },
        //     [{ $set: { hourlyRate: { $toDouble: "$hourlyRate" } } }]
        // );

        app.get("/rooms", async (req, res) => {
            const { search, amenities, minRate, maxRate } = req.query;
            let query = {};
            if (search) {
                query.name = { $regex: search, $options: "i" };
            }
            if (amenities) {

                const amenityArray = amenities.split(",");
                query.amenities = { $in: amenityArray };
            }

            if (minRate || maxRate) {
                query.hourlyRate = {};
                if (minRate) query.hourlyRate.$gte = Number(minRate);
                if (maxRate) query.hourlyRate.$lte = Number(maxRate);
            }

            const result = await roomCollection.find(query).toArray();
            res.send(result);
        })

        app.get("/features", async (req, res) => {
            const result = await roomCollection.find().sort({ _id: -1 }).limit(6).toArray()
            res.send(result)
        })

        app.get("/my-rooms/:ownerId", verifyToken, async (req, res) => {
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

        app.get("/booking/:userId", verifyToken, async (req, res) => {
            const { userId } = req.params
            const result = await bookingCollection.find({ userId: userId }).toArray()
            res.send(result)
        })

        app.post("/booking", verifyToken, async (req, res) => {
            const bookingData = req.body
            const { roomId, date, startTime, endTime } = bookingData;
            console.log(bookingData, "form server");

            const conflictingBooking = await bookingCollection.findOne({
                roomId: roomId,
                date: date,

                $and: [
                    { status: { $ne: "canceled" } },
                    { status: { $ne: "Canceled" } }
                ],
                $and: [
                    { startTime: { $lt: endTime } },  // New Start < Existing End
                    { endTime: { $gt: startTime } }   // New End > Existing Start
                ]
            });


            if (conflictingBooking) {
                return res.status(400).send({
                    success: false,
                    message: `This room is already reserved from ${conflictingBooking.startTime} to ${conflictingBooking.endTime} on this date.`
                });
            }

            const result = await bookingCollection.insertOne(bookingData);
            res.send({ success: true, result })

        })

        app.post("/rooms", verifyToken, async (req, res) => {
            const roomData = req.body
            roomData.hourlyRate = Number(roomData.hourlyRate);
            console.log(roomData, "from server");

            const result = await roomCollection.insertOne(roomData)
            res.send(result)
        })


        // await client.db("admin").command({ ping: 1 });
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