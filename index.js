const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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

        const usersCollection = client.db("studyBuddyDB").collection("users");
        const reviewsCollection = client.db("studyBuddyDB").collection("reviews");
        const studyCollection = client.db("studyBuddyDB").collection("study");
        const tutorCollection = client.db("studyBuddyDB").collection("tutor");
        const sessionCollection = client.db("studyBuddyDB").collection("session");
        const notesCollection = client.db("studyBuddyDB").collection("notes");
        const materialsCollection = client.db("studyBuddyDB").collection("materials");
        const paymentsCollection = client.db("studyBuddyDB").collection("payments");

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt?.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        //middlewares
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers.authorization);
            if (!req.headers?.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

         //use verify admin after verifyToken
         const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        //user api
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        //review api
        app.post('/create-review', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review)
            res.send(result)
        })

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
            const query = req.params?.email;
            console.log(query)
            const result = await sessionCollection.find({ email: query }).toArray();
            res.send(result)
        })

        app.get('/all-approved-session/:email', async (req, res) => {
            const query = req.params?.email;
            console.log(query)
            const result = await sessionCollection.find({ email: query, status: "approved" }).toArray();
            res.send(result)
        })

        //materials api
        app.post('/create-materials', async (req, res) => {
            const materials = req.body;
            console.log(session);
            const result = await materialsCollection.insertOne(materials);
            res.send(result)
        })

          // payment intent
          app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'amount inside the intent')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
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