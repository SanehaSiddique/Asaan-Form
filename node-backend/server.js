require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require("./app/config/db.config");
const authRoutes = require("./app/routes/authRoutes");
const uploadRoutes = require("./app/routes/uploadRoutes");
const chatbotRoutes = require("./app/routes/chatbotRoutes");

const app = express();

app.use(express.json());   // for parsing json data
app.use(cors());           // to allow cross-origin requests

// Root route for health check
app.get('/', (req, res) => {
    res.json({ message: "Asaan-Form Node.js Backend is running", status: "ok" });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Database connection & Server start
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
    const { initWebSocket } = require('./app/websocket/wsServer');
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
    initWebSocket(server);
    server.timeout = 600000; // 10 minutes to allow for long AI processing
});
