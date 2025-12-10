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

    // Load posts from LocalStorage
    let posts = JSON.parse(localStorage.getItem('kayla_blog_posts')) || [];

    // Helper to save to LocalStorage
    function savePosts() {
        try {
            localStorage.setItem('kayla_blog_posts', JSON.stringify(posts));
        } catch (e) {
            alert('Gagal menyimpan! Penyimpanan browser penuh. Hapus beberapa postingan lama atau gunakan gambar yang lebih kecil.');
            console.error(e);
        }
        if (typeof renderPosts === 'function') renderPosts();
    }

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
            posts.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(post => {
                const article = document.createElement('article');
                article.className = 'blog-post';

                const imageHtml = post.image ? `<img src="${post.image}" alt="${post.title}">` : '';

                article.innerHTML = `
                    ${imageHtml}
                    <div class="blog-content">
                        <div class="blog-date">${new Date(post.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <h3><a href="post.html?id=${post.id}" style="text-decoration: none; color: inherit;">${post.title}</a></h3>
                        <p>${post.content.substring(0, 150)}...</p>
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
                const excerpt = post.content.length > 80 ? post.content.substring(0, 80) + '...' : post.content;
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

            // Format content with paragraphs if they contain newlines
            const formattedContent = post.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');

            postDetail.innerHTML = `
                ${post.image ? `<img src="${post.image}" alt="${post.title}" style="width:100%; max-height: 500px; object-fit: cover; border-radius: 8px; margin-bottom: 1.5rem;">` : ''}
                <div style="color: #d32f2f; font-weight: 600; margin-bottom: 0.5rem;">Admin / ${dateStr}</div>
                <h1 style="font-size: 2.5rem; color: #d32f2f; margin-bottom: 1.5rem; line-height: 1.2;">${post.title}</h1>
                <div class="post-body" style="font-size: 1.1rem; line-height: 1.8;">
                    ${formattedContent}
                </div>
            `;
        } else {
            postDetail.innerHTML = '<p>Postingan tidak ditemukan.</p>';
        }
    }

    // Add or Update Post (Only if form exists)
    if (blogForm) {
        blogForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const id = document.getElementById('postId').value;
            const title = document.getElementById('title').value;
            const image = document.getElementById('imageData').value; // Get from hidden field
            const content = document.getElementById('content').value;

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

            savePosts();
            renderPosts();
            blogForm.reset();
            document.getElementById('postId').value = '';
            document.getElementById('imageData').value = ''; // Reset hidden field
            showPreview(''); // Clear preview
            cancelEditBtn.style.display = 'none';
            document.querySelector('button[type="submit"]').textContent = 'Simpan Postingan';
            alert('Postingan berhasil disimpan!');
        });

        // Cancel Edit
        cancelEditBtn.addEventListener('click', () => {
            blogForm.reset();
            document.getElementById('postId').value = '';
            document.getElementById('imageData').value = '';
            showPreview('');
            cancelEditBtn.style.display = 'none';
            document.querySelector('button[type="submit"]').textContent = 'Simpan Postingan';
        });
    }

    // Global helper functions
    window.deletePost = (id) => {
        if (confirm('Yakin ingin menghapus postingan ini?')) {
            posts = posts.filter(p => p.id !== id);
            savePosts();
            renderPosts();
        }
    };

    window.editPost = (id) => {
        const post = posts.find(p => p.id === id);
        if (post) {
            document.getElementById('postId').value = post.id;
            document.getElementById('title').value = post.title;
            document.getElementById('imageData').value = post.image; // Set hidden field
            document.getElementById('content').value = post.content;

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
