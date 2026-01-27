const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const mime = require('mime-types');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const STORAGE_ROOT = path.join(__dirname, 'storage');
const TRASH_ROOT = path.join(STORAGE_ROOT, '.nas_trash');
const DATA_FILE = path.join(__dirname, 'nas-metadata.json');

// Ensure necessary directories
fs.ensureDirSync(STORAGE_ROOT);
fs.ensureDirSync(TRASH_ROOT);

// Initialize metadata file if not exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeJsonSync(DATA_FILE, { starred: [], trash: [], shared: {} });
}

app.use(cors());
app.use(express.json());

// Serve the built frontend
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Helper to get safe path
const getSafePath = (reqPath) => {
    const safePath = path.normalize(reqPath || '').replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(STORAGE_ROOT, safePath);
    if (!absolutePath.startsWith(STORAGE_ROOT)) {
        throw new Error('Access denied');
    }
    return absolutePath;
};

// Helper: Metadata Management
const getMetadata = async () => {
    try {
        const data = await fs.readJson(DATA_FILE);
        if (!data.shared) data.shared = {}; // Ensure shared exists
        return data;
    } catch (e) {
        console.error("Metadata read error:", e.message);
        return { starred: [], trash: [], shared: {} };
    }
};

const saveMetadata = async (data) => {
    try {
        await fs.writeJson(DATA_FILE, data, { spaces: 2 });
    } catch (e) {
        console.error("Metadata write error:", e.message);
    }
};

// ... (Existing helper functions like getRecentFilesRecursive) ...
async function getRecentFilesRecursive(dir) {
    let results = [];
    const items = await fs.readdir(dir);
    for (const item of items) {
        if (item.startsWith('.')) continue;
        const fullPath = path.join(dir, item);
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
            const subResults = await getRecentFilesRecursive(fullPath);
            results = results.concat(subResults);
        } else {
            results.push({
                name: item,
                path: path.relative(STORAGE_ROOT, fullPath).replace(/\\/g, '/'),
                size: stats.size,
                mtime: stats.mtime,
                isDirectory: false
            });
        }
    }
    return results;
}

// --------------------------------------------------------------------------
// Endpoints
// --------------------------------------------------------------------------

