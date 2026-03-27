const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const isImage = (filename) => {
    const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
    return exts.includes(path.extname(filename).toLowerCase());
};

const isVideo = (filename) => {
    const exts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    return exts.includes(path.extname(filename).toLowerCase());
};

// Fast exact duplicate finder using File Sizes first, then MD5 Hashing
function findDuplicates(filesList) {
    const sizeGroups = {};
    const duplicates = [];
    const uniques = [];

    // Group by exact byte size first (lightning fast)
    filesList.forEach(f => {
        if(!sizeGroups[f.exactBytes]) sizeGroups[f.exactBytes] = [];
        sizeGroups[f.exactBytes].push(f);
    });

    Object.values(sizeGroups).forEach(group => {
        if (group.length === 1) {
            uniques.push(group[0]);
        } else {
            // Potential duplicates because sizes match perfectly! Let's hash them to be 100% sure.
            const hashGroups = {};
            group.forEach(fileObj => {
                const buffer = fs.readFileSync(fileObj.path);
                const hash = crypto.createHash('md5').update(buffer).digest('hex');
                if(!hashGroups[hash]) hashGroups[hash] = [];
                hashGroups[hash].push(fileObj);
            });
            
            Object.values(hashGroups).forEach(hashGroup => {
                if (hashGroup.length > 1) {
                    duplicates.push(...hashGroup);
                } else {
                    uniques.push(hashGroup[0]);
                }
            });
        }
    });

    return { duplicates, uniques };
}

app.get('/api/scan/all', (req, res) => {
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    let allPhotos = [];
    let videos = [];
    let idCounter = 1;

    try {
        const files = fs.readdirSync(downloadsDir);
        for (const file of files) {
            const fullPath = path.join(downloadsDir, file);
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    const sizeMB = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
                    const fileObj = {
                        id: idCounter++,
                        name: file,
                        path: fullPath,
                        url: `http://localhost:${PORT}/api/file?filepath=${encodeURIComponent(fullPath)}`,
                        size: sizeMB,
                        exactBytes: stats.size,
                        selected: false
                    };

                    if (isImage(file)) {
                        allPhotos.push(fileObj);
                    } else if (isVideo(file)) {
                        fileObj.compressed = false;
                        videos.push(fileObj);
                    }
                }
            } catch (e) {}
        }
        
        // Analyze Photos for strict duplicates
        const { duplicates, uniques } = findDuplicates(allPhotos);
        
        // For development/demo: if no duplicates found, just show all photos so the user sees their gallery.
        // But if duplicates ARE found, prioritize showing them first!
        let finalPhotosToShow = duplicates.length > 0 ? duplicates : allPhotos;

        // Sort videos by largest file size
        videos.sort((a,b) => b.size - a.size);

        res.json({ success: true, photos: finalPhotosToShow, duplicateCount: duplicates.length, videos });
    } catch (err) {
        console.error("Error scanning:", err);
        res.status(500).json({ success: false, error: "Scan Failed" });
    }
});

// Serve the actual file to the frontend securely
app.get('/api/file', (req, res) => {
    const filepath = req.query.filepath;
    if (!filepath || !filepath.startsWith(os.homedir())) {
        return res.status(403).send("Forbidden file access");
    }
    res.sendFile(filepath);
});

// Delete files
app.post('/api/delete/files', (req, res) => {
    const { filesToDelete } = req.body;
    if (!filesToDelete || !Array.isArray(filesToDelete)) return res.status(400).json({ success: false });

    let deletedCount = 0;
    filesToDelete.forEach(filePath => {
        try {
            if (filePath.startsWith(os.homedir()) && fs.existsSync(filePath)) {
                console.log(`[SIMULATED DELETE] ${filePath}`);
                // uncomment below to actually delete
                // fs.unlinkSync(filePath); 
                deletedCount++;
            }
        } catch (e) {}
    });
    res.json({ success: true, deletedCount });
});

app.listen(PORT, () => {
    console.log(`Monstah Cleaner API listening at http://localhost:${PORT}`);
});
