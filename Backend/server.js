const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const userRoutes = require('./routes/UserRoutes');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// ✅ Connect to DB
require('./config/db')();  // this must call the function
const capacityRoutes = require('./routes/capacityRoutes');
// ✅ Routes
app.use('/api/users', userRoutes);
//app.use('/api/users', require('./routes/UserRoutes'));
app.use('/api/capacity', capacityRoutes);

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
