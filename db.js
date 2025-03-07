const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL, 
    ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(() => console.log("✅ connected to PostgreSQL"))
    .catch(error => {
        console.error("database connection error: ", error);
        process.exit(1);
    });

const query = (text, params) => pool.query(text, params);

async function init_db() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS notes (
                webhook_hash TEXT PRIMARY KEY,
                note_ids TEXT NOT NULL DEFAULT '[]',
                pfp_link TEXT NOT NULL DEFAULT '',
                username TEXT NOT NULL DEFAULT ''
            )
        `);
    } catch (error) {
        console.error("error creating table: ", error);
    }
}

init_db();

module.exports = { query };