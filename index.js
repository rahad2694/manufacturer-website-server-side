const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
        const toolsCollection = client.db("allumin_apparatus").collection("tools_collection");

        // generating Access-Token during login for Client side
        app.post('/login', async (req, res) => {
            const email = req.body;
            console.log(email);
            const accessToken = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET);
            res.send({ accessToken });
        });
        //Home page 3 items load
        app.get('/tools',async(req, res)=> {
            const query = {};
            const result = await toolsCollection.find(query).limit(3).toArray();
            res.send(result);
        })
        //Items page All items load
        app.get('/alltools',async(req, res)=> {
            const query = {};
            const result = await toolsCollection.find(query).toArray();
            res.send(result);
        })
        //Items details by ID
        app.get('/item/:id',async(req, res)=> {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await toolsCollection.findOne(query);
            res.send(result);
        })

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