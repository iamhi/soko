document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.querySelector('.file-label span');
    const uploadStatus = document.getElementById('upload-status');
    const uploadBtn = document.getElementById('upload-btn');
    

    // File selection UI update
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileLabel.textContent = e.target.files[0].name;
            fileLabel.style.color = 'var(--primary)';
        } else {
            fileLabel.textContent = 'Choose a Markdown File';
            fileLabel.style.color = 'var(--text-secondary)';
        }
    });

    // Upload Handling
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        uploadBtn.textContent = 'Encrypting & Storing...';
        uploadBtn.disabled = true;
        uploadStatus.className = 'status-msg';
        uploadStatus.textContent = '';

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                uploadStatus.textContent = `Success! Stored as ${data.filename}`;
                uploadStatus.className = 'status-msg status-success';
                uploadForm.reset();
                fileLabel.textContent = 'Choose a Markdown File';
                fileLabel.style.color = 'var(--text-secondary)';
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            uploadStatus.textContent = error.message;
            uploadStatus.className = 'status-msg status-error';
        } finally {
            uploadBtn.textContent = 'Upload to Vault';
            uploadBtn.disabled = false;
        }
    });

    const textForm = document.getElementById('text-form');
    const textFilename = document.getElementById('text-filename');
    const textContent = document.getElementById('text-content');
    const textStatus = document.getElementById('text-status');
    const textBtn = document.getElementById('text-btn');

    // Create from Text Handling
    textForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let filename = textFilename.value.trim();
        if (!filename) {
            filename = crypto.randomUUID() + '.md';
        } else if (!filename.toLowerCase().endsWith('.md')) {
            filename += '.md';
        }
        
        const content = textContent.value;
        const blob = new Blob([content], { type: 'text/markdown' });
        const file = new File([blob], filename, { type: 'text/markdown' });
        
        const formData = new FormData();
        formData.append('file', file);

        textBtn.textContent = 'Storing...';
        textBtn.disabled = true;
        textStatus.className = 'status-msg';
        textStatus.textContent = '';

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                textStatus.textContent = `Success! Stored as ${data.filename}`;
                textStatus.className = 'status-msg status-success';
                textForm.reset();
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            textStatus.textContent = error.message;
            textStatus.className = 'status-msg status-error';
        } finally {
            textBtn.textContent = 'Create & Store';
            textBtn.disabled = false;
        }
    });

    const searchForm = document.getElementById('search-form');
    const searchQuery = document.getElementById('search-query');
    const searchStatus = document.getElementById('search-status');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');

    // Search Handling
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchQuery.value.trim();
        if (!query) return;

        searchBtn.textContent = 'Searching...';
        searchBtn.disabled = true;
        searchStatus.className = 'status-msg';
        searchStatus.textContent = '';
        searchResults.innerHTML = '';

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (response.ok) {
                if (data.results.length === 0) {
                    searchStatus.textContent = 'No results found.';
                    searchStatus.className = 'status-msg';
                } else {
                    data.results.forEach(result => {
                        const card = document.createElement('div');
                        card.className = 'result-card';
                        
                        const text = document.createElement('p');
                        text.className = 'result-text';
                        text.textContent = result.text;
                        
                        card.appendChild(text);
                        searchResults.appendChild(card);
                    });
                }
            } else {
                throw new Error(data.error || 'Search failed');
            }
        } catch (error) {
            searchStatus.textContent = error.message;
            searchStatus.className = 'status-msg status-error';
        } finally {
            searchBtn.textContent = 'Search Vault';
            searchBtn.disabled = false;
        }
    });
});
