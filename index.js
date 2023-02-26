const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

//MiddleWare:
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dko3b.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//Verify JWT Token MiddleWare for Valid User Requests:
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized User Request!' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access!' });
        }
        req.decodedEmail = decoded.email;
        next();
    })
}

async function run() {
    try {
        await client.connect();
        const userCollection = client.db("allumin_apparatus").collection("user_collection");
        const toolsCollection = client.db("allumin_apparatus").collection("tools_collection");
        const orderCollection = client.db("allumin_apparatus").collection("order_collection");
        const ratingCollection = client.db("allumin_apparatus").collection("rating_collection");

        //Verify Administrator MiddleWare :
        const verifyAdmin = async (req, res, next) => {
            const requesterEmail = req.decodedEmail;
            const requesterDetails = await userCollection.findOne({ email: requesterEmail });
            if (requesterDetails?.role === 'admin') {
                next()
            } else {
                return res.status(403).send({ message: 'Forbidden Access! Admin Only!' });
            }
        }

        // generating Access-Token during login (Open)
        app.post('/login', async (req, res) => {
            const email = req.body;
            const accessToken = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET);  //CHECK EMAIL
            const userData = req.body;
            const filter = { email: email.email };

            const options = { upsert: true };
            const updatedUser = {
                $set: userData
            };
            const result = await userCollection.updateOne(filter, updatedUser, options);
            res.send({ accessToken });
        });

        //Home page 3 items load (Open)
        app.get('/tools', async (req, res) => {
            const query = {};
            const options = {
                // sort returned documents in decsending order by title (Z->A)
                sort: { _id: -1 },
            };
            const result = await toolsCollection.find(query, options).limit(3).toArray();
            res.send(result);
        })

        //Payment POST api Intent // (Verification required)
        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
            const { orderValue } = req.body;
            const amount = orderValue * 100;
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card'],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        //Items page All items load (Verification Required)
        app.get('/alltools', async (req, res) => {
            const query = {};
            const result = await toolsCollection.find(query).toArray();
            res.send(result);
        });

        //Items details by ID (Verification required)
        app.get('/item/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.findOne(query);
            res.send(result);
        });

        //Add order in DB (Verification required)
        app.post('/placeorder', verifyJWT, async (req, res) => {
            const doc = req.body;
            const result = await orderCollection.insertOne(doc);
            res.send(result);
        });

        //Update stock  (Verification required)
        app.put('/updatestock/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const newInfo = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedItem = {
                $set: newInfo
            };
            const result = await toolsCollection.updateOne(filter, updatedItem);
            res.send(result);
        });

        //Add/update user info in DB (Verification required)
        app.put('/updateuser', verifyJWT, async (req, res) => {
            const newInfo = req.body;
            const filter = { email: newInfo.email };
            const options = { upsert: true };
            const updatedItem = {
                $set: newInfo
            };
            const result = await userCollection.updateOne(filter, updatedItem, options);
            res.send(result);
        });

        //User details by email (Verification done inside)
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            // console.log(email);
            const query = { email };
            const result = await userCollection.findOne(query);

            if (email !='undefined') {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    return res.status(401).send({ message: 'UnAuthorized User Request!' });
                }
                const token = authHeader.split(' ')[1];
                jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                    if (err) {
                        return res.status(403).send({ message: 'Forbidden Access!' });
                    }
                    res.send(result);
                })
            }
            else {
                res.send({ role: '' });
            }
        });

        //Find All orders by Email (Verification required)
        app.get('/orders/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        });

        // Deleting an existing Order (Verification required)
        app.delete('/deleteorder/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        //Add User ratings in DB (Verification required)
        app.post('/addrating', verifyJWT, async (req, res) => {
            const doc = req.body;
            const result = await ratingCollection.insertOne(doc);
            res.send(result);
        });

        //Load Six Ratings in home Page (open)
        app.get('/sixratings', async (req, res) => {
            const query = {};
            const options = {
                // sort returned documents in descending order by title (Z->A)
                sort: { _id: -1 },
            };
            const result = await ratingCollection.find(query, options).limit(6).toArray();
            res.send(result);
        });

        //Load All Ratings in Ratings Page (open)
        app.get('/allratings', async (req, res) => {
            const query = {};
            const options = {
                // sort returned documents in decsending order by title (Z->A)
                sort: { _id: -1 },
            };
            const result = await ratingCollection.find(query, options).toArray();
            res.send(result);
        });

        //Show order detail by ID (Verification required)
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        });

        //Update Payment info in Order (Verification required)
        app.put('/updateorder/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const newInfo = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedItem = {
                $set: newInfo
            };
            const result = await orderCollection.updateOne(filter, updatedItem);
            res.send(result);
        });

        //Add New Product in DB (Verification required) (ADMIN)
        app.post('/addnewproduct', verifyJWT, verifyAdmin, async (req, res) => {
            const doc = req.body;
            const result = await toolsCollection.insertOne(doc);
            res.send(result);
        });

        // Deleting an existing Product (Verification required) (ADMIN)
        app.delete('/deletetool/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.deleteOne(query);
            res.send(result);
        });

        //Users page All Users load (Verification required) (ADMIN)
        app.get('/allusers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await userCollection.find(query).toArray();
            res.send(result);
        });

        // Make Admin API (Verification required) (ADMIN)
        app.put('/makeadmin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const newInfo = req.body;
            const query = { _id: ObjectId(id) };
            const updatedItem = {
                $set: newInfo
            };
            const result = await userCollection.updateOne(query, updatedItem);
            res.send(result);
        });

        //Get All orders by ADMIN (Verification required) (ADMIN)
        app.get('/allorders', verifyJWT, async (req, res) => {
            const query = {};
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        });

        // Deleting an existing Order BY ADMIN (Verification required) (ADMIN)
        app.delete('/deleteorderbyadmin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        //Update Shipment info in Order (Verification required) (ADMIN)
        app.put('/updateshipment/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const newInfo = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedItem = {
                $set: newInfo
            };
            const result = await orderCollection.updateOne(filter, updatedItem);
            res.send(result);
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

//vercel added

//Listening to port
app.listen(port, () => {
    console.log('Listening to port', port);
});
