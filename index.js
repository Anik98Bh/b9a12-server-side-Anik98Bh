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
        const bookedCollection = client.db("studyBuddyDB").collection("booked");

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
            const email = req.decoded?.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        //use verify tutor after verifyToken
        const verifyTutor = async (req, res, next) => {
            const email = req.decoded?.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isTutor = user?.role === 'tutor';
            if (!isTutor) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        //user api
        app.get('/users', verifyToken, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params?.email;
            if (email !== req.decoded?.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })

        app.get('/users/tutor/:email', verifyToken, async (req, res) => {
            const email = req.params?.email;
            if (email !== req.decoded?.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let tutor = false;
            if (user) {
                tutor = user?.role === 'tutor';
            }
            res.send({ tutor })
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: ' user already exists', insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params?.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        app.patch('/users/tutor/:id', verifyToken,verifyAdmin, async (req, res) => {
            const id = req.params?.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'tutor'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        // admin related api
        app.delete('/rejected-study-session/:id', async (req, res) => {
            const id = req.params.id;
            console.log('deleted material id:', id)
            const query = { _id: new ObjectId(id) }
            // const result = await materialsCollection.deleteOne(query);
            // res.send(result)
        })
        
        app.delete('/remove-materials/:id', async (req, res) => {
            const id = req.params.id;
            console.log('deleted material id:', id)
            const query = { _id: new ObjectId(id) }
            // const result = await materialsCollection.deleteOne(query);
            // res.send(result)
        })

        //reviews api
        app.get('/reviews/:id',verifyToken, async (req, res) => {
            const query = req.params.id
            const result = await reviewsCollection.find({ id: query }).toArray();
            res.send(result)
        })

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
            const query = "tutor"
            const result = await usersCollection.find({ role: query }).toArray();
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
        app.get('/materials/:email', async (req, res) => {
            const query = req.params?.email;
            console.log(query)
            const result = await materialsCollection.find({ email: query }).toArray();
            res.send(result)
        })

        app.post('/create-materials', async (req, res) => {
            const materials = req.body;
            console.log(materials);
            const result = await materialsCollection.insertOne(materials);
            res.send(result)
        })

        app.delete('/materials/:id', async (req, res) => {
            const id = req.params.id;
            console.log('deleted material id:', id)
            const query = { _id: new ObjectId(id) }
            const result = await materialsCollection.deleteOne(query);
            res.send(result)
        })

        //student notes api
        app.get('/notes/:email', async (req, res) => {
            const query = req.params?.email;
            console.log(query)
            const result = await notesCollection.find({ email: query }).toArray();
            res.send(result)
        })

        app.post('/create-note', async (req, res) => {
            const note = req.body;
            const result = await notesCollection.insertOne(note)
            res.send(result)
        })

        app.patch('/update-note/:id', async (req, res) => {
            const id = req.params.id;
            const title = req.body.title;
            const description = req.body.description;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    title: title,
                    description: description,
                }
            }
            const result = await notesCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        app.delete('/notes/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await notesCollection.deleteOne(query);
            res.send(result)
        })

        // payment intent api
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

        // booked api
        app.post('/book-session', async (req, res) => {
            const booked = req.body;
            const result = await bookedCollection.insertOne(booked)
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