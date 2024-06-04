const express = require('express');
const app = express();
const cors = require('cors');
// const jwt = require('jsonwebtoken');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

//middleware
app.use(
    cors({
      origin: [
        "http://localhost:5173",
        // "https://cardoctor-bd.web.app",
        // "https://cardoctor-bd.firebaseapp.com",
      ]
    })
  );
app.use(express.json());


app.get('/', (req, res) => {
    res.send('StudyBuddyHub is Running')
})

app.listen(port, () => {
    console.log(`StudyBuddyHub is Running on port ${port}`)
})