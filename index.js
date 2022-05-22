const express = require('express');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

//MiddleWare:
app.use(cors());
app.use(express.json());


//Global test api
app.get('/',(req,res)=>{
    res.send('Server is running');
});


//Listening to port
app.listen(port,()=>{
    console.log('Listening to port',port);
});