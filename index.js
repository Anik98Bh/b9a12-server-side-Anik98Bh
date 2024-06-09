const express = require('express');
const app = express();
const cors = require('cors');
// const jwt = require('jsonwebtoken');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

//middleware
app.use(
    cors()
);
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jgrphar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const studyCollection = client.db("studyBuddyDB").collection("study");
        const tutorCollection = client.db("studyBuddyDB").collection("tutor");
        const sessionCollection = client.db("studyBuddyDB").collection("session");
        const materialsCollection = client.db("studyBuddyDB").collection("materials");

        //study api
        app.get('/study', async (req, res) => {
            const result = await studyCollection.find().toArray();
            res.send(result)
        })


        app.get('/study/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await studyCollection.findOne(query);
            res.send(result)
        })

        //tutor api
        app.get('/tutor', async (req, res) => {
            const result = await tutorCollection.find().toArray();
            res.send(result)
        })

        //session api
        app.post('/create-session', async (req, res) => {
            const session = req.body;
            console.log(session);
            const result = await sessionCollection.insertOne(session);
            res.send(result)
        })

        app.get('/all-session', async (req, res) => {
            const result = await sessionCollection.find().toArray();
            res.send(result)
        })

        app.get('/all-session/:email', async (req, res) => {
            const query=req.params?.email;
            console.log(query)
            const result = await sessionCollection.find({email:query}).toArray();
            res.send(result)
        })

        app.get('/all-approved-session/:email', async (req, res) => {
            const query=req.params?.email;
            console.log(query)
            const result = await sessionCollection.find({email:query,status:"approved"}).toArray();
            res.send(result)
        })

         //materials api
         app.post('/create-materials', async (req, res) => {
            const materials = req.body;
            console.log(session);
            const result = await materialsCollection.insertOne(materials);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('StudyBuddyHub is Running')
})

app.listen(port, () => {
    console.log(`StudyBuddyHub is Running on port ${port}`)
})