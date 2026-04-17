import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = Number(process.env.PORT || 3000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

// Serve static files from dist with proper cache headers
app.use(express.static(distPath, {
  maxAge: '1h',
  etag: false,
  setHeaders: (res, path) => {
    // HTML files: no cache
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
    // JS/CSS: long cache
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// SPA fallback: serve index.html for any unknown route
app.get('*', (req, res) => {
  console.log(`📍 Route: ${req.path} -> serving index.html`);
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📂 Serving files from: ${distPath}`);
});
