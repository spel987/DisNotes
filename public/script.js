const textarea = document.getElementById("input_note");
const send_button = document.getElementById("send_button");
const page_title = document.getElementById("page_title");
const input_webhook = document.getElementById("input_webhook");
const set_webhook_button = document.getElementById("set_webhook_button");
const char_count = document.getElementById("char_count");
const notes_text = document.getElementById("notes_text");
const notes_container = document.getElementById("notes_container");
const logout_button = document.getElementById("logout_button");
const login_text = document.getElementById("login_text");
const show_hide_button = document.getElementById("show_hide_button");
const eye = document.getElementById("eye");
const notes_count = document.getElementById("notes_count");
const settings_button = document.getElementById("settings_button");
const settings = document.getElementById("settings");
const cancel_button = document.getElementById("cancel_button");
const save_button = document.getElementById("save_button");
const input_pfp = document.getElementById("input_pfp");
const input_username = document.getElementById("input_username");
const error_settings_message = document.getElementById("error_settings_message");

let webhook_status = "hidden";
let note_index = 0;
let loading = false;
let login = false;
let all_notes_loaded = false;
let settings_panel = false;
let settings_changed = true;

const emotes = ["٩(＾◡＾)۶", "=＾● ⋏ ●＾=", "(๏ᆺ๏υ)", "╰(● ⋏ ●)╯", "(*^‿^*)", "(´♡‿♡`)", "( ◡‿◡ *)"];

page_title.innerText = page_title.textContent + " " + emotes[Math.floor(Math.random() * emotes.length)];
textarea.placeholder = "write ur note here " + emotes[Math.floor(Math.random() * emotes.length)];
input_webhook.placeholder = "paste ur webhook here " + emotes[Math.floor(Math.random() * emotes.length)];