// List files
app.get('/api/files', async (req, res) => {
    try {
        const dirPath = getSafePath(req.query.path);
        const stats = await fs.stat(dirPath);

        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Not a directory' });
        }

        const items = await fs.readdir(dirPath);
        const contents = await Promise.all(items.filter(i => !i.startsWith('.')).map(async (item) => {
            const itemPath = path.join(dirPath, item);
            const itemStats = await fs.stat(itemPath);
            return {
                name: item,
                isDirectory: itemStats.isDirectory(),
                size: itemStats.size,
                mtime: itemStats.mtime,
                path: path.relative(STORAGE_ROOT, itemPath).replace(/\\/g, '/')
            };
        }));

        res.json({
            path: path.relative(STORAGE_ROOT, dirPath).replace(/\\/g, '/'),
            contents
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/recent', async (req, res) => {
    try {
        const allFiles = await getRecentFilesRecursive(STORAGE_ROOT);
        allFiles.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
        res.json({ contents: allFiles.slice(0, 50) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/starred', async (req, res) => {
    try {
        const meta = await getMetadata();
        const starredPaths = meta.starred || [];
        const distinctPaths = [...new Set(starredPaths)];
        const contents = [];
        for (const p of distinctPaths) {
            try {
                const fullPath = getSafePath(p);
                if (await fs.pathExists(fullPath)) {
                    const stats = await fs.stat(fullPath);
                    contents.push({
                        name: path.basename(fullPath),
                        isDirectory: stats.isDirectory(),
                        size: stats.size,
                        mtime: stats.mtime,
                        path: p
                    });
                }
            } catch (e) { }
        }
        res.json({ contents });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/star', async (req, res) => {
    try {
        const { path: itemPath, starred } = req.body;
        if (!itemPath) return res.status(400).json({ error: 'Path required' });

        const meta = await getMetadata();
        let list = new Set(meta.starred || []);
        if (starred) list.add(itemPath);
        else list.delete(itemPath);

        meta.starred = [...list];
        await saveMetadata(meta);
        res.json({ success: true, starred });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Trash Endpoints
app.get('/api/trash', async (req, res) => {
    try {
        const meta = await getMetadata();
        const trash = meta.trash || [];
        const validTrash = [];
        for (const item of trash) {
            const trashPath = path.join(TRASH_ROOT, item.trashId);
            if (await fs.pathExists(trashPath)) {
                validTrash.push({ ...item, path: item.originalPath });
            }
        }
        res.json({ contents: validTrash });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/delete', async (req, res) => {
    try {
        const targetPath = getSafePath(req.body.path);
        const stats = await fs.stat(targetPath);
        const trashId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const trashPath = path.join(TRASH_ROOT, trashId);

        await fs.move(targetPath, trashPath);

        const meta = await getMetadata();
        if (!meta.trash) meta.trash = [];
        meta.trash.push({
            trashId,
            originalPath: req.body.path,
            originalName: path.basename(targetPath),
            isDirectory: stats.isDirectory(),
            size: stats.size,
            deletedAt: new Date()
        });
        await saveMetadata(meta);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/restore', async (req, res) => {
    try {
        const { trashId } = req.body;
        const meta = await getMetadata();
        const trashIndex = meta.trash.findIndex(t => t.trashId === trashId);
        if (trashIndex === -1) return res.status(404).json({ error: 'Item not found' });

        const item = meta.trash[trashIndex];
        const trashPath = path.join(TRASH_ROOT, trashId);
        const originalFullPath = getSafePath(item.originalPath);

        await fs.ensureDir(path.dirname(originalFullPath));
        if (await fs.pathExists(originalFullPath)) {
            const ext = path.extname(originalFullPath);
            const name = path.basename(originalFullPath, ext);
            const newName = `${name}-restored-${Date.now()}${ext}`;
            await fs.move(trashPath, path.join(path.dirname(originalFullPath), newName));
        } else {
            await fs.move(trashPath, originalFullPath);
        }
        meta.trash.splice(trashIndex, 1);
        await saveMetadata(meta);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/empty-trash', async (req, res) => {
    try {
        await fs.emptyDir(TRASH_ROOT);
        const meta = await getMetadata();
        meta.trash = [];
        await saveMetadata(meta);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Move items
app.post('/api/move', async (req, res) => {
    try {
        const { sources, destination } = req.body;
        const destPathFullPath = getSafePath(destination);
        const destStats = await fs.stat(destPathFullPath);
        if (!destStats.isDirectory()) return res.status(400).json({ error: 'Destination is not a directory' });

        const moves = [];
        const results = await Promise.allSettled(sources.map(async (src) => {
            const srcFullPath = getSafePath(src);
            const fileName = path.basename(srcFullPath);
            const destFullPath = path.join(destPathFullPath, fileName);
            if (destFullPath.startsWith(srcFullPath) && destFullPath !== srcFullPath) throw new Error('Cannot move into self');
            if (await fs.pathExists(destFullPath)) throw new Error('Exists');
            await fs.move(srcFullPath, destFullPath);
            moves.push({ from: src, to: path.join(destination, fileName).replace(/\\/g, '/') });
            return fileName;
        }));

        if (moves.length > 0) {
            const meta = await getMetadata();
            let changed = false;
            if (meta.starred) {
                meta.starred = meta.starred.map(s => {
                    const match = moves.find(m => m.from === s);
                    if (match) { changed = true; return match.to; }
                    return s;
                });
            }
            if (meta.shared) {
                Object.keys(meta.shared).forEach(token => {
                    const share = meta.shared[token];
                    const match = moves.find(m => m.from === share.path);
                    if (match) {
                        share.path = match.to;
                        changed = true;
                    }
                });
            }

            if (changed) await saveMetadata(meta);
        }
        const errors = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
        const success = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        res.json({ success: true, moved: success, errors: errors.length > 0 ? errors : undefined });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/folder', async (req, res) => {
    try {
        const { currentPath, folderName } = req.body;
        const targetPath = path.join(getSafePath(currentPath), folderName || 'New Folder');
        await fs.ensureDir(targetPath);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = STORAGE_ROOT;
        try { if (req.body.path) uploadPath = getSafePath(req.body.path); } catch (e) { }
        fs.ensureDirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });
app.post('/api/upload', upload.array('files'), (req, res) => res.json({ success: true }));

app.get('/api/download', async (req, res) => {
    try {
        const filePath = getSafePath(req.query.path);
        if (await fs.pathExists(filePath)) res.download(filePath);
        else res.status(404).send('File not found');
    } catch (err) { res.status(404).send('File not found'); }
});

app.get('/api/stream', async (req, res) => {
    try {
        const filePath = getSafePath(req.query.path);
        if (await fs.pathExists(filePath)) {
            const mimeType = mime.lookup(filePath) || 'application/octet-stream';
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', 'inline');
            fs.createReadStream(filePath).pipe(res);
        } else res.status(404).send('File not found');
    } catch (err) { res.status(404).send('File not found'); }
});

// --- SHARING ---
app.post('/api/share', async (req, res) => {
    try {
        const { path: itemPath } = req.body;
        console.log("Generating share link for:", itemPath);

        if (!itemPath) return res.status(400).json({ error: 'Path required' });

        // Verify existence
        const fullPath = getSafePath(itemPath);
        if (!await fs.pathExists(fullPath)) {
            console.error("File not found at:", fullPath);
            return res.status(404).json({ error: 'File not found' });
        }

        const token = crypto.randomBytes(16).toString('hex');
        const meta = await getMetadata();

        meta.shared[token] = {
            path: itemPath,
            created: new Date(),
        };
        await saveMetadata(meta);

        // Generate full URL
        const protocol = req.protocol;
        const host = req.get('host');
        // Point to the frontend route /s/:token
        const shareUrl = `${protocol}://${host}/s/${token}`;

        console.log("Share link created:", shareUrl);
        res.json({ success: true, link: shareUrl });
    } catch (err) {
        console.error("Share error:", err);
        res.status(500).json({ error: err.message });
    }
});

// NEW: Info Endpoint for View Page
app.get('/api/share/info/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const meta = await getMetadata();
        if (!meta.shared || !meta.shared[token]) return res.status(404).json({ error: 'Link invalid or expired' });

        const share = meta.shared[token];
        const filePath = getSafePath(share.path);

        if (!await fs.pathExists(filePath)) return res.status(404).json({ error: 'File shared no longer exists' });

        const stats = await fs.stat(filePath);

        res.json({
            name: path.basename(filePath),
            size: stats.size,
            mimeType: mime.lookup(filePath) || 'application/octet-stream',
            created: share.created
        });
    } catch (err) {
        console.error("Share Info Error:", err);
        res.status(500).json({ error: 'Error retrieving info' });
    }
});

// NEW: Download Endpoint
app.get('/api/share/download/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const meta = await getMetadata();

        if (!meta.shared || !meta.shared[token]) return res.status(404).send('Link invalid or expired');

        const share = meta.shared[token];
        const filePath = getSafePath(share.path);

        if (!await fs.pathExists(filePath)) return res.status(404).send('File shared no longer exists');

        // Force download
        res.download(filePath);
    } catch (err) {
        console.error("Share Download Error:", err);
        res.status(500).send('Error downloading file');
    }
});

// ----------------

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`NAS System running at http://localhost:${PORT}`);
});
