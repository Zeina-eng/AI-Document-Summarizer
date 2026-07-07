document.addEventListener('DOMContentLoaded', () => {
    // API Configurations
    const isDeployed = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const API_BASE_URL = isDeployed
        ? '' // On Render, relative path works since we serve static files from same origin
        : 'http://127.0.0.1:10000';

    // UI Elements
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const actionBtns = document.querySelectorAll('.action-btn');
    const actionSelector = document.getElementById('action-selector');
    const subBtn = document.getElementById('summarize-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultContainer = document.getElementById('result-container');
    const resultTitle = resultContainer.querySelector('h2');
    const summaryOutput = document.getElementById('summary-output');
    const copyBtn = document.getElementById('copy-btn');
    
    // Inputs
    const rawTextNode = document.getElementById('raw-text');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const fileNameDisplay = document.getElementById('file-name');

    // Image Inputs
    const imageInput = document.getElementById('image-input');
    const imageDropZone = document.getElementById('image-drop-zone');
    const imageFileNameDisplay = document.getElementById('image-file-name');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');

    let currentTab = 'text'; // 'text' | 'file' | 'image'
    let currentAction = 'summarize'; // 'summarize' | 'generate'
    let selectedFile = null;
    let selectedImage = null;

    // Tabs Logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            document.getElementById(`${currentTab}-tab`).classList.add('active');

            // Show/Hide action selector depending on tab
            if (currentTab === 'image') {
                actionSelector.classList.add('hidden');
                subBtn.querySelector('span').textContent = 'Analyze Image';
                resultTitle.textContent = 'Image Description';
            } else {
                actionSelector.classList.remove('hidden');
                if (currentAction === 'generate') {
                    subBtn.querySelector('span').textContent = 'Generate Text';
                    resultTitle.textContent = 'Generated Text';
                } else {
                    subBtn.querySelector('span').textContent = 'Generate Summary';
                    resultTitle.textContent = 'Generated Summary';
                }
            }
        });
    });

    // Action Logic
    actionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            actionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAction = btn.dataset.action;
            
            // Update button text and labels
            if (currentAction === 'generate') {
                subBtn.querySelector('span').textContent = 'Generate Text';
                rawTextNode.placeholder = 'Enter a topic or prompt to expand...';
                resultTitle.textContent = 'Generated Text';
            } else {
                subBtn.querySelector('span').textContent = 'Generate Summary';
                rawTextNode.placeholder = 'Start typing or paste text here...';
                resultTitle.textContent = 'Generated Summary';
            }
        });
    });

    // File Drop Zone Logic
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
            alert("Please select a .txt or .pdf file.");
            return;
        }
        selectedFile = file;
        fileNameDisplay.textContent = `Selected: ${file.name}`;
    }

    // Image Drop Zone Logic
    imageDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageDropZone.classList.add('dragover');
    });

    imageDropZone.addEventListener('dragleave', () => {
        imageDropZone.classList.remove('dragover');
    });

    imageDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageDropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleImageSelect(e.dataTransfer.files[0]);
        }
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleImageSelect(e.target.files[0]);
        }
    });

    function handleImageSelect(file) {
        if (!file.type.startsWith('image/')) {
            alert("Please select an image file (.png, .jpg, .jpeg, .webp).");
            return;
        }
        selectedImage = file;
        imageFileNameDisplay.textContent = `Selected: ${file.name}`;
        
        // Show image preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    // Submit Action
    subBtn.addEventListener('click', async () => {
        // Validate
        if (currentTab === 'text') {
            if (!rawTextNode.value.trim()) {
                alert(`Please enter some text to ${currentAction}.`);
                return;
            }
        } else if (currentTab === 'file') {
            if (!selectedFile) {
                alert("Please upload a file.");
                return;
            }
        } else {
            if (!selectedImage) {
                alert("Please upload an image.");
                return;
            }
        }

        // Hide old results & show loader
        resultContainer.classList.add('hidden');
        if (currentTab === 'image') {
            loadingOverlay.querySelector('p').textContent = 'Analyzing image...';
        } else {
            loadingOverlay.querySelector('p').textContent = currentAction === 'summarize' ? 'Analyzing document...' : 'Generating text...';
        }
        loadingOverlay.classList.remove('hidden');

        try {
            const formData = new FormData();
            let endpoint = '';

            if (currentTab === 'text') {
                formData.append('text', rawTextNode.value.trim());
                endpoint = currentAction === 'summarize' ? '/summarize' : '/generate';
            } else if (currentTab === 'file') {
                formData.append('file', selectedFile);
                endpoint = currentAction === 'summarize' ? '/summarize' : '/generate';
            } else {
                formData.append('file', selectedImage);
                endpoint = '/analyze-image';
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                const output = data.summary || data.generated_text || data.description;
                if (output) {
                    summaryOutput.textContent = output;
                    resultContainer.classList.remove('hidden');
                    setTimeout(() => {
                        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                } else if (data.error) {
                    alert(`Error: ${data.error}`);
                } else {
                    alert("An unknown error occurred on the server.");
                }
            } else {
                alert(`Error: ${data.detail || data.error || 'Server error occurred'}`);
            }

        } catch (error) {
            console.error(error);
            alert("Failed to reach the server. Is it running? Error: " + error.message);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });

    // Copy to Clipboard
    copyBtn.addEventListener('click', async () => {
        if (!summaryOutput.textContent) return;
        
        try {
            await navigator.clipboard.writeText(summaryOutput.textContent);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    });
});
