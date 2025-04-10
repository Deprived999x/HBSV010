// Using API credentials for the Human Build System
const API_KEY = ""; // No default API key - users will need to provide their own
const API_USER = "Deprive"; // Your Hugging Face username

// T2I Previewer class that generates images from text prompts
export class T2IPreviewer {
  constructor() {
    this.container = null;
    this.apiToken = ''; // Will be loaded from default or localStorage
    this.apiUser = API_USER; // Store the username
    this.isGenerating = false;
    this.currentPrompt = '';
    
    // Updated model list with your requested models
    this.availableModels = [
      { 
        id: 'HiDream-ai/HiDream-I1-Full', 
        name: 'HiDream I1 Full', 
        status: 'unknown',
        description: 'High-quality image generation model'
      },
      { 
        id: 'black-forest-labs/FLUX.1-schnell', 
        name: 'FLUX.1 Schnell', 
        status: 'unknown',
        description: 'Fast and efficient image generator'
      },
      { 
        id: 'ByteDance/InfiniteYou', 
        name: 'InfiniteYou', 
        status: 'unknown',
        description: 'ByteDance\'s creative image model'
      }
    ];
    
    // Use the first model by default
    this.selectedModelIndex = 0;
    this.apiUrl = `https://api-inference.huggingface.co/models/${this.availableModels[0].id}`;
    
    this.useNoCors = false;
    this.corsExtensionDetected = false;
    this.maxRetries = 3;
    this.apiUnavailable = false; // Track if the API seems completely down
    
    // No default API token - users will be prompted to enter one
    this.defaultApiToken = API_KEY;
    
    // Check if running locally or on a server
    this.isLocalEnvironment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname.startsWith('192.168.');
  }
    
