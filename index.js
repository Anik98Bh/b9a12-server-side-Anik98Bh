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
        const sessionCollection = client.db("studyBuddyDB").collection("session");
        const notesCollection = client.db("studyBuddyDB").collection("notes");
        const materialsCollection = client.db("studyBuddyDB").collection("materials");
        const bookedCollection = client.db("studyBuddyDB").collection("booked");
        const feedbacksCollection = client.db("studyBuddyDB").collection("feedbacks");

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt?.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        //middlewares
        const verifyToken = (req, res, next) => {
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


        app.get('/users', verifyToken, async (req, res) => {
            const { search } = req.query;
          
            try {
              let query = {};
              if (search) {
                const searchRegex = new RegExp(search, 'i');
                query = {
                  $or: [
                    { name: searchRegex },
                    { email: searchRegex }
                  ]
                };
              }
          
              const result = await usersCollection.find(query).toArray();
          
              res.send(result);
            } catch (error) {
              console.error('Error searching users:', error);
              res.status(500).json({ error: 'Internal server error' });
            }
          });

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

        app.patch('/users/tutor/:id', verifyToken, verifyAdmin, async (req, res) => {
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

        //reviews api
        app.get('/reviews/:id', verifyToken, async (req, res) => {
            const query = req.params.id
            const result = await reviewsCollection.find({ id: query }).toArray();
            res.send(result)
        })

        app.post('/create-review', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review)
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
            const result = await sessionCollection.insertOne(session);
            res.send(result)
        })

        app.get('/all-session/:email', async (req, res) => {
            const query = req.params?.email;
            const result = await sessionCollection.find({ tutorEmail: query }).toArray();
            res.send(result)
        })

        app.get('/all-session', async (req, res) => {
            const result = await sessionCollection.find().toArray();
            res.send(result)
        })

        //all-session pagination api
        app.get('/all-approved-session', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 6;
        
            try {
                const totalItems = await sessionCollection.countDocuments({ status: "approved" });
                const totalPages = Math.ceil(totalItems / limit);
        
                if (page < 1 || page > totalPages) {
                    return res.status(400).send({ message: 'Invalid page number' });
                }
        
                const skip = (page - 1) * limit;
        
                const items = await sessionCollection.find({ status: "approved" })
                    .skip(skip)
                    .limit(limit)
                    .toArray();
        
                res.send({
                    page,
                    limit,
                    totalItems,
                    totalPages,
                    items
                });
            } catch (error) {
                console.error('Error fetching data:', error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.get('/all-study-session/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id, 'id find')
            const query = { _id: new ObjectId(id) }
            const result = await sessionCollection.findOne(query);
            res.send(result)
        })

        app.patch('/update-session/:id', async (req, res) => {
            const id = req.params.id;
            const fee = req.body?.fee;
            const status = req.body?.status;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    fee: fee,
                    status: status
                }
            }
            const result = await sessionCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        app.delete('/delete-session/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await sessionCollection.deleteOne(query);
            res.send(result)
        })

        app.get('/all-approved-session/:email', async (req, res) => {
            const query = req.params?.email;
            const result = await sessionCollection.find({ tutorEmail: query, status: "approved" }).toArray();
            res.send(result)
        })

        // rejection & feedback api
        app.get('/rejection-feedback/:id', async (req, res) => {
            const result = await feedbacksCollection.find().toArray();
            res.send(result)
        })

        app.post('/create-feedback', async (req, res) => {
            const feedback = req.body;
            const result = await feedbacksCollection.insertOne(feedback);
            res.send(result)
        })

        //materials api
        app.get('/materials', async (req, res) => {
            const result = await materialsCollection.find().toArray();
            res.send(result)
        })

        app.get('/materials/:email', async (req, res) => {
            const query = req.params?.email;
            const result = await materialsCollection.find({ email: query }).toArray();
            res.send(result)
        })

        app.post('/create-materials', async (req, res) => {
            const materials = req.body;
            const result = await materialsCollection.insertOne(materials);
            res.send(result)
        })

        app.patch('/update-materials/:id', async (req, res) => {
            const id = req.params.id;
            const image = req.body?.image;
            const url = req.body?.url;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    image: image,
                    url: url
                }
            }
            const result = await materialsCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        app.delete('/delete-materials/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await materialsCollection.deleteOne(query);
            res.send(result)
        })

        //student notes api
        app.get('/notes/:email', async (req, res) => {
            const query = req.params?.email;
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
            const id = req.params?.id;
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

        // booked related api
        app.get('/booked/:email', async (req, res) => {
            const query = req.params?.email;
            const result = await bookedCollection.find({ studentEmail: query }).toArray();
            res.send(result)
        })

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