const detect_regex = /^(?:https?:\/\/)?(www\.)?discord\.com\/api\/webhooks\/[^"]/;

function disable_button(button) {
    button.classList.add("opacity-50", "cursor-not-allowed", "pointer-events-none");
    button.classList.remove("cursor-pointer");
}

function enable_button(button) {
    button.classList.add("cursor-pointer");
    button.classList.remove("opacity-50", "cursor-not-allowed", "pointer-events-none");
}

if (localStorage.getItem("discord_webhook") != "" && detect_regex.test(localStorage.getItem("discord_webhook"))) {
    login = true;
}

function show_note(note_id, note_timestamp, raw_note_content, new_note) {
    const note_div = document.createElement("div");
    note_div.className = "bg-white/5 p-4 rounded-xl border border-white/10 hover:border-white/40 hover:bg-white/7 active:bg-white/8 transition-all duration-200 w-full";
    note_div.setAttribute("note_id", note_id)
    
    note_div.innerHTML = `<div class="flex justify-between items-center w-full"> <p class="text-white/50 text-sm">${note_timestamp}</p> <div class="flex gap-2 ml-auto"> <button class="cursor-pointer" id="copy_note"> <svg class="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M4 2h11v2H6v13H4V2zm4 4h12v16H8V6zm2 2v12h8V8h-8z" fill="#7e7e7e" /> </svg> </button> <button class="cursor-pointer" id="delete_note" data-note-id="${note_id}"> <svg class="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M16 2v4h6v2h-2v14H4V8H2V6h6V2h8zm-2 2h-4v2h4V4zm0 4H6v12h12V8h-4zm-5 2h2v8H9v-8zm6 0h-2v8h2v-8z" fill="#7e7e7e" /> </svg> </button> </div> </div>`;

    const note_content = document.createElement("p");
    note_content.className = "text-white text-left mt-2 whitespace-pre-wrap";
    const parts = raw_note_content.split(/(https?:\/\/\S+)/g);

    parts.forEach(part => {
        if (/https?:\/\/\S+/.test(part)) {
            const link = document.createElement("a");
            link.href = part;
            link.textContent = part;
            link.target = "_blank";
            link.className = "text-blue-400 underline";
            note_content.appendChild(link);
        } else {
            note_content.appendChild(document.createTextNode(part));
        }
    });

    note_div.appendChild(note_content);

    if (new_note) {
        notes_container.prepend(note_div);
    } else {
        notes_container.appendChild(note_div);
    }
    
}

async function retrieve_notes() {
    if (loading) return;
    loading = true;

    try {
        notes_container.innerHTML += `<div id="loading_notes" class="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-white/40 hover:bg-white/7 active:bg-white/8 transition-all duration-200 w-full"> <p id="notes_text" class="flex w-full p-2 text-white/50 text-left text-base"> <svg class="w-6 h-6 mr-2" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M13 2h-2v6h2V2zm0 14h-2v6h2v-6zm9-5v2h-6v-2h6zM8 13v-2H2v2h6zm7-6h2v2h-2V7zm4-2h-2v2h2V5zM9 7H7v2h2V7zM5 5h2v2H5V5zm10 12h2v2h2v-2h-2v-2h-2v2zm-8 0v-2h2v2H7v2H5v-2h2z" fill="currentColor" /> </svg> loading notes...</p> </div>`;

        const encrypted_webhook = await encrypt_webhook(localStorage.getItem("discord_webhook"));
        
        const response = await fetch("/retrieve", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "webhook_url": encrypted_webhook,
                "note_index": note_index
            })
        });
        const data = await response.json();

        if (data.success && data.notes.length > 0) {
            data.notes.forEach(note => {
                show_note(note.note_id, note.timestamp, note.content, false);
            });

            note_index += 5;
        } else if (data.error == "note not found") {
            if (no_note()) {
                notes_container.innerHTML += `<div class="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-white/40 hover:bg-white/7 active:bg-white/8 transition-all duration-200 w-full"> <p id="notes_text" class="flex w-full p-2 text-white/50 text-left text-base"> <svg class="w-6 h-6 mr-2" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M19 2H3v20h10v-2H5V4h14v10h2V2h-2zm-2 4H7v2h10V6zM7 10h10v2H7v-2zm6 4H7v2h6v-2zm6 4h-2v-2h-2v2h2v2h-2v2h2v-2h2v2h2v-2h-2v-2zm0 0h2v-2h-2v2z" fill="currentColor"></path> </svg> no notes created yet</p> </div>`;
            };
            all_notes_loaded = true;
        }

        document.getElementById("loading_notes").remove();
    } catch (error) {
        console.error("error loading notes: ", error);
        document.getElementById("loading_notes").remove(); 
        notes_container.innerHTML += `<div id="loading_notes" class="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-white/40 hover:bg-white/7 active:bg-white/8 transition-all duration-200 w-full"> <p id="notes_text" class="flex w-full p-2 text-white/50 text-left text-base"> <svg class="w-6 h-6 mr-2" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M13 1h-2v2H9v2H7v2H5v2H3v2H1v2h2v2h2v2h2v2h2v2h2v2h2v-2h2v-2h2v-2h2v-2h2v-2h2v-2h-2V9h-2V7h-2V5h-2V3h-2V1zm0 2v2h2v2h2v2h2v2h2v2h-2v2h-2v2h-2v2h-2v2h-2v-2H9v-2H7v-2H5v-2H3v-2h2V9h2V7h2V5h2V3h2zm0 4h-2v6h2V7zm0 8h-2v2h2v-2z" fill="currentColor"/> </svg> unable to load notes</p> </div>`;
    } finally {
        loading = false;
    }
}

function webhook_login(hidden) {
    let clean_url = localStorage.getItem("discord_webhook").replace("https://", "");

    if (hidden) {
        let url_parts = clean_url.split("/");

        let id_masked = url_parts[3].substring(0, 5) + "***";
        let token_masked = url_parts[4].substring(0, 5) + "***"
    
        login_text.innerHTML = `connected to: <strong>discord.com/api/webhooks/${id_masked}/${token_masked}</strong>`;
    } else {
        login_text.innerHTML = `connected to: <strong>${clean_url}</strong>`;
    }
    
}

function no_note() {
    const all_notes = document.querySelectorAll("[note_id]");
    if (all_notes.length == 0) {
        return true
    }
}

async function count_notes() {
    const encrypted_webhook = await encrypt_webhook(localStorage.getItem("discord_webhook"));
    fetch("/count", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "webhook_url": encrypted_webhook
        })
    })
    .then((response) => response.json())
    .then((data) => {
        notes_count.innerText = `ur notes (${data.notes_count}):`;
    })
}

async function get_public_key() {
    if (!localStorage.getItem("public_key")) {
        const response = await fetch("/public_key");
        const public_key_b64 = await response.text();
    
        localStorage.setItem("public_key", public_key_b64)
    }

    const public_key_b64 = localStorage.getItem("public_key");
    
    const public_key_binary = Uint8Array.from(atob(public_key_b64), c => c.charCodeAt(0));
    
    const public_key = await window.crypto.subtle.importKey(
        "spki",
        public_key_binary,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );

    return public_key;
}

