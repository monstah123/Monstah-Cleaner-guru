document.addEventListener('DOMContentLoaded', () => {
    // --- State & App Data ---
    const appState = {
        storageTotal: 128,
        storageUsed: 96,
        isScanning: false,
        scanned: false,
        photos: [],
        videos: [],
        contacts: [
            { id: 1, name: "John Doe", detail: "3 identical numbers", type: "duplicate" },
            { id: 2, name: "Sarah Smith", detail: "2 identical emails", type: "duplicate" },
            { id: 3, name: "Mike", detail: "No phone number", type: "incomplete" }
        ]
    };

    // --- DOM Elements ---
    const screens = document.querySelectorAll('.screen');
    const featureCards = document.querySelectorAll('.feature-card');
    const backBtns = document.querySelectorAll('.back-btn');
    const bottomNavItems = document.querySelectorAll('.nav-item');
    
    // Dashboard Elements
    const storageCircle = document.getElementById('storage-circle');
    const storageUsedText = document.getElementById('storage-used-text');
    const statusHeadline = document.getElementById('status-headline');
    const btnSmartClean = document.getElementById('btn-smart-clean');
    
    // Stats Elements
    const statsPhotos = document.getElementById('stats-photos');
    const statsVideos = document.getElementById('stats-videos');
    const statsContacts = document.getElementById('stats-contacts');
    const statsLargeFiles = document.getElementById('stats-largefiles');

    // Scanning Elements
    const screenScanning = document.getElementById('screen-scanning');
    const scanProgressBar = document.getElementById('scan-progress-bar');
    const scanningTitle = document.getElementById('scanning-title');
    const scanningSubtitle = document.getElementById('scanning-subtitle');

    // Photos Elements
    const photosSwipeArea = document.getElementById('photos-swipe-area');
    const photosActionBar = document.getElementById('photos-action-bar');
    const photosSelectedCount = document.getElementById('photos-selected-count');
    const photosSelectedSize = document.getElementById('photos-selected-size');
    const photosSelectAll = document.getElementById('photos-select-all');
    const photosDeleteBtn = document.getElementById('photos-delete-btn');

    // List Elements
    const videosList = document.getElementById('videos-list');
    const contactsList = document.getElementById('contacts-list');
    const contactsMergeBtn = document.getElementById('contacts-merge-btn');


    // --- Navigation ---
    function navigateTo(screenId) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        
        if(screenId === 'screen-photos') renderPhotos();
        if(screenId === 'screen-videos') renderVideos();
        if(screenId === 'screen-contacts') renderContacts();
    }

    featureCards.forEach(card => {
        card.addEventListener('click', () => {
             const target = card.getAttribute('data-target');
             if(target) navigateTo(target);
        });
    });

    backBtns.forEach(btn => {
        btn.addEventListener('click', () => navigateTo('screen-dashboard'));
    });

    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            bottomNavItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            navigateTo('screen-dashboard'); // Simplified for demo
        });
    });


    // --- Dashboard logic ---
    function updateStorageUI() {
        storageUsedText.textContent = `${appState.storageUsed} GB`;
        const percentage = (appState.storageUsed / appState.storageTotal) * 100;
        storageCircle.setAttribute('stroke-dasharray', `${percentage}, 100`);
        
        if(appState.scanned) {
            statusHeadline.textContent = "Device Optimized";
            statusHeadline.style.color = "var(--accent-green)";
            storageCircle.style.stroke = "var(--accent-green)";
            btnSmartClean.style.display = "none";
        }
    }

    // --- Smart Clean (Scanning) ---
    btnSmartClean.addEventListener('click', async () => {
        screenScanning.classList.add('active');
        appState.isScanning = true;

        try {
            const res = await fetch('http://localhost:3000/api/scan/all');
            const data = await res.json();
            if(data.success) {
                appState.photos = data.photos || [];
                appState.videos = data.videos || [];
                appState.duplicateCount = data.duplicateCount || 0;
            }
        } catch(e) { console.error("Could not reach Node API", e); }
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if(progress > 100) progress = 100;
            scanProgressBar.style.width = `${progress}%`;
            
            if(progress < 30) scanningSubtitle.textContent = "Analyzing Photo Library...";
            else if(progress < 60) scanningSubtitle.textContent = "Finding Duplicate Contacts...";
            else if(progress < 90) scanningSubtitle.textContent = "Scanning Large Files...";
            else scanningSubtitle.textContent = "Finalizing Report...";

            if(progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    screenScanning.classList.remove('active');
                    appState.isScanning = false;
                    appState.scanned = true;
                    
                    // Update stats
                    const duplicateLabel = appState.duplicateCount > 0 ? `${appState.duplicateCount} STRICT Dups!` : `${appState.photos.length} Photos`;
                    statsPhotos.textContent = duplicateLabel;
                    statsPhotos.style.color = "var(--accent-red)";
                    statsVideos.textContent = `${appState.videos.length} Massive videos`;
                    statsVideos.style.color = "var(--accent-red)";
                    statsContacts.textContent = "16 Issues found";
                    statsContacts.style.color = "var(--accent-red)";
                    statsLargeFiles.textContent = "4.2 GB Removable";
                    statsLargeFiles.style.color = "var(--accent-red)";

                    statusHeadline.textContent = "Cleanup Required";
                    statusHeadline.style.color = "var(--accent-red)";
                    btnSmartClean.innerHTML = "View Results";
                    btnSmartClean.classList.remove('pulse-anim');

                }, 500);
            }
        }, 300);
    });

    // --- Photos Logic ---
    function renderPhotos() {
        photosSwipeArea.innerHTML = '';
        appState.photos.forEach(photo => {
            const div = document.createElement('div');
            div.className = `photo-item ${photo.selected ? 'selected' : ''}`;
            div.style.backgroundImage = `url(${photo.url})`;
            div.innerHTML = `
                <div class="photo-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            `;
            div.addEventListener('click', () => {
                photo.selected = !photo.selected;
                renderPhotos();
                updatePhotosActionBar();
            });
            photosSwipeArea.appendChild(div);
        });
        updatePhotosActionBar();
    }

    function updatePhotosActionBar() {
        const selected = appState.photos.filter(p => p.selected);
        if(selected.length > 0) {
            photosActionBar.classList.remove('hidden');
            setTimeout(() => photosActionBar.classList.add('visible'), 10);
            const totalSize = selected.reduce((s, p) => s + p.size, 0);
            photosSelectedCount.textContent = `${selected.length} Selected`;
            photosSelectedSize.textContent = `${totalSize} MB`;
        } else {
            photosActionBar.classList.remove('visible');
            setTimeout(() => photosActionBar.classList.add('hidden'), 300);
        }
    }

    photosSelectAll.addEventListener('click', () => {
        const allSelected = appState.photos.every(p => p.selected);
        appState.photos.forEach(p => p.selected = !allSelected);
        renderPhotos();
    });

    photosDeleteBtn.addEventListener('click', async () => {
        const selectedPhotos = appState.photos.filter(p => p.selected);
        const selectedSize = selectedPhotos.reduce((s, p) => s + p.size, 0);
        
        if (selectedPhotos.length > 0) {
            photosDeleteBtn.textContent = 'Deleting...';
            try {
                const paths = selectedPhotos.map(p => p.path);
                await fetch('http://localhost:3000/api/delete/files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filesToDelete: paths })
                });
            } catch(e) {}
            photosDeleteBtn.textContent = 'Delete';
        }

        appState.photos = appState.photos.filter(p => !p.selected);
        
        // Mock cleanup
        appState.storageUsed -= (selectedSize / 1000); // MB to GB rough conversion
        statsPhotos.textContent = "Clean";
        statsPhotos.style.color = "var(--accent-green)";
        
        updateStorageUI();
        navigateTo('screen-dashboard');
        
        // Reset action bar
        photosActionBar.classList.remove('visible');
        setTimeout(() => photosActionBar.classList.add('hidden'), 300);
    });

    // --- Video Logic ---
    function renderVideos() {
        videosList.innerHTML = '';
        appState.videos.forEach(v => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div class="item-icon" style="color: var(--accent-purple)"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg></div>
                <div class="item-details">
                    <h4>${v.name}</h4>
                    <p>${v.compressed ? 'Compressed' : `${v.size} MB`}</p>
                </div>
                ${!v.compressed ? `<button class="item-action" data-id="${v.id}">Compress</button>` : `<span style="color:var(--accent-green); font-size:12px;">Saved ${Math.floor(v.size*0.6)}MB</span>`}
            `;
            videosList.appendChild(div);
        });

        // Add Listeners
        videosList.querySelectorAll('.item-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const vid = appState.videos.find(v => v.id === id);
                if(vid) {
                    btn.innerHTML = "Compressing...";
                    setTimeout(() => {
                        vid.compressed = true;
                        appState.storageUsed -= (vid.size * 0.6 / 1000);
                        renderVideos();
                        updateStorageUI();
                        statsVideos.textContent = "Optimized";
                        statsVideos.style.color = "var(--accent-green)";
                    }, 1000);
                }
            });
        });
    }

    // --- Contacts Logic ---
    function renderContacts() {
        contactsList.innerHTML = '';
        if(appState.contacts.length === 0) {
            contactsList.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top: 24px;">All contacts are organized.</p>';
            contactsMergeBtn.style.display = 'none';
            return;
        }

        appState.contacts.forEach(c => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div class="item-icon">${c.name.charAt(0)}</div>
                <div class="item-details">
                    <h4>${c.name}</h4>
                    <p style="color: var(--accent-${c.type === 'duplicate' ? 'orange' : 'red'})">${c.detail}</p>
                </div>
                <button class="item-action" data-id="${c.id}">${c.type === 'duplicate' ? 'Merge' : 'Fix'}</button>
            `;
            contactsList.appendChild(div);
        });

        contactsList.querySelectorAll('.item-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                appState.contacts = appState.contacts.filter(c => c.id !== id);
                renderContacts();
                if(appState.contacts.length === 0) {
                    statsContacts.textContent = "Organized";
                    statsContacts.style.color = "var(--accent-green)";
                }
            });
        });
    }

    contactsMergeBtn.addEventListener('click', () => {
        contactsMergeBtn.innerHTML = "Merging Setup...";
        setTimeout(() => {
            appState.contacts = [];
            renderContacts();
            statsContacts.textContent = "Organized";
            statsContacts.style.color = "var(--accent-green)";
            navigateTo('screen-dashboard');
        }, 800);
    });

    // Initialize UI
    updateStorageUI();
});
