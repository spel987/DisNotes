# DisNotes

## Create encrypted notes securely on Discord

<h1 align="center">
	<img src="https://i.imgur.com/GRcd6h3.png">
</h1>
<div align="center">
	<a href="https://ko-fi.com/spel987" target="_blank">
	    <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="ko-fi">
	</a>
</div>

### Try DisNotes: https://disnotes.vercel.app

# Use

## - 🖥️ Use it locally:

1) Install the latest version of Node.js: https://nodejs.org
2) Clone the repository:

```
git clone https://github.com/spel987/DisNotes.git
```

3) Install the dependencies:

```
npm i
```

4) Create an RSA key pair with `openssl`:

```
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:4096
```

```
openssl rsa -pubout -in private.pem -out public.pem
```

5) Setup environment values in an `.env` file (follow this example):

```.env
PORT=3000
PUBLIC_KEY_PATH=/keys/public.pem
PRIVATE_KEY_B64=b64-encoded private key
POSTGRES_URL=your PostgreSQL url
```

6) Start Tailwind compilation:

```
npm run tailwind
```

7) Launch server:

```
npm run dev
```

## - 🌐 Use it online:

Simply visit: **https://dinotes.vercel.app**

# Description

This project allows you to create and store notes securely on Discord.
Each note is encrypted using **AES-256** with a randomly generated AES key.
The AES key is then encrypted with **RSA** and sent as an attachment along with the message content to your Discord webhook.
In each request, the webhook is encrypted with the public RSA key on the client side and then decrypted with the private RSA key in the backend.

## 💾 What do I save

I store in a PostgreSQL database only:

|                           webhook_hash                           |                    note_ids                    |             pfp_link             |    username    |
| :--------------------------------------------------------------: | :--------------------------------------------: | :------------------------------: | :------------: |
| fdf978510dfad3574ecfcde05b89d4db7612b5012947b1f3c00295d52212a984 | ["1346070095524401254", "1346069479125155911"] | https://i.imgur.com/1BxJoqZ.jpeg | =＾● ⋏ ●＾= |

Only people who know the webhook can access the notes. The webhook URL is hashed with SHA-256, preventing anyone with the database from accessing your notes. Message IDs must be saved to display previous notes, but without a webhook URL, it's impossible to read the content (which is itself encrypted).  For the database, I use [supabase](https://supabase.com) integrated with Vercel. It's free, easy to install and use, I recommend it.

## 🔒 Encryption and storage method scheme

<h1 align="center">
	<img src="https://i.imgur.com/CzAJQQy.png">
</h1>

Decryption works on the same way, but in reverse.

## ▶️ Example

Here's an example of what notes look like when posted on Discord:

<h1 align="center">
	<img src="https://i.imgur.com/VfdZGnM.png">
</h1>

## 🛠️ Params

You can change the webhook's profile photo and username.

<h1 align="center">
	<img src="https://i.imgur.com/k4FeU0e.png">
</h1>

# To do

- Make the website responsive 😒
- Proposal: create a login system similar to crypto wallets, but less advanced. For example, when you first enter the Discord webhook, a few random words are generated (and checked to make sure they're not already in use). Then, each time you connect, you simply enter the words. Would this be an easier way to log in? Let me know in an issue if you'd be interested in this feature.

# Credits

### Developer:

- spel987<br>
  Email: `spel987@pm.me`<br>
  GitHub: https://github.com/spel987<br>

### Backend

- Node.js: https://nodejs.org
- Express: https://expressjs.com

### Database

- PostgreSQL: https://www.postgresql.org
- Supabase: https://supabase.com

### Frontend

- Tailwind CSS: https://tailwindcss.com
- Pixelarticons: https://pixelarticons.com
- allOrigins: https://github.com/gnuns/allorigins

# Suggestions

If you have any problems or suggestions, please open an [issue](https://github.com/spel987/DisNotes/issues).
