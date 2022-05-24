const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

//MiddleWare:
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dko3b.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const userCollection = client.db("allumin_apparatus").collection("user_collection");

        // generating Access-Token during login for Client side
        app.post('/login', async (req, res) => {
            const email = req.body;
            console.log(email);
            const accessToken = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET);
            res.send({ accessToken });
        });

    }
    finally {

    }
}

run().catch(console.dir);



//Global test api
app.get('/', (req, res) => {
    res.send('Server is running');
});


//Listening to port
app.listen(port, () => {
    console.log('Listening to port', port);
});