  init(container) {
    this.container = container;
    // Create UI elements
    container.innerHTML = `
      <div class="t2i-controls">
        <h3>Text-to-Image Preview</h3>
        <div class="api-key-section">
          <input type="password" id="t2i-api-key" placeholder="Enter Hugging Face API Token" class="t2i-input">
          <button id="t2i-save-key" class="t2i-button">Save Token</button>
        </div>
        <div class="model-selector-section" style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <label for="t2i-model-select" style="display: block;">Model:</label>
            <button id="t2i-test-models" class="t2i-button" style="padding: 4px 8px; font-size: 12px;">Find Working Models</button>
          </div>
          <select id="t2i-model-select" class="t2i-input" style="width: 100%;">
            ${this.availableModels.map((model, index) => 
              `<option value="${index}">${model.name}</option>`
            ).join('')}
          </select>
          <div id="model-description" style="font-size: 12px; margin-top: 3px; font-style: italic; color: #666;">
            ${this.availableModels[0].description}
          </div>
          <div id="model-status" style="font-size: 12px; margin-top: 3px; color: #666;">
            Checking model status...
          </div>
        </div>
        <div class="generate-section">
          <button id="t2i-generate" class="t2i-button primary">Generate Image</button>
          <div id="t2i-status" class="t2i-status"></div>
        </div>
        <div id="t2i-cors-status" class="t2i-note" style="margin-top: 10px; font-size: 12px; color: #666;">
          <span style="color:#e74c3c">✖</span> CORS Extension: Not detected or inactive. 
          <a href="https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf" 
             target="_blank" style="color: #3498db;">Install extension</a> and make sure it's enabled.
        </div>
      </div>
      <div class="t2i-preview">
        <img id="t2i-image" class="t2i-hidden">
        <div id="t2i-placeholder" class="t2i-placeholder">
          <div>Image will appear here</div>
          <div class="t2i-subtext">Save your API token and click Generate</div>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .t2i-controls {
        margin-bottom: 15px;
      }
      .t2i-input {
        padding: 8px;
        width: 250px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      .t2i-button {
        padding: 8px 15px;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
      }
      .t2i-button.primary {
        background: #3498db;
        color: white;
        border-color: #2980b9;
      }
      .t2i-button:hover {
        opacity: 0.9;
      }
      .t2i-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .t2i-status {
        display: inline-block;
        margin-left: 10px;
        font-style: italic;
      }
      .t2i-preview {
        border: 1px solid #ddd;
        height: 256px;
        width: 100%;
        max-width: 256px;
        position: relative;
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f6f6f6;
      }
      .t2i-hidden {
        display: none;
      }
      .t2i-placeholder {
        text-align: center;
        color: #666;
        padding: 20px;
      }
      .t2i-subtext {
        font-size: 0.9em;
        margin-top: 10px;
        color: #999;
      }
      .api-key-section, .generate-section {
        margin-bottom: 10px;
      }
      .t2i-error {
        color: #e74c3c;
        margin-top: 10px;
        font-size: 12px;
        text-align: center;
        padding: 5px;
      }
      .model-warning {
        margin-top: 10px;
        padding: 8px;
        background-color: #fff3cd;
        border: 1px solid #ffeeba;
        border-radius: 4px;
        color: #856404;
        font-size: 12px;
      }
      .github-pages-note {
        margin-top: 10px;
        padding: 8px;
        background-color: #e8f4f8;
        border: 1px solid #bee5eb;
        border-radius: 4px;
        color: #0c5460;
        font-size: 12px;
      }
      .model-suggestion {
        margin-top: 5px;
        padding: 8px;
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 4px;
        color: #155724;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
    
    // Check if we're on GitHub Pages
    const isGitHubPages = window.location.hostname.endsWith('github.io');
    if (isGitHubPages) {
      const corsNote = document.createElement('div');
      corsNote.className = 'github-pages-note';
      corsNote.innerHTML = `
        <strong>GitHub Pages Notice:</strong> This app is running on GitHub Pages, which has stricter 
        CORS policies. You'll need to use a CORS extension or access the Hugging Face API directly.
        <div style="margin-top: 5px;">
          <a href="https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf" 
             target="_blank" style="color: #0c5460; text-decoration: underline;">
            Install CORS Extension
          </a>
        </div>
      `;
      this.container.querySelector('.t2i-controls').appendChild(corsNote);
    }
    
    // Event listeners
    document.getElementById('t2i-save-key').addEventListener('click', () => {
      const key = document.getElementById('t2i-api-key').value;
      if (key) {
        this.apiToken = key;
        localStorage.setItem('hbs_t2i_token', key);
        this.updateStatus('API token saved');
        document.getElementById('t2i-api-key').value = '';
        // After saving token, check models status
        this.checkModelsStatus();
      }
    });
    
    document.getElementById('t2i-generate').addEventListener('click', () => {
      this.generateImage();
    });
    
    // Add model selection handlers
    const modelSelect = document.getElementById('t2i-model-select');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        const selectedIndex = parseInt(e.target.value);
        this.selectModel(selectedIndex);
        // Update model description when selection changes
        const modelDescription = document.getElementById('model-description');
        if (modelDescription) {
          modelDescription.textContent = this.availableModels[selectedIndex].description;
        }
      });
      
      // Try to load previous model selection
      const savedModelIndex = localStorage.getItem('hbs_t2i_model_index');
      if (savedModelIndex !== null) {
        const index = parseInt(savedModelIndex);
        if (!isNaN(index) && index >= 0 && index < this.availableModels.length) {
          modelSelect.value = index;
          this.selectModel(index);
        }
      }
    }
    
    // Load saved token if available, otherwise we'll have an empty field
    const savedToken = localStorage.getItem('hbs_t2i_token');
    if (savedToken) {
      this.apiToken = savedToken;
      this.updateStatus('API token loaded from storage');
    } else {
      // Show a more visible message prompting for API key
      this.updateStatus('Please enter your Hugging Face API token', false);
      const keySection = this.container.querySelector('.api-key-section');
      if (keySection) {
        keySection.style.backgroundColor = '#e8f4f8';
        keySection.style.padding = '10px';
        keySection.style.borderRadius = '4px';
        keySection.style.marginBottom = '15px';
        keySection.style.border = '1px solid #bee5eb';
      }
    }
    
    // Check models status if we have a token
    if (this.apiToken) {
      this.checkModelsStatus();
    }
    
    // Check for CORS extension
    this.checkCorsExtension();
    // Re-check CORS extension status periodically
    setInterval(() => this.checkCorsExtension(), 5000);
    
    // Add the test models button event listener
    document.getElementById('t2i-test-models').addEventListener('click', async () => {
      const button = document.getElementById('t2i-test-models');
      if (button) button.disabled = true;
      this.updateStatus('Searching for working models...');
      const found = await this.findValidModels();
      if (!found) {
        this.updateStatus('No working models found. Please try again later.', true);
      }
      if (button) button.disabled = false;
    });
  }
  
  updatePrompt(prompt) {
    this.prompt = prompt;
    
    if (!prompt || prompt.trim() === '') {
        this.container.innerHTML = '<div class="t2i-no-prompt">Enter a prompt to see a preview</div>';
        return;
    }
    
    this.container.innerHTML = '<div class="t2i-loading">Generating preview...</div>';
    
    // Try to generate the image with error handling
    this.generateImage(prompt)
        .then(imageUrl => {
            if (imageUrl) {
                this.container.innerHTML = `
                    <div class="t2i-result">
                        <img src="${imageUrl}" alt="Generated preview">
                        <div class="t2i-prompt-used">${prompt}</div>
                    </div>
                `;
            } else {
                throw new Error('Failed to generate image');
            }
        })
        .catch(error => {
            console.error('T2I Preview error:', error);
            this.container.innerHTML = `
                <div class="t2i-error">
                    <p>API connection failed. To use the T2I Preview feature:</p>
                    <ol>
                        <li>Make sure you have an internet connection</li>
                        <li>The Hugging Face API might be temporarily unavailable</li>
                        <li>This API key might have exceeded its rate limit</li>
                    </ol>
                    <p>Prompt that would have been used:</p>
                    <div class="t2i-prompt-used">${prompt}</div>
                </div>
            `;
        });
  }
  
  updateStatus(message, isError = false) {
    const status = document.getElementById('t2i-status');
    if (status) {
      status.textContent = message;
      status.style.color = isError ? '#e74c3c' : '';
    }
  }
  
  generateImage(prompt) {
    if (!prompt) {
      // Use the stored prompt if one wasn't provided
      prompt = this.currentPrompt || this.prompt;
    }
    
    if (!prompt) {
      this.showError("No prompt provided. Please enter a text prompt first.");
      return Promise.reject("No prompt provided");
    }
    
    // Store the current prompt
    this.currentPrompt = prompt;
    
    // Show status while generating
    this.isGenerating = true;
    this.updateStatus("Generating image...");
    
    // Get the currently selected model ID
    const modelId = this.availableModels[this.selectedModelIndex].id;
    
    // Update the preview area to show loading state
    const imageElement = document.getElementById('t2i-image');
    const placeholder = document.getElementById('t2i-placeholder');
    
    if (imageElement) imageElement.classList.add('t2i-hidden');
    if (placeholder) {
      placeholder.style.display = 'flex';
      placeholder.innerHTML = `
        <div>
          <div style="margin-bottom: 10px; font-weight: bold;">Generating image...</div>
          <div style="font-size: 12px; margin-bottom: 15px;">Using model: ${modelId}</div>
          <div class="loading-spinner" style="margin: 0 auto; width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>
      `;
    }
    
    // Now call the Hugging Face API with YOUR API key that you provided
    const apiUrl = `https://api-inference.huggingface.co/models/${modelId}`;
    
    return fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'X-User-Agent': `HBS/${this.apiUser}` // Add the username to the request
      },
      body: JSON.stringify({ inputs: prompt }),
    })
    .then(response => {
      this.isGenerating = false;
      
      if (!response.ok) {
        if (response.status === 503) {
          this.updateStatus("Model is loading... this may take a minute", false);
          // The model is still loading, try again after a delay
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(this.generateImage(prompt));
            }, 5000); // 5 second delay for model loading
          });
        }
        
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }
      
      return response.blob();
    })
    .then(imageBlob => {
      // Check if we got a proper image and not an error message in JSON
      if (imageBlob.type.startsWith('application/json')) {
        return imageBlob.text().then(text => {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || "Unknown API error");
        });
      }
      
      // Create URL for the image blob
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // Display the image
      if (imageElement) {
        imageElement.onload = () => {
          imageElement.classList.remove('t2i-hidden');
          if (placeholder) placeholder.style.display = 'none';
        };
        imageElement.src = imageUrl;
      }
      
      this.updateStatus("Image generated successfully!", false);
      return imageUrl;
    })
    .catch(error => {
      this.isGenerating = false;
      console.error("Error generating image:", error);
      this.showError(`Failed to generate image: ${error.message}`);
      this.updateStatus(`Error: ${error.message}`, true);
      this.showDirectApiLink(prompt);
      throw error;
    });
  }
  
  checkCorsExtension() {
    // Special message for local development
    if (this.isLocalEnvironment) {
      const statusElement = document.getElementById('t2i-cors-status');
      if (statusElement) {
        statusElement.innerHTML = `
          <span style="color:#f39c12">⚠</span> Local Development: 
          You're running this app locally. CORS issues are common in this environment.
          <a href="https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf" 
             target="_blank" style="color: #3498db;">Install this extension</a> and ensure it's enabled.
        `;
      }
    }
    
    // Instead of testing Hugging Face API directly (which requires auth),
    // use a public API that allows CORS requests
    fetch('https://httpbin.org/headers', { 
      method: 'GET',
      mode: 'cors'
    })
    .then(response => {
      // If we get any response (even error response), CORS is working
      this.corsExtensionDetected = true;
      this.updateCorsStatus(true);
    })
    .catch(error => {
      console.log('CORS check error:', error);
      // Only mark as not detected if there's a specific CORS error
      if (error.message && error.message.includes('CORS')) {
        this.corsExtensionDetected = false;
        this.updateCorsStatus(false);
      } else {
        // For other errors (network etc.), don't change the status
        console.warn("Network error during CORS check:", error);
      }
    });
  }
  
  updateCorsStatus(detected, uncertain = false) {
    const statusElement = document.getElementById('t2i-cors-status');
    if (!statusElement) return;
    
    if (detected) {
      if (uncertain) {
        statusElement.innerHTML = `
          <span style="color:#f39c12">⚠</span> CORS Extension: Possibly active (couldn't verify). 
          If image generation fails, ensure the extension is enabled and properly configured.
        `;
      } else {
        statusElement.innerHTML = `
          <span style="color:#2ecc71">✓</span> CORS Extension: Active. 
          Image generation should work correctly with the API.
        `;
      }
    } else {
      statusElement.innerHTML = `
        <span style="color:#e74c3c">✖</span> CORS Extension: Not detected or inactive.     
        <a href="https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf" 
           target="_blank" style="color: #3498db;">Install extension</a> and make sure it's enabled.
      `;
    }
  }
  
  showDirectApiLink(prompt) {
    // Create a link that users can directly open in a new tab
    const placeholder = document.getElementById('t2i-placeholder');
    if (!placeholder) return;
    
    // Clear existing direct links
    const existingLink = document.getElementById('direct-api-link');
    if (existingLink) {
      existingLink.parentNode.removeChild(existingLink);
    }
    
    // Create a simple form that will POST to the Hugging Face API
    const linkContainer = document.createElement('div');
    linkContainer.id = 'direct-api-link';
    linkContainer.style.marginTop = '15px';
    linkContainer.style.textAlign = 'center';
    
    const modelId = this.availableModels[this.selectedModelIndex].id;
    
    // Since we can't directly create a link for a POST request,
    // we'll provide instructions for the user
    linkContainer.innerHTML = `
      <p style="font-size:14px; margin-bottom:10px;">
        Try accessing the API directly through the Hugging Face interface:
      </p>
      <a href="https://huggingface.co/${modelId}" 
         target="_blank" 
         style="display:inline-block; padding:8px 12px; background:#3498db; color:white; text-decoration:none; border-radius:4px;">
        Open Model Page
      </a>
      <p style="font-size:12px; margin-top:10px; color:#666;">
        Once there, paste your token and prompt in the interface
      </p>
    `;
    placeholder.appendChild(linkContainer);
  }
  
  clearError() {
    const errorMessage = document.getElementById('t2i-error-message');
    if (errorMessage && errorMessage.parentNode) {
      errorMessage.parentNode.removeChild(errorMessage);
    }
    
    // Also clear any direct links
    const directLink = document.getElementById('direct-api-link');
    if (directLink && directLink.parentNode) {
      directLink.parentNode.removeChild(directLink);
    }
  }
  
  showError(message) {
    this.clearError();
    const placeholder = document.getElementById('t2i-placeholder');
    if (placeholder) {
      const errorDiv = document.createElement('div');
      errorDiv.id = 't2i-error-message';
      errorDiv.className = 't2i-error';
      errorDiv.textContent = message;
      placeholder.appendChild(errorDiv);
    }
  }
  
  selectModel(index) {
    if (index >= 0 && index < this.availableModels.length) {
      this.selectedModelIndex = index;
      this.apiUrl = `https://api-inference.huggingface.co/models/${this.availableModels[index].id}`;
      localStorage.setItem('hbs_t2i_model_index', index.toString());
      // Update UI to reflect selected model status
      this.updateModelStatus();
      this.updateStatus(`Selected model: ${this.availableModels[index].name}`);
    }
  }
  
  updateModelStatus() {
    const modelStatus = document.getElementById('model-status');
    if (!modelStatus) return;
    
    const model = this.availableModels[this.selectedModelIndex];
    if (model.status === 'unknown') {
      modelStatus.innerHTML = 'Status: Checking...';
      modelStatus.style.color = '#f39c12';
    } else if (model.status === 'ok') {
      modelStatus.innerHTML = 'Status: Online <span style="color:#2ecc71">✓</span>';
      modelStatus.style.color = '#2ecc71';
    } else if (model.status === 'error') {
      modelStatus.innerHTML = 'Status: Error <span style="color:#e74c3c">✖</span>';
      modelStatus.style.color = '#e74c3c';
    } else if (model.status === 'loading') {
      modelStatus.innerHTML = 'Status: Loading model... This may take time for the first request';
      modelStatus.style.color = '#f39c12';
    }
  }
  
  async checkModelStatus(modelIndex) {
    if (!this.apiToken) {
      this.updateStatus('API token needed. Please enter one above.', true);
      return;
    }
    if (modelIndex >= this.availableModels.length) return;
    const model = this.availableModels[modelIndex];
    const modelUrl = `https://api-inference.huggingface.co/models/${model.id}`;
    
    try {
      // Simple HEAD request to check status
      const response = await fetch(modelUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'X-User-Agent': `HBS/${this.apiUser}` // Adding username to help with API tracking
        }
      });
      
      if (response.ok) {
        model.status = 'ok';
        this.clearModelError(model.id);
      } else if (response.status === 503) {
        // Model is loading
        model.status = 'loading';
        this.clearModelError(model.id);
      } else if (response.status === 404) {
        model.status = 'error';
        console.warn(`Model "${model.id}" was not found on Hugging Face. Please verify the model ID.`);
        this.showModelError(model.id, 'Model not found', 
          `The model "${model.id}" could not be found on Hugging Face. This model may have been removed or renamed.`);
      } else {
        model.status = 'error';
        console.warn(`Model check for "${model.name}" failed with status ${response.status}`);
        this.showModelError(model.id, `Error (${response.status})`, 
          `Could not access model "${model.id}". This could be due to access restrictions or server issues.`);
      }
    } catch (error) {
      model.status = 'error';
      console.error(`Error checking model status for ${model.name}:`, error);
      this.showModelError(model.id, 'Network Error', 
        `Network error while checking model "${model.id}". Check your internet connection.`);
    }
    
    // If this is the currently selected model, update its status display
    if (modelIndex === this.selectedModelIndex) {
      this.updateModelStatus();
    }
  }
  
  showModelError(modelId, title, message) {
    const modelStatus = document.getElementById('model-status');
    if (!modelStatus) return;
    
    // Create error message
    let errorDiv = document.getElementById(`error-${modelId.replace(/\//g, '-')}`);
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = `error-${modelId.replace(/\//g, '-')}`;
      errorDiv.className = 'model-warning';
      modelStatus.parentNode.insertBefore(errorDiv, modelStatus.nextSibling);
    }
    
    errorDiv.innerHTML = `
      <strong>${title}:</strong> ${message}
      <div style="margin-top: 8px;">
        <a href="https://huggingface.co/models?pipeline_tag=text-to-image&sort=downloads" 
           target="_blank" style="color: #007bff; text-decoration: underline;">
           Browse popular text-to-image models
        </a>
      </div>
    `;
    
    // Add suggestion for working models
    this.addModelSuggestions(modelStatus.parentNode);
  }
  
  clearModelError(modelId) {
    const errorDiv = document.getElementById(`error-${modelId.replace(/\//g, '-')}`);
    if (errorDiv) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
    
    // Check if there are any other model errors
    const hasErrors = this.availableModels.some(model => model.status === 'error');
    if (!hasErrors) {
      // Remove suggestions if no errors
      const suggestionDiv = document.getElementById('model-suggestions');
      if (suggestionDiv) {
        suggestionDiv.parentNode.removeChild(suggestionDiv);
      }
    }
  }
  
  addModelSuggestions(container) {
    // Check if we already have suggestions
    let suggestionDiv = document.getElementById('model-suggestions');
    if (!suggestionDiv) {
      suggestionDiv = document.createElement('div');
      suggestionDiv.id = 'model-suggestions';
      suggestionDiv.className = 'model-suggestion';
      container.appendChild(suggestionDiv);
    }
    
    // List reliable models that typically work well
    suggestionDiv.innerHTML = `
      <strong>Try these reliable models instead:</strong>
      <ul style="margin-top: 5px; padding-left: 20px;">
        <li><strong>HiDream-ai/HiDream-I1-Full</strong> - High-quality image generation model</li>
        <li><strong>black-forest-labs/FLUX.1-schnell</strong> - Fast and efficient image generator</li> 
        <li><strong>ByteDance/InfiniteYou</strong> - ByteDance's creative image model</li>
      </ul>
    `;
  }

  checkModelsStatus() {
    if (!this.apiToken) return;
    this.availableModels.forEach((model, index) => {
      this.checkModelStatus(index);
    });
  }
  
  async findValidModels() {
    this.updateStatus('Testing available models...');
    const commonModels = [
      'HiDream-ai/HiDream-I1-Full',
      'black-forest-labs/FLUX.1-schnell',
      'ByteDance/InfiniteYou'
    ];
    const workingModels = [];
    
    for (const modelId of commonModels) {
      try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
          method: 'HEAD',
          headers: { 
            'Authorization': `Bearer ${this.apiToken}`,
            'X-User-Agent': `HBS/${this.apiUser}` // Adding username consistently
          }
        });
        
        if (response.ok || response.status === 503) {
          workingModels.push({
            id: modelId,
            name: modelId.split('/')[1],
            status: response.ok ? 'ok' : 'loading',
            description: 'Text-to-image model (detected)'
          });
          console.log(`Model ${modelId} is available`);
        }
      } catch (error) {
        console.warn(`Could not check model ${modelId}:`, error);
      }
    }
    
    if (workingModels.length > 0) {
      // If we found any working models, update the list
      this.availableModels = workingModels;
      this.selectedModelIndex = 0;
      this.apiUrl = `https://api-inference.huggingface.co/models/${this.availableModels[0].id}`;
      this.updateModelSelectionUI();
      this.updateStatus(`Found ${workingModels.length} working models`);
      return true;
    }
    return false;
  }
  
  updateModelSelectionUI() {
    const modelSelect = document.getElementById('t2i-model-select');
    if (!modelSelect) return;
    
    // Clear existing options
    modelSelect.innerHTML = '';
    
    // Add new options
    this.availableModels.forEach((model, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });
    
    // Update model description
    const modelDescription = document.getElementById('model-description');
    if (modelDescription) {
      modelDescription.textContent = this.availableModels[this.selectedModelIndex].description;
    }
  }
  
  showApiDownMessage() {
    const placeholder = document.getElementById('t2i-placeholder');
    if (!placeholder) return;
    
    let apiStatus = document.getElementById('api-status-message');
    if (!apiStatus) {
      apiStatus = document.createElement('div');
      apiStatus.id = 'api-status-message';
      apiStatus.style.padding = '10px';
      apiStatus.style.marginTop = '20px';
      apiStatus.style.backgroundColor = '#fff3cd';
      apiStatus.style.border = '1px solid #ffeeba';
      apiStatus.style.borderRadius = '4px';
      apiStatus.style.color = '#856404';
      placeholder.appendChild(apiStatus);
    }
    
    apiStatus.innerHTML = `
      <h4 style="margin-top:0;margin-bottom:10px;font-size:16px;">⚠️ Hugging Face API Service Status</h4>
      <p style="margin-bottom:10px;">The Hugging Face Inference API appears to be temporarily unavailable.</p>
      <p style="margin-bottom:10px;">This is not an issue with this application or your setup.</p>
      <p>You can check the status or try again later:</p>
      <div style="margin-top:10px;">
        <button id="t2i-retry" style="padding:8px 12px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:10px;">
          Try Again
        </button>
        <a href="https://status.huggingface.co/" target="_blank" style="color:#3498db;text-decoration:underline;">
          Check Hugging Face Status
        </a>
      </div>
    `;
    
    // Add event listener for retry button
    document.getElementById('t2i-retry').addEventListener('click', () => {
      this.clearError();
      this.checkModelsStatus();
      this.updateStatus('Checking API availability...');
      this.apiUnavailable = false;
    });
  }
}