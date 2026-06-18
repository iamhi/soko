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

});
