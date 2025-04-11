// app/t2i-previewer.js

// IMPORTANT: Replace this with the actual URL of YOUR deployed proxy/serverless function
// Example: 'https://your-project-name.vercel.app/api/generate-image'
const PROXY_API_URL = 'https://hbs-proxy-function-git-main-matthew-anacletos-projects.vercel.app/api/generate-image'; // <--- YOU WILL EDIT THIS LINE SHORTLY!

// You can still define the models you want to offer
const availableModels = [
  {
    id: 'black-forest-labs/FLUX.1-schnell', // Keep this one - it works!
    name: 'FLUX.1 Schnell',
    description: 'Fast and efficient image generator'
  },
  {
    id: 'mit-han-lab/hart-0.7b-1024px',
    name: 'HART 0.7B',
    description: 'Efficient text-to-image model with 1024px resolution'
  },
  {
    id: 'RunDiffusion/Stable-Diffusion-Unconditional', // This is an example - verify actual model ID
    name: 'Random Generator',
    description: 'Generates random images without using prompts'
  }
];

export class T2IPreviewer {
  constructor() {
    this.container = null;
    this.isGenerating = false;
    this.currentPrompt = '';
    this.imageData = null; // To store base64 image data
    this.error = null;
    this.promptUsedOnError = null;

    // Model selection
    this.availableModels = availableModels; // Use the constant defined above
    this.selectedModelIndex = 0; // Default to the first model

    // DOM references (will be assigned in init)
    this.generateButton = null;
    this.modelSelect = null;
    this.statusArea = null;
    this.imageDisplay = null;
    this.placeholder = null;
    this.modelDescription = null;
    this.openImageButton = null;
  }

