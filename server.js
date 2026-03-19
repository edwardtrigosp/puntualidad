const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const FOLDERS_FILE = path.join(DATA_DIR, "folders.json");
const SHEETS_DIR = path.join(DATA_DIR, "sheets");
const HORARIO_FILE = path.join(DATA_DIR, "horario.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// Ensure directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(SHEETS_DIR, { recursive: true });
if (!fs.existsSync(FOLDERS_FILE)) {
  fs.writeFileSync(FOLDERS_FILE, JSON.stringify({ folders: [] }));
}
if (!fs.existsSync(HORARIO_FILE)) {
  fs.writeFileSync(HORARIO_FILE, JSON.stringify({ schedule: {} }));
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = path.join(PUBLIC_DIR, filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function sheetPath(id) {
  // Sanitize id to prevent directory traversal
  const safeId = id.replace(/[^a-z0-9]/g, "");
  return path.join(SHEETS_DIR, safeId + ".json");
}

function getAllSheets() {
  const files = fs.readdirSync(SHEETS_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const data = readJSON(path.join(SHEETS_DIR, f));
    return data;
  }).filter(Boolean);
}

// Parse URL: /api/folders/abc123/sheets -> ["folders", "abc123", "sheets"]
function parseRoute(url) {
  const clean = url.replace(/^\/api\//, "").replace(/\?.*$/, "");
  return clean.split("/").filter(Boolean);
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (url.startsWith("/api/")) {
    const parts = parseRoute(url);
    try {
      // === FOLDERS ===

      // GET /api/folders
      if (method === "GET" && parts[0] === "folders" && parts.length === 1) {
        const data = readJSON(FOLDERS_FILE) || { folders: [] };
        return sendJSON(res, 200, data);
      }

      // POST /api/folders
      if (method === "POST" && parts[0] === "folders" && parts.length === 1) {
        const body = await parseBody(req);
        if (!body.name || !body.name.trim()) {
          return sendJSON(res, 400, { error: "Nombre vacío" });
        }
        const data = readJSON(FOLDERS_FILE) || { folders: [] };
        const folder = { id: generateId(), name: body.name.trim(), icon: body.icon || "folder", createdAt: new Date().toISOString() };
        data.folders.push(folder);
        writeJSON(FOLDERS_FILE, data);
        return sendJSON(res, 200, { ok: true, folder });
      }

      // PUT /api/folders/:id
      if (method === "PUT" && parts[0] === "folders" && parts.length === 2) {
        const body = await parseBody(req);
        const data = readJSON(FOLDERS_FILE) || { folders: [] };
        const folder = data.folders.find((f) => f.id === parts[1]);
        if (!folder) return sendJSON(res, 404, { error: "Carpeta no encontrada" });
        if (body.name) folder.name = body.name.trim();
        if (body.icon) folder.icon = body.icon;
        writeJSON(FOLDERS_FILE, data);
        return sendJSON(res, 200, { ok: true, folder });
      }

      // DELETE /api/folders/:id
      if (method === "DELETE" && parts[0] === "folders" && parts.length === 2) {
        const folderId = parts[1];
        const data = readJSON(FOLDERS_FILE) || { folders: [] };
        data.folders = data.folders.filter((f) => f.id !== folderId);
        writeJSON(FOLDERS_FILE, data);
        // Delete all sheets in this folder
        const sheets = getAllSheets().filter((s) => s.folderId === folderId);
        sheets.forEach((s) => {
          try { fs.unlinkSync(sheetPath(s.id)); } catch {}
        });
        return sendJSON(res, 200, { ok: true });
      }

      // === SHEETS ===

      // GET /api/folders/:folderId/sheets
      if (method === "GET" && parts[0] === "folders" && parts[2] === "sheets" && parts.length === 3) {
        const folderId = parts[1];
        const sheets = getAllSheets()
          .filter((s) => s.folderId === folderId)
          .map((s) => ({ id: s.id, title: s.title, lastSaved: s.lastSaved, createdAt: s.createdAt }));
        return sendJSON(res, 200, { sheets });
      }

      // POST /api/sheets
      if (method === "POST" && parts[0] === "sheets" && parts.length === 1) {
        const body = await parseBody(req);
        if (!body.folderId) return sendJSON(res, 400, { error: "folderId requerido" });
        const sheet = {
          id: generateId(),
          folderId: body.folderId,
          title: body.title || "Sin título",
          text: "",
          sidebarNotes: [],
          lastSaved: null,
          createdAt: new Date().toISOString(),
        };
        writeJSON(sheetPath(sheet.id), sheet);
        return sendJSON(res, 200, { ok: true, sheet });
      }

      // GET /api/sheets/:id
      if (method === "GET" && parts[0] === "sheets" && parts.length === 2) {
        const sheet = readJSON(sheetPath(parts[1]));
        if (!sheet) return sendJSON(res, 404, { error: "Hoja no encontrada" });
        return sendJSON(res, 200, sheet);
      }

      // POST /api/sheets/:id (save title + text)
      if (method === "POST" && parts[0] === "sheets" && parts.length === 2) {
        const sheet = readJSON(sheetPath(parts[1]));
        if (!sheet) return sendJSON(res, 404, { error: "Hoja no encontrada" });
        const body = await parseBody(req);
        sheet.title = body.title ?? sheet.title;
        sheet.text = body.text ?? sheet.text;
        sheet.lastSaved = new Date().toISOString();
        writeJSON(sheetPath(sheet.id), sheet);
        return sendJSON(res, 200, { ok: true, lastSaved: sheet.lastSaved });
      }

      // DELETE /api/sheets/:id
      if (method === "DELETE" && parts[0] === "sheets" && parts.length === 2) {
        try { fs.unlinkSync(sheetPath(parts[1])); } catch {}
        return sendJSON(res, 200, { ok: true });
      }

      // POST /api/sheets/:id/sidebar (add sidebar note)
      if (method === "POST" && parts[0] === "sheets" && parts[2] === "sidebar" && parts.length === 3) {
        const sheet = readJSON(sheetPath(parts[1]));
        if (!sheet) return sendJSON(res, 404, { error: "Hoja no encontrada" });
        const body = await parseBody(req);
        if (!body.text || !body.text.trim()) return sendJSON(res, 400, { error: "Texto vacío" });
        const note = { id: generateId(), text: body.text.trim(), createdAt: new Date().toISOString() };
        sheet.sidebarNotes.push(note);
        writeJSON(sheetPath(sheet.id), sheet);
        return sendJSON(res, 200, { ok: true, note });
      }

      // DELETE /api/sheets/:id/sidebar/:noteId
      if (method === "DELETE" && parts[0] === "sheets" && parts[2] === "sidebar" && parts.length === 4) {
        const sheet = readJSON(sheetPath(parts[1]));
        if (!sheet) return sendJSON(res, 404, { error: "Hoja no encontrada" });
        sheet.sidebarNotes = sheet.sidebarNotes.filter((n) => n.id !== parts[3]);
        writeJSON(sheetPath(sheet.id), sheet);
        return sendJSON(res, 200, { ok: true });
      }

      // === HORARIO ===

      // GET /api/horario
      if (method === "GET" && parts[0] === "horario" && parts.length === 1) {
        const data = readJSON(HORARIO_FILE) || { schedule: {} };
        return sendJSON(res, 200, data);
      }

      // PUT /api/horario
      if (method === "PUT" && parts[0] === "horario" && parts.length === 1) {
        const body = await parseBody(req);
        if (body.entries && Array.isArray(body.entries)) {
          writeJSON(HORARIO_FILE, { entries: body.entries });
          return sendJSON(res, 200, { ok: true });
        }
        if (body.schedule && typeof body.schedule === "object") {
          writeJSON(HORARIO_FILE, { schedule: body.schedule });
          return sendJSON(res, 200, { ok: true });
        }
        return sendJSON(res, 400, { error: "entries o schedule requerido" });
      }

      return sendJSON(res, 404, { error: "Ruta no encontrada" });
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
