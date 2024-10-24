require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const emiRoutes = require('./routes/emiRoutes');

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

app.use(bodyParser.json()); // Parses JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parses URL-encoded request bodies


const port = process.env.PORT || 5000;

// Connect to MongoDB
const mongoURI = process.env.DB_URL;

if (!mongoURI) {
  console.error('DB_URL is not defined in environment variables');
  process.exit(1);
}

mongoose.connect(mongoURI)
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('Could not connect to MongoDB:', error));

// Use EMI routes
app.use('/api', emiRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