async function encrypt_webhook(webhook_url) {
    const public_key = await get_public_key();

    const encoder = new TextEncoder();
    const encoded_webhook = encoder.encode(webhook_url);

    const encrypted = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        public_key,
        encoded_webhook
    );

    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

textarea.addEventListener("input", () => {
    if (textarea.value == "") {
        disable_button(send_button);
    } else {
        enable_button(send_button);
    }

    textarea.style.height = "auto";
    send_button.style.height = "auto";
    let new_height = Math.min(textarea.scrollHeight, 350);

    textarea.style.height = Math.max(new_height, 100) + "px";
    send_button.style.height = Math.max(new_height, 100) + 38 + "px";

    const current_length = textarea.value.length;
    char_count.textContent = `${current_length.toLocaleString("en-GB")} / 5,000`;

    if (current_length >= 4900) {
        char_count.classList.remove("text-white/50");
        char_count.classList.add("text-red-500/80");
    } else {
        char_count.classList.add("text-white/50");
        char_count.classList.remove("text-red-500/80");
    }
});

input_webhook.addEventListener("input", () => {
    if (input_webhook.value == "") {
        disable_button(set_webhook_button);
    }

    if (detect_regex.test(input_webhook.value)) {
        enable_button(set_webhook_button);
    } else {
        disable_button(set_webhook_button);
    }
});

set_webhook_button.addEventListener("click", async () => {
    disable_button(set_webhook_button);
    error_webhook_message.classList.add("hidden");

    const webhook = input_webhook.value;

    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(webhook)}`, {
            method: "GET"
        });

        const data = await response.json();

        if (data.status.http_code != 200) throw new Error(response.status);

        localStorage.setItem("discord_webhook", webhook);
        input_webhook.value = "";

        document.getElementById("webhook_setup").classList.add("hidden");
        document.getElementById("content").classList.remove("hidden");
        webhook_login(true);
        location.reload();

    } catch (error) {
        enable_button(set_webhook_button);

        const error_webhook_message = document.getElementById("error_webhook_message");
        error_webhook_message.classList.remove("hidden");
    }
});

send_button.addEventListener("click", async () => {
    disable_button(send_button);
    error_message.classList.add("hidden");
    const raw_message = textarea.value;
    const webhook_url = localStorage.getItem("discord_webhook");

    try {
        const encrypted_webhook = await encrypt_webhook(webhook_url);

        const response = await fetch("/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "webhook_url": encrypted_webhook,
                "raw_message": raw_message
            })
        });
    
        if (!response.ok) throw new Error(response.status);
        const response_data = await response.json();

        textarea.value = "";
        char_count.textContent = "0 / 5,000";
        textarea.style.height = 100 + "px";
        send_button.style.height = 138 + "px";
        char_count.classList.add("text-white/50");
        char_count.classList.remove("text-red-500/80");

        if (no_note()) {
            notes_container.innerHTML = "";
        }

        show_note(response_data.note_id, "just now", raw_message, true);

        note_index += 1;

        count_notes();

    } catch (error) {
        console.log(error)
        enable_button(send_button);

        const error_message = document.getElementById("error_message");
        error_message.classList.remove("hidden");
    }
});

logout_button.addEventListener("click", () => {
    localStorage.removeItem("discord_webhook");
    location.reload();
});

show_hide_button.addEventListener("click", () => {
    if (webhook_status == "hidden") {
        webhook_login(false);
        eye.setAttribute("d", "M0 7h2v2H0V7zm4 4H2V9h2v2zm4 2v-2H4v2H2v2h2v-2h4zm8 0H8v2H6v2h2v-2h8v2h2v-2h-2v-2zm4-2h-4v2h4v2h2v-2h-2v-2zm2-2v2h-2V9h2zm0 0V7h2v2h-2z");
        webhook_status = "revealed";
    } else if (webhook_status == "revealed") {
        webhook_login(true);
        eye.setAttribute("d", "M8 6h8v2H8V6zm-4 4V8h4v2H4zm-2 2v-2h2v2H2zm0 2v-2H0v2h2zm2 2H2v-2h2v2zm4 2H4v-2h4v2zm8 0v2H8v-2h8zm4-2v2h-4v-2h4zm2-2v2h-2v-2h2zm0-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm0 0V8h-4v2h4zm-10 1h4v4h-4v-4z");
        webhook_status = "hidden";
    }
});

notes_container.addEventListener("click", async (event) => {
    const delete_button = event.target.closest("#delete_note");
    const copy_button = event.target.closest("#copy_note");

    if (delete_button) {
        const note_id = delete_button.getAttribute("data-note-id");
    
        try {
            const encrypted_webhook = await encrypt_webhook(localStorage.getItem("discord_webhook"));

            await fetch("/delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "webhook_url": encrypted_webhook,
                    "note_id": note_id
                })
            });
    
            const deleted_note_div = document.querySelector(`[note_id="${note_id}"]`);
            if (deleted_note_div) deleted_note_div.remove();
    
            const current_number_note = parseInt(notes_count.innerText.match(/\((\d+)\)/)[1], 10);
            notes_count.innerText = `ur notes (${current_number_note - 1}):`;
    
            if (no_note()) notes_container.innerHTML = `<div class="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-white/40 hover:bg-white/7 active:bg-white/8 transition-all duration-200 w-full"> <p id="notes_text" class="flex w-full p-2 text-white/50 text-left text-base"> <svg class="w-6 h-6 mr-2" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M19 2H3v20h10v-2H5V4h14v10h2V2h-2zm-2 4H7v2h10V6zM7 10h10v2H7v-2zm6 4H7v2h6v-2zm6 4h-2v-2h-2v2h2v2h-2v2h2v-2h2v2h2v-2h-2v-2zm0 0h2v-2h-2v2z" fill="currentColor"></path> </svg> no notes created yet</p> </div>`;
    
        } catch (error) {
            console.error("error deleting note:", error);
        }
    } else if (copy_button) {
        const note_div = copy_button.closest("[note_id]");
        const note_text = note_div.querySelector("p.text-white.text-left").textContent;

        try {
            await navigator.clipboard.writeText(note_text);
            copy_button.innerHTML = `<svg class="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M18 6h2v2h-2V6zm-2 4V8h2v2h-2zm-2 2v-2h2v2h-2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 0v2h2v-2H8zm-2-2h2v2H6v-2zm0 0H4v-2h2v2z" fill="#7e7e7e"></path> </svg> `;
            setTimeout(() => {copy_button.innerHTML = `<svg class="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M4 2h11v2H6v13H4V2zm4 4h12v16H8V6zm2 2v12h8V8h-8z" fill="#7e7e7e"></path> </svg> `}, 800)
        } catch (error) {
            console.error("error when copying: ", error);
        }
    }
});

