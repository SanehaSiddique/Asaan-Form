const express = require('express');
var mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require("./App/routes/authRoutes");
require('dotenv').config();

const app = express();

app.use(express.json());   // for parsing json data
app.use(cors());           // to allow cross-origin requests

app.use('/api/auth', authRoutes);

// it is the connectivity of mongoose with the database
mongoose.connect(process.env.dbURL)     // it is a kind of promise so we can use .then() and .catch() methods
.then(() => {
    console.log('Connected to MongoDB...')
    app.listen(process.env.PORT);
}).catch(
    (err) => console.error('Error:', err)
);