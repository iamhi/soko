document.addEventListener('DOMContentLoaded', () => {
  // Dom Elements
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');
  const fileLabel = document.querySelector('.file-label span');
  const uploadStatus = document.getElementById('upload-status');
  const uploadBtn = document.getElementById('upload-btn');

  const textForm = document.getElementById('text-form');
  const textFilename = document.getElementById('text-filename');
  const textContent = document.getElementById('text-content');
  const textStatus = document.getElementById('text-status');
  const textBtn = document.getElementById('text-btn');

  const searchForm = document.getElementById('search-form');
  const searchQuery = document.getElementById('search-query');
  const searchLimit = document.getElementById('search-limit');
  const searchLimitVal = document.getElementById('search-limit-val');
  const searchResults = document.getElementById('search-results');
  const searchBtn = document.getElementById('search-btn');

  const filesListContainer = document.getElementById('files-list-container');

  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const refreshStatusBtn = document.getElementById('refresh-status-btn');
  const statusDetails = document.getElementById('status-details');
  const ollamaHostVal = document.getElementById('ollama-host-val');
  const ollamaModelVal = document.getElementById('ollama-model-val');
  const ollamaModelsPills = document.getElementById('ollama-models-pills');

  // State

  // Format utility functions
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Update range value display
  searchLimit.addEventListener('input', (e) => {
    searchLimitVal.textContent = e.target.value;
  });

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

  // Fetch and check Ollama Connection status
  async function checkOllamaStatus() {
    try {
      statusText.textContent = 'Checking connection...';
      const response = await fetch('/api/ollama/status');
      const data = await response.json();

      statusDetails.classList.remove('hidden');

      if (data.online) {
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Ollama Service Connected';
        ollamaHostVal.textContent = data.host;
        ollamaModelVal.textContent = data.currentModel;

        // Render models list
        ollamaModelsPills.innerHTML = '';
        if (data.models && data.models.length > 0) {
          data.models.forEach((model) => {
            const isCurrent = model.startsWith(data.currentModel);
            const pill = document.createElement('span');
            pill.className = `pill ${isCurrent ? 'active' : ''}`;
            pill.textContent = model;
            ollamaModelsPills.appendChild(pill);
          });
        } else {
          ollamaModelsPills.innerHTML =
            '<span class="text-secondary italic font-size-xs">No models pulled yet</span>';
        }
        searchBtn.disabled = false;
      } else {
        throw new Error(data.error || 'Server returned offline status');
      }
    } catch (error) {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Ollama Offline';
      ollamaHostVal.textContent = '-';
      ollamaModelVal.textContent = '-';
      ollamaModelsPills.innerHTML = `<span style="color: var(--danger)">Connection failed: ${error.message}</span>`;
      searchBtn.disabled = true;
    }
  }

  // Fetch and render document vault
  async function loadFiles() {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error('Failed to load documents');
      const files = await response.json();

      if (files.length === 0) {
        filesListContainer.innerHTML = `
                    <div class="empty-vault">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 0.5rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        <div>No markdown files in the vault. Try uploading one below.</div>
                    </div>`;
        return;
      }

      filesListContainer.innerHTML = '';

      // Check if any file is indexing to auto-refresh
      let needsRefresh = false;

      files.forEach((file) => {
        const card = document.createElement('div');
        card.className = 'file-card';

        const statusBadge =
          file.status === 'indexed'
            ? `<span class="badge badge-indexed" title="Indexed on ${formatDate(
                file.createdAt
              )}">✓ ${file.chunkCount} Chunks</span>`
            : file.status === 'indexing'
              ? `<span class="badge badge-indexing">Indexing</span>`
              : file.status === 'failed'
                ? `<span class="badge badge-failed" title="Indexing Error: ${
                    file.error || 'Unknown error'
                  }" style="cursor:help">✗ Failed</span>`
                : `<span class="badge badge-pending">Pending</span>`;

        if (file.status === 'indexing') {
          needsRefresh = true;
        }

        card.innerHTML = `
                    <div class="file-info">
                        <div class="file-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </div>
                        <div class="file-meta">
                            <div class="file-name" title="${file.filename}">${file.filename}</div>
                            <div class="file-subtext">${formatBytes(file.size)} • Created: ${formatDate(file.createdAt)}</div>
                        </div>
                    </div>
                    <div class="file-status-and-actions">
                        ${statusBadge}
                        <div class="file-actions">
                            <button class="btn secondary-btn compact-btn reindex-btn" data-filename="${file.filename}" ${file.status === 'indexing' ? 'disabled' : ''} title="Re-index this file">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                            </button>
                            <button class="btn danger-btn compact-btn delete-btn" data-filename="${file.filename}" title="Delete file">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                `;

        // Add button listeners
        card.querySelector('.delete-btn').addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          const filename = btn.getAttribute('data-filename');
          if (confirm(`Are you sure you want to delete ${filename}?`)) {
            btn.disabled = true;
            try {
              const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
                method: 'DELETE',
              });
              if (res.ok) {
                loadFiles();
              } else {
                const data = await res.json();
                alert(data.error || 'Delete failed');
              }
            } catch (err) {
              alert(err.message);
            } finally {
              btn.disabled = false;
            }
          }
        });

        card.querySelector('.reindex-btn').addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          const filename = btn.getAttribute('data-filename');
          btn.disabled = true;
          try {
            const res = await fetch(`/api/files/${encodeURIComponent(filename)}/reindex`, {
              method: 'POST',
            });
            if (res.ok) {
              loadFiles();
            } else {
              const data = await res.json();
              alert(data.error || 'Re-index failed');
            }
          } catch (err) {
            alert(err.message);
          }
        });

        filesListContainer.appendChild(card);
      });

      // Set auto refresh interval if indexing
      if (needsRefresh) {
        setTimeout(loadFiles, 3000);
      }
    } catch (error) {
      filesListContainer.innerHTML = `<div class="status-error" style="text-align:center; padding: 1rem;">Failed to load vault documents: ${error.message}</div>`;
    }
  }

  // Semantic Search Submit Handler
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchQuery.value.trim();
    if (!query) return;

    const limit = parseInt(searchLimit.value);
    searchResults.innerHTML = '<div class="loading-spinner">Searching semantic index...</div>';
    searchBtn.disabled = true;

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || 'Search failed');

      if (!data.matches || data.matches.length === 0) {
        searchResults.innerHTML =
          '<div class="no-results">No relevant matches found. Try asking something else or check your indexing status.</div>';
        return;
      }

      searchResults.innerHTML = '';
      data.matches.forEach((match) => {
        const score = (match.similarity * 100).toFixed(1);
        let scoreClass = 'similarity-medium';
        if (match.similarity > 0.65) {
          scoreClass = 'similarity-high';
        }

        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
                    <div class="result-header">
                        <div class="result-file">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            <span>${match.filename}</span>
                        </div>
                        <div class="result-similarity ${scoreClass}">${score}% Match</div>
                    </div>
                    <div class="result-body">${match.text}</div>
                `;
        searchResults.appendChild(card);
      });
    } catch (error) {
      searchResults.innerHTML = `<div class="status-error" style="padding: 1rem;">Search failed: ${error.message}</div>`;
    } finally {
      searchBtn.disabled = false;
    }
  });

  // Upload Handling
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    uploadBtn.textContent = 'Storing & Indexing...';
    uploadBtn.disabled = true;
    uploadStatus.className = 'status-msg';
    uploadStatus.textContent = '';

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      uploadStatus.textContent = `Stored successfully as ${data.filename}! Indexing has started in the background.`;
      uploadStatus.className = 'status-msg status-success';
      uploadForm.reset();
      fileLabel.textContent = 'Choose a Markdown File';
      fileLabel.style.color = 'var(--text-secondary)';

      // Reload file list immediately, showing the "indexing" status
      loadFiles();
    } catch (error) {
      uploadStatus.textContent = error.message;
      uploadStatus.className = 'status-msg status-error';
    } finally {
      uploadBtn.textContent = 'Upload to Vault';
      uploadBtn.disabled = false;
    }
  });

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

    textBtn.textContent = 'Storing & Indexing...';
    textBtn.disabled = true;
    textStatus.className = 'status-msg';
    textStatus.textContent = '';

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Creation failed');

      textStatus.textContent = `Stored successfully as ${data.filename}! Indexing has started.`;
      textStatus.className = 'status-msg status-success';
      textForm.reset();

      // Reload files
      loadFiles();
    } catch (error) {
      textStatus.textContent = error.message;
      textStatus.className = 'status-msg status-error';
    } finally {
      textBtn.textContent = 'Create & Store';
      textBtn.disabled = false;
    }
  });

  // Refresh button listener
  refreshStatusBtn.addEventListener('click', checkOllamaStatus);

  // Initial load
  checkOllamaStatus();
  loadFiles();
});