let last_pfp = "";
let last_username = "";

settings_button.addEventListener("click", async () => {
    if (!settings_panel) {
        error_settings_message.classList.add("hidden");
        settings.classList.remove("hidden");
        settings_panel = true;

        if (settings_changed) {
            const encrypted_webhook = await encrypt_webhook(localStorage.getItem("discord_webhook"));

            const response = await fetch("/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "webhook_url": encrypted_webhook
                })
            });
            
            const data = await response.json();
            input_pfp.value = data.pfp_link;
            input_username.value = data.username;

            last_pfp = data.pfp_link;
            last_username = data.username;

            settings_changed = false;

        } else {
            input_pfp.value = last_pfp;
            input_username.value = last_username;
        }
    } else {
        settings.classList.add("hidden");
        settings_panel = false;
    }
})

save_button.addEventListener("click", async () => {
    error_settings_message.classList.add("hidden");
    const encrypted_webhook = await encrypt_webhook(localStorage.getItem("discord_webhook"));
    const response = await fetch("/update_settings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "webhook_url": encrypted_webhook,
            "pfp_link": input_pfp.value,
            "username": input_username.value
        })
    });

    if (response.ok) {
        settings_panel = false;
        settings_changed = true;
        settings.classList.add("hidden");
    } else {
        error_settings_message.classList.remove("hidden");
    }    
})

cancel_button.addEventListener("click", () => {
    settings.classList.add("hidden");
    settings_panel = false;
})

if (login) {
    document.getElementById("webhook_setup").classList.add("hidden");
    document.getElementById("content").classList.remove("hidden");
    webhook_login(true);
    retrieve_notes();

    window.addEventListener("scroll", () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 && !all_notes_loaded) {
            retrieve_notes();
        }
    });

    count_notes();
}