  init(containerElement) {
    this.container = containerElement;
    if (!this.container) {
      console.error("T2I Previewer container not found!");
      return;
    }

    // Create the simplified UI elements
    this.container.innerHTML = `
      <div class="t2i-controls">
        <h3>Text-to-Image Preview</h3>
        <div class="model-selector-section" style="margin-bottom: 10px;">
          <label for="t2i-model-select" style="display: block; margin-bottom: 5px;">Select Model:</label>
          <select id="t2i-model-select" class="t2i-input" style="width: 100%;">
            ${this.availableModels.map((model, index) =>
              `<option value="${index}">${model.name}</option>`
            ).join('')}
          </select>
          <div id="model-description" style="font-size: 12px; margin-top: 5px; font-style: italic; color: #666;">
            ${this.availableModels[0].description}
          </div>
        </div>
        <div class="generate-section" style="margin-top: 15px;">
          <button id="t2i-generate" class="t2i-button primary">Generate Image</button>
          <span id="t2i-status" class="t2i-status" style="margin-left: 10px;"></span>
        </div>
      </div>
      <div class="t2i-preview">
        <div id="t2i-status-area" style="position: absolute; top: 10px; left: 10px; right: 10px; text-align: center; z-index: 2;">
           <!-- Error messages go here -->
        </div>
        <img id="t2i-image" class="t2i-hidden" alt="Generated Image">
        <div id="t2i-placeholder" class="t2i-placeholder">
          <div>Generate a T2I prompt first</div>
        </div>
        <button id="t2i-open-image" class="t2i-button" style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: none; z-index: 3;">
          Open in New Window
        </button>
      </div>
      <div id="t2i-proxy-warning" class="github-pages-note" style="display: none; margin-top: 10px; font-size: 12px;">
         <strong>Note:</strong> Image generation relies on a proxy service. Ensure it's configured and running.
      </div>
    `;

    // Add essential styles (keep relevant ones from your original)
    const style = document.createElement('style');
    style.textContent = `
      .t2i-controls { margin-bottom: 15px; }
      .t2i-input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 100%; box-sizing: border-box; } /* Added width/box-sizing */
      .t2i-button { padding: 8px 15px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
      .t2i-button.primary { background: #3498db; color: white; border-color: #2980b9; }
      .t2i-button:hover { opacity: 0.9; }
      .t2i-button:disabled { background-color: #bdc3c7; cursor: not-allowed; opacity: 0.7; }
      .t2i-status { font-style: italic; color: #555; }
      .t2i-preview { border: 1px solid #ddd; height: 256px; width: 100%; max-width: 256px; position: relative; margin-top: 10px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; overflow: hidden; }
      .t2i-hidden { display: none; }
      .t2i-placeholder { text-align: center; color: #666; padding: 20px; font-size: 14px; }
      #t2i-image { display: none; max-width: 100%; max-height: 100%; object-fit: contain; }
      .t2i-error { color: #e74c3c; background-color: #fff0f0; border: 1px solid #ffcaca; border-radius: 4px; padding: 10px; font-size: 12px; }
      .t2i-loading { color: #3498db; font-weight: bold; font-size: 12px; background: rgba(255, 255, 255, 0.8); padding: 5px 10px; border-radius: 4px; }
      .github-pages-note { margin-top: 10px; padding: 8px; background-color: #e8f4f8; border: 1px solid #bee5eb; border-radius: 4px; color: #0c5460; font-size: 12px; }
      .t2i-prompt-used { margin-top: 10px; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; white-space: pre-wrap; word-break: break-word; max-height: 80px; overflow-y: auto; }
    `;
    document.head.appendChild(style);

    // Get references to elements
    this.generateButton = this.container.querySelector('#t2i-generate');
    this.modelSelect = this.container.querySelector('#t2i-model-select');
    this.statusArea = this.container.querySelector('#t2i-status-area');
    this.statusSpan = this.container.querySelector('#t2i-status'); // The inline status span
    this.imageDisplay = this.container.querySelector('#t2i-image');
    this.placeholder = this.container.querySelector('#t2i-placeholder');
    this.modelDescription = this.container.querySelector('#model-description');
    this.proxyWarning = this.container.querySelector('#t2i-proxy-warning');
    this.openImageButton = this.container.querySelector('#t2i-open-image');

    // Event listeners
    if (this.generateButton) {
      this.generateButton.addEventListener('click', () => this.triggerGeneration());
    }
    
    // Add event listener for the open image button
    if (this.openImageButton) {
      this.openImageButton.addEventListener('click', () => {
        if (this.imageData) {
          // Open the image in a new centered window
          const width = 512; // Standard width for the new window
          const height = 512; // Standard height for the new window
          const left = (window.screen.width - width) / 2;
          const top = (window.screen.height - height) / 2;
          const newWindow = window.open('', '_blank', `width=${width},height=${height},left=${left},top=${top}`);
          
          if (newWindow) {
            newWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Generated Image</title>
                <style>
                  body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #2c2c2c; }
                  img { max-width: 100%; max-height: 100%; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${this.imageData}" alt="Generated Image">
              </body>
              </html>
            `);
            newWindow.document.close();
          } else {
            alert("Popup blocker may have prevented opening the image. Please allow popups for this site.");
          }
        }
      });
    }
    
    if (this.modelSelect) {
      this.modelSelect.addEventListener('change', (e) => {
        this.selectedModelIndex = parseInt(e.target.value);
        if (this.modelDescription) {
          this.modelDescription.textContent = this.availableModels[this.selectedModelIndex].description;
        }
         // Save model preference
        localStorage.setItem('hbs_t2i_model_index', this.selectedModelIndex.toString());
        this.updateStatus(`Selected model: ${this.availableModels[this.selectedModelIndex].name}`);
      });
        // Load saved model preference
        const savedIndex = localStorage.getItem('hbs_t2i_model_index');
        if(savedIndex !== null) {
            const index = parseInt(savedIndex);
            if (index >= 0 && index < this.availableModels.length) {
                this.selectedModelIndex = index;
                this.modelSelect.value = index;
                 if (this.modelDescription) {
                    this.modelDescription.textContent = this.availableModels[this.selectedModelIndex].description;
                }
            }
        }
    }

     // Show warning if proxy URL is not set
     if (!PROXY_API_URL || PROXY_API_URL === 'YOUR_PROXY_SERVER_URL_HERE') {
          console.error("PROXY_API_URL is not set in t2i-previewer.js!");
          if (this.proxyWarning) {
            this.proxyWarning.innerHTML = '<strong>Configuration Error:</strong> The proxy server URL is not set in the script. Image generation will fail.';
            this.proxyWarning.style.display = 'block';
            this.proxyWarning.style.backgroundColor = '#f8d7da';
            this.proxyWarning.style.borderColor = '#f5c6cb';
            this.proxyWarning.style.color = '#721c24';

          }
          if (this.generateButton) this.generateButton.disabled = true;
     } else {
         if (this.proxyWarning) this.proxyWarning.style.display = 'block'; // Show the note
     }


    this.render(); // Initial render
  }

  updatePrompt(newPrompt) {
    this.currentPrompt = newPrompt ? newPrompt.trim() : '';
    this.imageData = null; // Clear previous image
    this.error = null;
    this.promptUsedOnError = null;
    console.log("T2I Previewer received prompt:", this.currentPrompt.substring(0, 100) + "...");
    this.render();
  }

   updateStatus(message, isError = false) {
    if (this.statusSpan) {
      this.statusSpan.textContent = message;
      this.statusSpan.style.color = isError ? '#e74c3c' : '#555';
    }
  }

  triggerGeneration() {
     if (!this.currentPrompt || this.isGenerating) {
            console.warn("Generation skipped: No prompt or already loading.");
            return;
     }
      if (!PROXY_API_URL || PROXY_API_URL === 'YOUR_PROXY_SERVER_URL_HERE') {
          this.error = "Proxy API URL is not configured in t2i-previewer.js";
          this.isGenerating = false;
          this.render();
          return;
      }

     this.isGenerating = true;
     this.error = null;
     this.imageData = null;
     this.promptUsedOnError = null;
     this.render(); // Show loading state

     const selectedModel = this.availableModels[this.selectedModelIndex];
     console.log(`[T2I Previewer] Sending prompt to proxy: "${this.currentPrompt.substring(0,50)}..." for model ${selectedModel.id}`);

     fetch(PROXY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the prompt AND the desired model ID to the proxy
            body: JSON.stringify({
                prompt: this.currentPrompt,
                modelId: selectedModel.id // Send model ID so proxy can use it
            }),
        })
        .then(response => {
             // Try to parse JSON regardless of status code first
             // Handle potential non-JSON responses gracefully
             return response.text().then(text => {
                try {
                    const data = JSON.parse(text);
                    return { status: response.status, ok: response.ok, data };
                } catch (e) {
                    // If JSON parsing fails, the response wasn't JSON
                    console.error("Proxy response was not valid JSON:", text);
                    // Throw an error indicating non-JSON response, include status
                    throw new Error(`Proxy returned non-JSON response (Status: ${response.status}). Check proxy logs.`);
                }
            });
         })
        .then(({ status, ok, data}) => { // Destructure the object
            if (!ok) {
                console.error(`[T2I Previewer] Error from proxy: ${status}`, data);
                // Use error message from proxy if available, otherwise provide a generic one
                this.error = `Error ${status}: ${data?.error || 'Unknown error occurred on the proxy server.'}`;
                // If proxy sends back the prompt it tried, store it
                this.promptUsedOnError = data?.promptUsed || this.currentPrompt;
                throw new Error(this.error); // Throw to enter the catch block
            }

            // Handle successful response from proxy
            if (data.imageData) {
                console.log("[T2I Previewer] Received image data from proxy.");
                this.imageData = `data:image/png;base64,${data.imageData}`; // Assuming PNG
                this.error = null;
                this.promptUsedOnError = null;
            } else {
                console.warn("[T2I Previewer] Proxy response OK, but no imageData found.", data);
                this.error = data.error || 'Proxy returned a successful but unexpected response (missing image data).';
                this.promptUsedOnError = this.currentPrompt;
                this.imageData = null;
                // Throw an error to be caught by the catch block
                throw new Error(this.error);
            }
        })
        .catch(error => {
            // Catch network errors or errors thrown from response handling/JSON parsing
            console.error('[T2I Previewer] Image generation failed:', error);
            // Ensure error message is set, even if already set in try/then block
            this.error = this.error || `Generation failed: ${error.message}. Check browser console and proxy logs.`;
            this.imageData = null;
             // Ensure promptUsedOnError is set if an error occurs
             this.promptUsedOnError = this.promptUsedOnError || this.currentPrompt;
        })
        .finally(() => {
            this.isGenerating = false;
            this.render(); // Update UI with result or error
        });
  }


  render() {
    if (!this.container) return;

    // --- Update Button State ---
    if (this.generateButton) {
      // Disable button if no prompt, already generating, OR if the proxy URL is still the placeholder
      this.generateButton.disabled = !this.currentPrompt || this.isGenerating || (!PROXY_API_URL || PROXY_API_URL === 'YOUR_PROXY_SERVER_URL_HERE');
      this.generateButton.textContent = this.isGenerating ? 'Generating...' : 'Generate Image';
    }

    // --- Update Status Area (Loading/Error Details) ---
    if (this.statusArea) {
         this.statusArea.innerHTML = ''; // Clear previous status
         this.statusArea.style.display = 'none'; // Hide by default

        if (this.isGenerating) {
            this.statusArea.innerHTML = `<div class="t2i-loading">⏳ Generating... (may take 30-60s)</div>`;
            this.statusArea.style.display = 'block';
            this.updateStatus('Generating image...'); // Update inline span
        } else if (this.error) {
             let errorHtml = `<div class="t2i-error">
                 <strong>Image Generation Failed:</strong><br>${this.error}`;
             if (this.promptUsedOnError) {
                 errorHtml += `<p style="margin-top: 8px; margin-bottom: 5px;">Prompt Attempted:</p>
                     <div class="t2i-prompt-used">${this.promptUsedOnError}</div>`;
             }
              errorHtml += `</div>`;
            this.statusArea.innerHTML = errorHtml;
            this.statusArea.style.display = 'block';
             this.updateStatus('Failed!', true); // Update inline span
        } else if (this.imageData) {
             this.updateStatus('Image ready.'); // Update inline span
        } else if (!this.currentPrompt){
             this.updateStatus(''); // Clear status span if no prompt
        }
    }

    // --- Update Image Display & Placeholder ---
    if (this.imageDisplay && this.placeholder) {
        if (this.imageData) {
            this.imageDisplay.src = this.imageData;
            this.imageDisplay.style.display = 'block';
            this.placeholder.style.display = 'none';
            
            // Show the open image button when we have an image
            if (this.openImageButton) {
                this.openImageButton.style.display = 'block';
            }
        } else {
            this.imageDisplay.src = '';
            this.imageDisplay.style.display = 'none';
            this.placeholder.style.display = 'flex'; // Show placeholder
            
            // Hide the open image button when no image is available
            if (this.openImageButton) {
                this.openImageButton.style.display = 'none';
            }

            // Customize placeholder text
            if (this.isGenerating) {
                 this.placeholder.innerHTML = `<div>Generating image...</div>`;
            } else if (this.error) {
                // Don't show placeholder text if there's an error message displayed above
                this.placeholder.innerHTML = `<div></div>`;
            }
             else if (!this.currentPrompt) {
                 this.placeholder.innerHTML = `<div>Generate a T2I prompt first</div>`;
            } else {
                 this.placeholder.innerHTML = `<div>Click "Generate Image" to preview</div>`;
            }
        }
    }
  }
}
