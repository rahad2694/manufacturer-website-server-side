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
        const orderCollection = client.db("allumin_apparatus").collection("order_collection");
        const ratingCollection = client.db("allumin_apparatus").collection("rating_collection");

        // generating Access-Token during login for Client side
        app.post('/login', async (req, res) => {
            const email = req.body;
            const accessToken = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET);  //CHECK EMAIL
            const userData = req.body;
            //Adding User in DB
            console.log('the main is:',email.email);
            const filter = {email : email.email};
            
            const options = { upsert: true };
            const updatedUser = {
                $set: userData
            };
            const result = await userCollection.updateOne(filter, updatedUser,options);
            // console.log("Result is:",result);

            //Sending AccessToken to client-side
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
        //Add order in DB
        app.post('/placeorder',async(req, res)=> {
            const doc = req.body;
            // const toolID = doc.toolId;
            
            // const query = {_id: ObjectId(id)};
            const result = await orderCollection.insertOne(doc);
            res.send(result);
        });

        //Update stock 
        app.put('/updatestock/:id',async(req,res)=>{
            const id = req.params.id;
            // console.log('target ID:',id);
            const newInfo = req.body;
            // console.log('Target Data:',newInfo);
            const filter = { _id: ObjectId(id) };
            // const options = { upsert: true };
            const updatedItem = {
                $set: newInfo
            };
            const result = await toolsCollection.updateOne(filter, updatedItem);
            // console.log(result);
            res.send(result);
        });
        //Add/update user info in DB
        app.put('/updateuser',async(req,res)=>{
            const newInfo = req.body;
            
            const filter = {email : newInfo.email};
            // console.log('Target Mail:',newInfo.email);
            const options = { upsert: true };
            const updatedItem = {
                $set: newInfo
            };
            const result = await userCollection.updateOne(filter, updatedItem,options);
            // console.log(result);
            res.send(result);
        });

        //User details by email
        app.get('/user/:email',async(req, res)=> {
            const email = req.params.email;
            const query = {email};
            console.log(query);
            const result = await userCollection.findOne(query);
            console.log(result);
            res.send(result);
        });

        //Find All orders by Email
        app.get('/orders/:email',async(req, res)=> {
            const email = req.params.email;
            const query = {email};
            // console.log(query);
            const result = await orderCollection.find(query).toArray();
            // console.log(result);
            res.send(result);
        });

        // Deleting an existing Order
        app.delete('/deleteorder/:id', async (req, res) => {
            const id = req.params.id;
            console.log('Deleting', id);
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });
        //Add User ratings in DB
        app.post('/addrating',async(req, res)=> {
            const doc = req.body;
            // const toolID = doc.toolId;
            
            // const query = {_id: ObjectId(id)};
            const result = await ratingCollection.insertOne(doc);
            res.send(result);
        });
        //Load All Ratings
        app.get('/allratings',async(req, res)=> {
            const query = {};
            const result = await ratingCollection.find(query).toArray();
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