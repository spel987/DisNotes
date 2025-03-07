const express = require("express");
const axios = require("axios");
const cors = require('cors');
const path = require('path');
const crypto = require("crypto");
const fs = require("fs");
const FormData = require("form-data");
const rate_limit = require("express-rate-limit");
require("dotenv").config();

const { query } = require("./db");

const app = express();
const PORT = process.env.PORT;
const DEFAULT_USERNAME = "=＾● ⋏ ●＾=";
const DEFAULT_PFP = "https://i.imgur.com/1BxJoqZ.jpeg";

const limiter = rate_limit({
  windowMs: 5 * 1000,
  limit: 20,
  message: { error: "too many requests, i can't keep up" }
})

app.use(express.json());
app.use(cors());
app.use(limiter);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'keys')));

const public_key = fs.readFileSync(path.join(__dirname, process.env.PUBLIC_KEY_PATH), "utf8");
const private_key = Buffer.from(process.env.PRIVATE_KEY_B64, "base64").toString("ascii");

if (!public_key || !private_key || !PORT) {
  console.log("fill in the .env correctly")
  process.exit(1);
}

const detect_regex = /^(?:https?:\/\/)?(www\.)?discord\.com\/api\/webhooks\/[^"]/;

function hash_webhook(webhook_url) {
  return crypto.createHash("sha256").update(webhook_url).digest("hex");
}

function generate_AES_key() {
  return crypto.randomBytes(32);
}

function encrypt_message_AES(message, aes_key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", aes_key, iv);

  let encrypted = cipher.update(message, "utf8", "base64");
  encrypted += cipher.final("base64");

  return {
      encrypted_data: encrypted,
      iv: iv.toString("base64")
  };
}

function encrypt_AES_key(aes_key) {
  return crypto.publicEncrypt(
      {
          key: public_key,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256"
      },
      aes_key
  ).toString("base64");
}

function decrypt_AES_key(encrypted_AES_key) {
  return crypto.privateDecrypt(
      {
          key: private_key,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256"
      },
      Buffer.from(encrypted_AES_key, "base64")
  );
}

function decrypt_message_AES(encrypted_message, aes_key, iv) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", aes_key, Buffer.from(iv, "base64"));

  let decrypted = decipher.update(encrypted_message, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function decrypt_webhook(encrypted_webhook) {
  try {
    return crypto.privateDecrypt(
      {
          key: private_key,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256"
      },
      Buffer.from(encrypted_webhook, "base64")
  ).toString("utf8");
  } catch (error) {
    return "unable to decrypt the webhook"
  }
  
}

async function store_message_id(webhook_url, message_id) {
  const hashed_webhook = hash_webhook(webhook_url);

  const { rows } = await query("SELECT note_ids FROM notes WHERE webhook_hash = $1", [hashed_webhook]);
  let note_ids = rows.length ? JSON.parse(rows[0].note_ids) : [];
  
  note_ids.unshift(message_id);
  const new_note_ids = JSON.stringify(note_ids);

  if (rows.length) {
      await query("UPDATE notes SET note_ids = $1 WHERE webhook_hash = $2", [new_note_ids, hashed_webhook]);
  } else {
      await query("INSERT INTO notes (webhook_hash, note_ids) VALUES ($1, $2)", [hashed_webhook, new_note_ids]);
  }
}

async function delete_note(webhook_url, note_id) {
  const hashed_webhook = hash_webhook(webhook_url);

  const { rows } = await query("SELECT note_ids FROM notes WHERE webhook_hash = $1", [hashed_webhook]);
  if (!rows.length) return;

  let note_ids = JSON.parse(rows[0].note_ids);
  note_ids = note_ids.filter(id => id !== note_id);

  if (note_ids.length === 0) {
      await query("DELETE FROM notes WHERE webhook_hash = $1", [hashed_webhook]);
  } else {
      await query("UPDATE notes SET note_ids = $1 WHERE webhook_hash = $2", [JSON.stringify(note_ids), hashed_webhook]);
  }
}

function is_valid_URL(string) {
  try {
      new URL(string);
      return true;
  } catch (error) {
      return false;
  }
}

async function get_webhook_pfp(webhook_url) {
  const hashed_webhook = hash_webhook(webhook_url);

  const { rows } = await query("SELECT pfp_link FROM notes WHERE webhook_hash = $1", [hashed_webhook]);
  if (rows[0]?.pfp_link) {
    return rows[0].pfp_link;
  } else {
    return DEFAULT_PFP;
  } 
}

async function get_webhook_username(webhook_url) {
  const hashed_webhook = hash_webhook(webhook_url);

  const { rows } = await query("SELECT username FROM notes WHERE webhook_hash = $1", [hashed_webhook]);
  if (rows[0]?.username) {
    return rows[0].username;
  } else {
    return DEFAULT_USERNAME;
  }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post("/send", async (req, res) => {
  const webhook_url = decrypt_webhook(req.body.webhook_url);
  const raw_message = req.body.raw_message;

  if (!webhook_url) return res.status(400).json({ error: "webhook url is needed" });
  if (!raw_message) return res.status(400).json({ error: "raw message is needed" });
  if (raw_message.length > 5000) return res.status(400).json({ error: "message too long" });

  if (!detect_regex.test(webhook_url)) return res.status(400).json({ error: "the webhook must be valid" });

  try {
    const aes_key = generate_AES_key();
    const { encrypted_data, iv } = encrypt_message_AES(raw_message, aes_key);
    const encrypted_AES_key = encrypt_AES_key(aes_key);

    const message_buffer = Buffer.from(`${encrypted_AES_key}|${encrypted_data}|${iv}`, "utf-8");

    let pfp_link = await get_webhook_pfp(webhook_url);
    let username = await get_webhook_username(webhook_url);

    const message_data = {
      username: username,
      avatar_url: pfp_link
    }

    const form_data = new FormData();
    form_data.append("file", message_buffer, { filename: "meow.txt", contentType: "text/plain" });
    form_data.append("payload_json", JSON.stringify(message_data));

    const response = await axios.post(webhook_url + "?wait=true", form_data);
    const message_id = response.data.id;
  
    await store_message_id(webhook_url, message_id);

    res.json({ success: true, note_id: message_id });
  } catch (error) {
    console.error("error when sending message:", error);
    res.status(500).json({ error: "unable to send message", api_status: error.status });
  }
});

app.post("/delete", async (req, res) => {
  const webhook_url = decrypt_webhook(req.body.webhook_url);
  const note_id = req.body.note_id;

  if (!webhook_url) return res.status(400).json({ error: "webhook url is needed" });
  if (!note_id) return res.status(400).json({ error: "note id is needed" });
  if (!detect_regex.test(webhook_url)) return res.status(400).json({ error: "the webhook must be valid" });
  
  try {
    await delete_note(webhook_url, note_id);

    res.json({ success: true });
  } catch (error) {
    console.error("error when deleting note: ", error);
    res.status(500).json({ error: "unable to delete note" });
  }
});

app.post("/retrieve", async (req, res) => {
  const webhook_url = decrypt_webhook(req.body.webhook_url);
  const note_index = req.body.note_index;

  if (!webhook_url) return res.status(400).json({ error: "webhook URL is required" });
  if (note_index === undefined || isNaN(note_index) || note_index < 0) return res.status(400).json({ error: "note index must be a valid positive number" });

  const hashed_webhook = hash_webhook(webhook_url);

  const { rows } = await query("SELECT note_ids FROM notes WHERE webhook_hash = $1", [hashed_webhook]);
  const message_ids = rows.length ? JSON.parse(rows[0].note_ids || "[]") : [];

  const start_index = parseInt(note_index, 10);
  const end_index = start_index + 5;

  if (start_index >= message_ids.length) return res.status(404).json({ error: "note not found" });

  let retrieved_notes = [];

  for (let i = start_index; i < end_index && i < message_ids.length; i++) {
      const message_id = message_ids[i];

      try {
          const response = await axios.get(`${webhook_url}/messages/${message_id}`);

          if (response.status === 429) {
              const retry_after = response.data.retry_after || 5000;
              return res.status(429).json({ error: "rate limited by Discord", retry_after });
          }

          if (!response.data.attachments || response.data.attachments.length === 0) {
              continue;
          }

          const file_url = response.data.attachments[0].url;
          const file_response = await axios.get(file_url, { responseType: "text" });
          const file_content = file_response.data;

          const [encrypted_AES_key, encrypted_data, iv] = file_content.split("|");
          const aes_key = decrypt_AES_key(encrypted_AES_key);
          const decrypted_message = decrypt_message_AES(encrypted_data, aes_key, iv);

          const timestamp = response.data.timestamp;
          const date = new Date(timestamp).toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
          });

          retrieved_notes.push({
              note_id: message_id,
              content: decrypted_message,
              timestamp: date
          });

          await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
          if (error.response?.status === 404) {
              delete_note(webhook_url, message_id);
              continue;
          }
      }
  }

  res.json({
      success: true,
      notes: retrieved_notes
  });
});

app.post("/count", async (req, res) => {
  try {
      const webhook_url = decrypt_webhook(req.body.webhook_url);
      if (!webhook_url) return res.status(400).json({ error: "webhook URL is required" });
      if (!detect_regex.test(webhook_url)) return res.status(400).json({ error: "the webhook must be valid" });

      const hashed_webhook = hash_webhook(webhook_url);

      const { rows } = await query("SELECT note_ids FROM notes WHERE webhook_hash = $1", [hashed_webhook]);
      res.json({ success: true, notes_count: rows.length ? JSON.parse(rows[0].note_ids).length : 0 });

  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.post("/settings", async (req, res) => {
  try {
      const webhook_url = decrypt_webhook(req.body.webhook_url);

      if (!webhook_url) return res.status(400).json({ error: "webhook URL is required" });
      if (!detect_regex.test(webhook_url)) return res.status(400).json({ error: "the webhook must be valid" });

      const pfp_link =  await get_webhook_pfp(webhook_url);
      const username = await get_webhook_username(webhook_url);

      res.json({ success: true, pfp_link: pfp_link, username: username });

  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.post("/update_settings", async (req, res) => {
  try {
    const webhook_url = decrypt_webhook(req.body.webhook_url);
    let { pfp_link, username } = req.body;
    if (!webhook_url) return res.status(400).json({ error: "webhook url is needed" });
    if (!detect_regex.test(webhook_url)) return res.status(400).json({ error: "the webhook must be valid" });

    if (!username) username = DEFAULT_USERNAME;
    if (!pfp_link) {
      pfp_link = DEFAULT_PFP;
    } else if (!is_valid_URL(pfp_link)) {
      return res.status(400).json({ error: "pfp link must be valid" });
    }

    const hashed_webhook = hash_webhook(webhook_url);

    const { rows } = await query("SELECT webhook_hash FROM notes WHERE webhook_hash = $1", [hashed_webhook]);

    if (rows.length > 0) {
        await query("UPDATE notes SET pfp_link = $1 WHERE webhook_hash = $2", [pfp_link, hashed_webhook]);
        await query("UPDATE notes SET username = $1 WHERE webhook_hash = $2", [username, hashed_webhook]);
    } else {
        console.log("no rows")
        await query("INSERT INTO notes (webhook_hash, pfp_link, note_ids) VALUES ($1, $2, '[]')", [pfp_link, hashed_webhook]);
        await query("INSERT INTO notes (webhook_hash, username, note_ids) VALUES ($1, $2, '[]')", [username, hashed_webhook]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("error when setting pfp link and username: ", error);
    res.status(500).json({ error: "unable to setting pfp and/or username" });
  }
});

app.get("/public_key", (req, res) => {
  let public_key_enhance = public_key;

  public_key_enhance = public_key_enhance.replace(/-----BEGIN PUBLIC KEY-----\n?/, "")
                       .replace(/-----END PUBLIC KEY-----\n?/, "")
                       .replace(/\n/g, "");

  res.setHeader("Content-Type", "text/plain");
  res.send(public_key_enhance);
});

app.get('/github', function(req, res){
  res.redirect('https://github.com/spel987/DisNotes');
});

app.get('*name', function(req, res){
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use('*name', function(req, res){
    res.status(404).json({message: "nothing should be sent here?"});
});

app.listen(PORT, () => {
  console.log(`🚀 server started on http://localhost:${PORT}`);
});
