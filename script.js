document.addEventListener('DOMContentLoaded', () => {
    const blogForm = document.getElementById('blogForm');
    const blogList = document.getElementById('blogList'); // On blog.html
    const homepageBlogList = document.getElementById('homepageBlogList'); // On index.html
    const postDetail = document.getElementById('postDetail'); // On post.html
    const breadcrumbTitle = document.getElementById('breadcrumbTitle');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const imageInput = document.getElementById('imageInput');
    const imageData = document.getElementById('imageData');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImage');
    const contentEditor = document.getElementById('contentEditor');

    // Handle Paste in Content Editor (Images)
    if (contentEditor) {
        contentEditor.addEventListener('paste', function (e) {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            let blob = null;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") === 0) {
                    blob = items[i].getAsFile();
                    break;
                }
            }

            if (blob) {
                e.preventDefault(); // Prevent default paste behavior
                if (blob.size > 1000000) { // Limit paste size (e.g., 1MB)
                    alert('Gambar yang dipaste terlalu besar (Maks 1MB).');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (event) {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    // Insert at cursor
                    const selection = window.getSelection();
                    if (!selection.rangeCount) return;
                    selection.deleteFromDocument();
                    selection.getRangeAt(0).insertNode(img);
                    // Move cursor after image
                    const range = document.createRange();
                    range.setStartAfter(img);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                };
                reader.readAsDataURL(blob);
            }
        });
    }

    // --- KONFIGURASI UNTUK PENGUNJUNG ---
    const GLOBAL_BIN_ID = '693a8ecbae596e708f92409e';
    // ------------------------------------

    // Cloud Settings Elements
    const binIdInput = document.getElementById('binId');
    const apiKeyInput = document.getElementById('apiKey');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const connectionStatus = document.getElementById('connectionStatus');

    // Load settings from LocalStorage OR use Global ID
    // Admin prefers LocalStorage key (if editing), Visitor uses Global ID
    let binId = localStorage.getItem('kayla_bin_id') || GLOBAL_BIN_ID;
    let apiKey = localStorage.getItem('kayla_api_key') || '';

    if (binIdInput) binIdInput.value = binId;
    if (apiKeyInput) apiKeyInput.value = apiKey;

    // Load posts from LocalStorage initially
    let posts = JSON.parse(localStorage.getItem('kayla_blog_posts')) || [];

    // --- Cloud Sync Logic ---
    async function syncFromCloud() {
        if (!binId) {
            console.log("Belum ada Bin ID. Berjalan offline.");
            return;
        }

        if (connectionStatus) {
            connectionStatus.textContent = 'Memuat dari cloud...';
            connectionStatus.style.color = 'blue';
        }

        try {
            // Setup headers: Only add Master Key if we have it (Admin)
            // Visitors (no key) depend on the Bin being "Public" in JSONBin settings
            const headers = {};
            if (apiKey) {
                headers['X-Master-Key'] = apiKey;
            }

            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                posts = data.record; // Update local posts variable

                // Save to local storage as backup
                try {
                    localStorage.setItem('kayla_blog_posts', JSON.stringify(posts));
                } catch (e) { console.error("Local storage full", e); }

                if (typeof renderPosts === 'function') renderPosts();

                if (connectionStatus) {
                    connectionStatus.textContent = '✅ Terhubung & Sinkron';
                    connectionStatus.style.color = 'green';
                }
            } else {
                throw new Error('Gagal memuat (Cek Privasi Bin/ID): ' + response.status);
            }
        } catch (error) {
            console.error("Cloud Sync Error:", error);
            if (connectionStatus) {
                connectionStatus.textContent = '❌ Gagal koneksi (Cek ID atau set Public)';
                connectionStatus.style.color = 'red';
            }
        }
    }

    async function syncToCloud() {
        if (!binId || !apiKey) return false; // Offline mode (need API key to write)

        try {
            if (connectionStatus) connectionStatus.textContent = 'Menyimpan ke cloud...';

            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': apiKey
                },
                body: JSON.stringify(posts)
            });

            if (response.ok) {
                if (connectionStatus) {
                    connectionStatus.textContent = '✅ Data tersimpan di Cloud!';
                    connectionStatus.style.color = 'green';
                }
                return true;
            } else {
                throw new Error('Gagal upload: ' + response.status);
            }
        } catch (error) {
            console.error("Cloud Upload Error:", error);
            alert("Gagal menyimpan ke Cloud! Pastikan internet lancar dan ID/Key benar. Data tersimpan di HP ini saja.");
            return false;
        }
    }

    // Save Settings Handler
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            binId = binIdInput.value.trim();
            apiKey = apiKeyInput.value.trim();

            localStorage.setItem('kayla_bin_id', binId);
            localStorage.setItem('kayla_api_key', apiKey);

            syncFromCloud(); // Try to connect immediately
        });
    }

    // Helper to save to LocalStorage AND Cloud
    async function savePosts() {
        // Save local first (fast)
        try {
            localStorage.setItem('kayla_blog_posts', JSON.stringify(posts));
        } catch (e) {
            console.error('Penyimpanan browser penuh!');
        }

        // Then try cloud
        await syncToCloud();

        if (typeof renderPosts === 'function') renderPosts();
    }

    // Initial Sync on Load (if keys exist)
    if (binId) {
        syncFromCloud();
    }

    // --- End Cloud Sync Logic ---

    // Helper to show image preview
    function showPreview(src) {
        if (imagePreview && src) {
            imagePreview.style.display = 'block';
            imagePreview.querySelector('img').src = src;
        } else if (imagePreview) {
            imagePreview.style.display = 'none';
            imagePreview.querySelector('img').src = '';
        }
    }

    // Handle File Input
    if (imageInput) {
        imageInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 500000) { // 500KB limit
                    alert('Ukuran file terlalu besar! Maksimal 500KB.');
                    this.value = ''; // Reset input
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (event) {
                    imageData.value = event.target.result;
                    showPreview(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle Remove Image
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            imageData.value = '';
            imageInput.value = '';
            showPreview('');
        });
    }

    // Render posts
    function renderPosts() {
        // Render for Blog Page (Admin List)
        if (blogList) {
            blogList.innerHTML = '';
            if (posts.length === 0) {
                blogList.innerHTML = '<p>Belum ada postingan.</p>';
            }
            posts.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(post => {
                const article = document.createElement('article');
                article.className = 'blog-post';

                const imageHtml = post.image ? `<img src="${post.image}" alt="${post.title}">` : '';

                article.innerHTML = `
                    ${imageHtml}
                    <div class="blog-content">
                        <div class="blog-date">${new Date(post.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <h3><a href="post.html?id=${post.id}" style="text-decoration: none; color: inherit;">${post.title}</a></h3>
                        <p>${post.content.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                        <div class="post-actions">
                             <a href="post.html?id=${post.id}" class="btn" style="background-color: transparent; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 0.25rem 0.5rem; margin-right: auto;">Baca Selengkapnya</a>
                            <button class="btn-edit" onclick="editPost(${post.id})">Edit</button>
                            <button class="btn-delete" onclick="deletePost(${post.id})">Hapus</button>
                        </div>
                    </div>
                `;
                blogList.appendChild(article);
            });
        }

        // Render for Homepage (Preview)
        if (homepageBlogList) {
            homepageBlogList.innerHTML = '';
            // Show only top 3 recent posts
            const recentPosts = posts.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

            if (recentPosts.length === 0) {
                homepageBlogList.innerHTML = '<p style="text-align:center; width:100%;">Belum ada berita terbaru.</p>';
            }

            recentPosts.forEach(post => {
                const card = document.createElement('div');
                card.className = 'menu-card blog-card-link';
                card.onclick = () => window.location.href = `post.html?id=${post.id}`;
                card.style.cursor = 'pointer';

                // Use a default placeholder if no image
                const imageSrc = post.image ? post.image : 'bakso.png';

                // Truncate content
                // Strip HTML tags for cleaned excerpt
                const cleanContent = post.content.replace(/<[^>]*>/g, '');
                const excerpt = cleanContent.length > 80 ? cleanContent.substring(0, 80) + '...' : cleanContent;
                const dateStr = new Date(post.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                card.innerHTML = `
                    <div style="height: 200px; overflow: hidden;">
                        <img src="${imageSrc}" alt="${post.title}" style="height: 100%; width: 100%; object-fit: cover;">
                    </div>
                    <div class="menu-info" style="text-align: left;">
                        <h3>${post.title}</h3>
                        <p style="margin-bottom: 1rem;">${excerpt}</p>
                        <div style="font-size: 0.85rem; color: #d32f2f; font-weight: 600;">${dateStr}</div>
                    </div>
                `;
                homepageBlogList.appendChild(card);
            });
        }
    }

    // Render Single Post Logic
    if (postDetail) {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');
        const post = posts.find(p => p.id == postId);

        if (post) {
            breadcrumbTitle.textContent = post.title;
            const dateStr = new Date(post.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            postDetail.innerHTML = `
                ${post.image ? `<img src="${post.image}" alt="${post.title}" style="width:100%; max-height: 500px; object-fit: cover; border-radius: 8px; margin-bottom: 1.5rem;">` : ''}
                <div style="color: #d32f2f; font-weight: 600; margin-bottom: 0.5rem;">Admin / ${dateStr}</div>
                <h1 style="font-size: 2.5rem; color: #d32f2f; margin-bottom: 1.5rem; line-height: 1.2;">${post.title}</h1>
                <div class="post-body" style="font-size: 1.1rem; line-height: 1.8;">
                    ${post.content}
                </div>
            `;
        } else {
            postDetail.innerHTML = '<p>Postingan tidak ditemukan.</p>';
        }
    }

    // Add or Update Post (Only if form exists)
    if (blogForm) {
        blogForm.addEventListener('submit', async (e) => { // Async handler
            e.preventDefault();

            const id = document.getElementById('postId').value;
            const title = document.getElementById('title').value;
            const image = document.getElementById('imageData').value; // Get from hidden field
            const content = document.getElementById('contentEditor').innerHTML;

            // Validation
            if (!title || !content) {
                alert("Judul dan konten wajib diisi");
                return;
            }

            if (id) {
                // Update existing
                const index = posts.findIndex(p => p.id == id);
                if (index !== -1) {
                    posts[index] = { ...posts[index], title, image, content, date: new Date().toISOString() };
                }
            } else {
                // Create new
                const newPost = {
                    id: Date.now(),
                    title,
                    image,
                    content,
                    date: new Date().toISOString()
                };
                posts.push(newPost);
            }

            // Save settings locally just in case
            savePosts(); // This calls syncToCloud internally

            blogForm.reset();
            document.getElementById('postId').value = '';
            document.getElementById('imageData').value = '';
            if (document.getElementById('contentEditor')) document.getElementById('contentEditor').innerHTML = '';
            showPreview('');
            cancelEditBtn.style.display = 'none';
            document.querySelector('button[type="submit"]').textContent = 'Simpan Postingan';
            // Alert handled in syncToCloud or savePosts
        });

        // Cancel Edit
        cancelEditBtn.addEventListener('click', () => {
            blogForm.reset();
            document.getElementById('postId').value = '';
            document.getElementById('imageData').value = '';
            if (document.getElementById('contentEditor')) document.getElementById('contentEditor').innerHTML = '';
            showPreview('');
            cancelEditBtn.style.display = 'none';
            document.querySelector('button[type="submit"]').textContent = 'Simpan Postingan';
        });
    }

    // Global helper functions
    window.deletePost = async (id) => {
        if (confirm('Yakin ingin menghapus postingan ini?')) {
            posts = posts.filter(p => p.id !== id);
            await savePosts();
        }
    };

    window.editPost = (id) => {
        const post = posts.find(p => p.id === id);
        if (post) {
            document.getElementById('postId').value = post.id;
            document.getElementById('title').value = post.title;
            document.getElementById('imageData').value = post.image; // Set hidden field
            if (document.getElementById('contentEditor')) {
                document.getElementById('contentEditor').innerHTML = post.content;
            }

            showPreview(post.image); // Show existing image

            cancelEditBtn.style.display = 'inline-block';
            document.querySelector('button[type="submit"]').textContent = 'Update Postingan';

            // Scroll to form
            document.querySelector('.admin-panel').scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Initial render
    renderPosts();
});
