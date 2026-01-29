require('dotenv').config();
const { MongoClient } = require('mongodb');

// Use MONGO_URI as the environment variable for Atlas connection (Render will provide this)
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
let client;
let db;

async function connectToDB() {
    if (db) {
        return db;
    }
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('hike_dashboard_db');
    console.log('Connected to MongoDB');
    return db;
}

function getDB() {
    return db;
}

module.exports = { connectToDB, getDB };
