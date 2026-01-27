const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const mime = require('mime-types');

const app = express();
const PORT = 3000;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// Ensure storage root exists
fs.ensureDirSync(STORAGE_ROOT);

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

// ... existing routes

// Move items (File/Folder)
app.post('/api/move', async (req, res) => {
    try {
        const { sources, destination } = req.body; // sources is Array of relative paths, destination is relative path

        if (!Array.isArray(sources) || sources.length === 0) {
            return res.status(400).json({ error: 'No items selected' });
        }

        const destPathFullPath = getSafePath(destination);
        // Ensure destination exists and is a directory
        const destStats = await fs.stat(destPathFullPath);
        if (!destStats.isDirectory()) {
            return res.status(400).json({ error: 'Destination is not a directory' });
        }

        const results = await Promise.allSettled(sources.map(async (src) => {
            const srcFullPath = getSafePath(src);
            const fileName = path.basename(srcFullPath);
            const destFullPath = path.join(destPathFullPath, fileName);

            // Prevent moving into itself or subdirectory of itself (simple check)
            if (destFullPath.startsWith(srcFullPath) && destFullPath !== srcFullPath) {
                throw new Error(`Cannot move folder '${fileName}' into itself`);
            }

            // Prevent overwriting
            if (await fs.pathExists(destFullPath)) {
                throw new Error(`Item '${fileName}' already exists in destination`);
            }

            await fs.move(srcFullPath, destFullPath);
            return fileName;
        }));

        const errors = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
        const success = results.filter(r => r.status === 'fulfilled').map(r => r.value);

        if (errors.length > 0 && success.length === 0) {
            return res.status(400).json({ error: errors.join(', ') });
        }

        res.json({ success: true, moved: success, errors: errors.length > 0 ? errors : undefined });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List files
app.get('/api/files', async (req, res) => {
    try {
        const dirPath = getSafePath(req.query.path);
        const stats = await fs.stat(dirPath);

        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Not a directory' });
        }

        const items = await fs.readdir(dirPath);
        const contents = await Promise.all(items.map(async (item) => {
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

// Create folder
app.post('/api/folder', async (req, res) => {
    try {
        const { currentPath, folderName } = req.body;
        const targetPath = path.join(getSafePath(currentPath), folderName || 'New Folder');
        await fs.ensureDir(targetPath);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Important: req.body must come before files in the formData on frontend
        // If not, we fallback to a temp location or root, but frontend fix handles this.
        let uploadPath = STORAGE_ROOT;
        try {
            if (req.body.path) {
                uploadPath = getSafePath(req.body.path);
            }
        } catch (e) {
            console.error("Path error", e);
        }

        fs.ensureDirSync(uploadPath); // Ensure specific directory exists
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// Upload Endpoint
app.post('/api/upload', upload.array('files'), (req, res) => {
    res.json({ success: true, count: req.files.length });
});

// Download (Attachment)
app.get('/api/download', async (req, res) => {
    try {
        const filePath = getSafePath(req.query.path);
        if (await fs.pathExists(filePath)) {
            res.download(filePath);
        } else {
            res.status(404).send('File not found');
        }
    } catch (err) {
        res.status(404).send('File not found');
    }
});

// Stream (Inline View)
app.get('/api/stream', async (req, res) => {
    try {
        const filePath = getSafePath(req.query.path);
        if (await fs.pathExists(filePath)) {
            const mimeType = mime.lookup(filePath) || 'application/octet-stream';
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', 'inline'); // Important for viewing
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.status(404).send('File not found');
        }
    } catch (err) {
        res.status(404).send('File not found');
    }
});

// Delete
app.delete('/api/delete', async (req, res) => {
    try {
        const targetPath = getSafePath(req.body.path);
        await fs.remove(targetPath);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Catch all for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`NAS System running at http://localhost:${PORT}`);
});
