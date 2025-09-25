const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(require('cors')());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } })); // 10 MB

const DATA_FILE = path.join(__dirname, 'data.json');
function loadData(){ try { return JSON.parse(fs.readFileSync(DATA_FILE)); } catch(e){ return { posts: [], messages: [], users: [] }; } }
function saveData(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // set a secret in deployment

app.get('/api/posts', (req, res) => {
  const d = loadData();
  res.json(d.posts || []);
});

app.post('/api/posts', async (req, res) => {
  // optional admin token protection
  if(ADMIN_TOKEN){
    const token = req.headers['x-admin-token'] || '';
    if(token !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  }

  const title = req.body.title || '';
  const body = req.body.body || '';
  const author = req.body.author || 'Unknown';
  let imageUrl = null;

  if(req.files && req.files.image){
    const file = req.files.image;
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
    const form = new FormData();
    form.append('file', file.data, { filename: file.name });
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const r = await fetch(url, { method: 'POST', body: form });
    const j = await r.json();
    if(j.secure_url) imageUrl = j.secure_url;
  }

  const d = loadData();
  const post = { id: uuidv4(), title, body, author, image: imageUrl, createdAt: new Date().toISOString(), comments: [] };
  d.posts = d.posts || [];
  d.posts.push(post);
  saveData(d);
  res.json(post);
});

app.get('/api/messages', (req, res) => {
  const d = loadData();
  res.json(d.messages || []);
});

app.post('/api/messages', async (req, res) => {
  const d = loadData();
  let imageUrl = null;
  if(req.files && req.files.image){
    const file = req.files.image;
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
    const form = new FormData();
    form.append('file', file.data, { filename: file.name });
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const r = await fetch(url, { method: 'POST', body: form });
    const j = await r.json();
    if(j.secure_url) imageUrl = j.secure_url;
  }
  const msg = {
    id: uuidv4(),
    sender: req.body.sender || 'Guest',
    recipient: req.body.recipient || 'Admin',
    body: req.body.body || '',
    date: new Date().toISOString(),
    image: imageUrl
  };
  d.messages = d.messages || [];
  d.messages.push(msg);
  saveData(d);
  res.json(msg);
});

app.listen(process.env.PORT || 8787, ()=> console.log('Server started'));

