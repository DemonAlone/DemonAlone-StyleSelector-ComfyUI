import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// --- Helper function for HTML escaping ---
function escapeHtml(text) {
    if (!text) return "";
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// --- Simple Markdown to HTML converter (handles basic formatting) ---
function simpleMarkdownToHtml(md) {
    if (!md) return "";
    
    // Extract code blocks so their content isn't mangled during HTML escaping later
    const codeBlocks = [];
    let processed = md.replace(/```([\s\S]*?)```/g, (match, code) => {
        const placeholder = `%%CODEBLOCK_${codeBlocks.length}%%`;
        codeBlocks.push(code.trim());
        return placeholder;
    });

    // Escape HTML characters to prevent XSS and interpret markdown inside code blocks correctly
    processed = escapeHtml(processed);

    // Headers
    processed = processed.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    processed = processed.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    processed = processed.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and Italic text
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');

   // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Lists (unordered)
    processed = processed.replace(/^- (.+)$/gm, '<li>$1</li>');
    processed = processed.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // Line breaks and paragraphs
    processed = processed.replace(/\n\n/g, '</p><p>');
    processed = processed.replace(/\n/g, '<br>');

    // Wrap the result in a paragraph tag if it doesn't contain any block-level elements (like headings or lists)
    if (!/<[hul]/.test(processed)) {
        processed = `<p>${processed}</p>`;
    }

    // Line breaks and paragraphs
    processed = processed.replace(/%%CODEBLOCK_(\d+)%%/g, (match, index) => {
        const code = codeBlocks[parseInt(index)];
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
    });

    return processed;
}

// --- Help text for Style Selector (Markdown) ---
const HELP_MARKDOWN = `
## 🛠 How to Add Your Own Style

To use custom styles or databases, follow this new directory structure and configuration method:

### 1. Create Base Directory
Create a folder named after your database (e.g., "MyStyleBase") inside the "style_databases" folder in your ComfyUI user directory ("ComfyUI/custom_nodes/DemonAlone-StyleSelector-ComfyUI/...".

**Path Structure:**
\`\`\`
style_databases/
└── [YourBaseName]/
    ├── styles.json
    └── previews/
        ├── style_name_1.jpg
        └── style_name_2.png
\`\`\`
### 2. Edit styles.json
The styles.json file must be placed directly inside your specific base folder. Add a record using the following JSON structure:

{
    "name": "The name of your style",
    "positive": "A positive for the style",
    "negative_prompt": "Negative for this style"
}

### 3. Add Preview Images
Images must be stored inside the previews subfolder of your base directory.

Supported formats: .png, .jpg, .jpeg, .webp
Resolution: Dimensions and proportions do not matter. Suggested size: 256x256. Format JPG is recommended.
Naming: The image filename must match the name field in "styles.json" exactly (case-sensitive). For example: "Cyberpunk.jpg".

## ⚠️ File Naming Constraints
To ensure compatibility across all operating systems (Windows, macOS, Linux), please adhere to the following rules when naming styles and preview images:

*   **Allowed Characters:** Use only standard alphanumeric characters ("a-z", "A-Z", "0-9") and basic symbols like underscores ("_") or hyphens ("-").
*   **Forbidden Symbols:** Avoid special characters such as forward slashes ("/"), backslashes ("\"), colons (":"), asterisks ("*"), question marks ("?"), and quotation marks. These may cause errors depending on your file system.
*   **Matching Names:** Ensure that the "name" field in "styles.json" exactly matches the preview image filename (case-sensitive).

### Recommended Naming Format:
**Example:** "Cyberpunk_Street.jpg" or "Cyberpunk-Street.png"
**Avoid:** "Cyberpunk/Street.jpg" or "Cyberpunk:City.jpg"

### 4. Load and Refresh Changes
After editing styles.json or adding new images, you need to refresh the node:

* Update List & Previews: Press the "Refresh style list" button inside the ComfyUI interface. This will update both the dropdown menu and the preview images instantly.
* New Base (First Time): When creating a brand new base for the very first time, press "Refresh style list", then perform a full page reload (F5 or Ctrl+R) to ensure the new base appears in the ComfyUI dropdown menu.

## ⚠️ Cleanup & Behavior Notes
* Deleting Previews: If you delete an image from the previews folder, the style will remain in the node's "Selected" area. To remove it from the selection list entirely, you must press the "Clear selected style" button.
* Multiple Databases: You cannot use styles from different base folders simultaneously within a single node instance.
* Workaround for Multiple Prompts: If you need to combine prompts from different bases, you can duplicate the node in your workflow and place them next to each other connected by a concat node to merge the final prompt.

## 🚧 Troubleshooting
If your image does not show a tooltip with prompts, or if you see an error message in the console:

    DA_StyleSelector: Style "YOUR STYLE NAME" not found in styles.json
* Ensure capitalization matches exactly (e.g., Cyberpunk vs cyberpunk).
* Verify the JSON syntax is correct and valid.

### Page Reload Behavior
While simple refresh works for most updates, remember that the initial registration of a new database folder may require a browser reload after pressing "Refresh style list".
`;

// --- Global styles injection ---
function ensureGlobalStyles() {
    if (document.getElementById('styleselector-gallery-styles')) return;

    const style = document.createElement('style');
    style.id = 'styleselector-gallery-styles';
    style.textContent = `
        .styleselector-root .styleselector-container { 
            display: flex; flex-direction: column; height: 100%; 
            font-family: sans-serif; overflow: hidden; 
            background-color: #1e1e1e; border-radius: 4px;
            contain: layout style;
            position: relative;
        }
        .styleselector-root .styleselector-selected-display { 
            padding: 12px 10px; background-color: #252525; 
            border-bottom: 1px solid #3a3a3a; flex-shrink: 0; 
            display: flex; align-items: center; gap: 8px;
        }
        .styleselector-root .styleselector-selected-display .label { font-size: 15px; color: #888; }
        .styleselector-root .styleselector-selected-display .selected-name { 
            color: #00FFC9; font-weight: bold; font-size: 15px; flex-grow: 1;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .styleselector-root .styleselector-controls { 
            display: flex; padding: 8px; gap: 8px; align-items: center; 
            flex-shrink: 0; background-color: #252525;
            border-bottom: 1px solid #3a3a3a; flex-wrap: wrap;
        }
        .styleselector-root .styleselector-controls input[type=text] { 
            flex-grow: 1; min-width: 100px; background: #333; color: #ccc; 
            border: 1px solid #555; padding: 12px 10px; border-radius: 4px; font-size: 15px;
        }
        .styleselector-root .styleselector-controls input[type=text]:focus { outline: none; border-color: #00FFC9; }
        .styleselector-root .styleselector-controls select {
            background: #333; color: #ccc; border: 1px solid #555;
            padding: 12px 10px; border-radius: 4px; font-size: 15px;
            cursor: pointer;
        }
        .styleselector-root .styleselector-controls button {
            background: #444; color: #fff; border: none; border-radius: 4px;
            padding: 6px 6px; cursor: pointer; font-size: 24px; flex-shrink: 0;
        }
        .styleselector-root .styleselector-controls button:hover { background: #555; }
        
        .styleselector-root .styleselector-size-control {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 10px; background-color: #252525;
            border-bottom: 1px solid #3a3a3a; flex-shrink: 0;
        }
        .styleselector-root .styleselector-size-control .size-label {
            flex-shrink: 0; line-height: 1;
        }
        .styleselector-root .styleselector-size-control .size-label-small { font-size: 15px; }
        .styleselector-root .styleselector-size-control .size-label-large { font-size: 20px; }
        .styleselector-root .styleselector-size-control .size-slider {
            flex-grow: 1; height: 8px; -webkit-appearance: none; appearance: none;
            background: #444; border-radius: 2px; outline: none; cursor: pointer;
        }
        .styleselector-root .styleselector-size-control .size-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none; width: 24px; height: 24px;
            background: #00A68C; border-radius: 50%; cursor: pointer;
            transition: background 0.2s;
        }
        .styleselector-root .styleselector-size-control .size-slider::-webkit-slider-thumb:hover {
            background: #008C74;
        }
        .styleselector-root .styleselector-size-control .size-slider::-moz-range-thumb {
            width: 14px; height: 14px; background: #00FFC9; border-radius: 50%;
            cursor: pointer; border: none;
        }
        
        .styleselector-root .styleselector-gallery { 
            flex: 1 1 0; min-height: 0; overflow-y: auto; overflow-x: hidden; 
            background-color: #1a1a1a;
            contain: strict;
        }
        .styleselector-root .styleselector-gallery-viewport {
            padding: 8px; 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); 
            gap: 8px; 
            align-content: start;
            position: relative;
        }
        .styleselector-root .styleselector-spacer {
            pointer-events: none;
        }
        .styleselector-root .styleselector-image-card { 
            cursor: pointer; border: 4px solid transparent; border-radius: 6px; 
            background-color: #2a2a2a; display: flex; flex-direction: column; 
            position: relative; overflow: visible;
            contain: layout style paint;
            transition: border-color 0.2s;
        }
        .styleselector-root .styleselector-image-card:hover { 
            border-color: #555;
        }
        .styleselector-root .styleselector-image-card.selected { 
            border-color: #00FFC9; box-shadow: 0 0 10px rgba(0, 255, 201, 0.3); 
        }
        .styleselector-root .styleselector-media-container { 
            width: 100%; background-color: #111; 
            overflow: hidden; display: flex; align-items: center; 
            justify-content: center; flex-shrink: 0;
        }
        .styleselector-root .styleselector-media-container img { 
            width: 100%; height: 100%; object-fit: cover;
        }
        .styleselector-root .styleselector-image-card-info { 
            padding: 4px 6px; background: #2a2a2a; flex-grow: 1;
            display: flex; align-items: center; justify-content: center;
        }
        .styleselector-root .styleselector-image-card p { 
            font-size: 8px; margin: 0; word-break: break-word; text-align: center; 
            color: #aaa; line-height: 1.2; max-height: 26px; overflow: hidden;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }

        /* Styles for the body-level tooltip (fixed positioning) */
        .styleselector-body-tooltip {
            position: fixed;
            z-index: 9999;
            background-color: rgba(10, 10, 10, 0.95);
            color: #eee;
            font-size: 12px;
            line-height: 1.4;
            padding: 8px 12px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            pointer-events: none;
            user-select: none;
            max-width: 280px;
            white-space: pre-wrap;
            word-break: break-word;
            display: none;
            border-left: 4px solid #00FFC9;
        }
        .styleselector-body-tooltip.visible {
            display: block;
        }
        
        .styleselector-body-tooltip .tooltip-label-pos {
            color: #00FFC9;
            font-weight: bold;
            margin-right: 4px;
        }
        .styleselector-body-tooltip .tooltip-content-text {
            color: #ccc;
            display: block;
            margin-top: 2px;
        }
        .styleselector-body-tooltip .tooltip-label-neg {
            color: #ff6b6b;
            font-weight: bold;
            margin-left: 0;
            margin-right: 4px;
        }

        .styleselector-root .styleselector-gallery::-webkit-scrollbar { width: 16px; }
        .styleselector-root .styleselector-gallery::-webkit-scrollbar-track { background: #2a2a2a; border-radius: 4px; }
        .styleselector-root .styleselector-gallery::-webkit-scrollbar-thumb { background-color: #555; border-radius: 4px; }
        .styleselector-root .styleselector-gallery::-webkit-scrollbar-thumb:hover { background-color: #777; }
        .styleselector-root .styleselector-loading, .styleselector-root .styleselector-no-images {
            grid-column: 1 / -1; text-align: center; padding: 20px; color: #666; font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

ensureGlobalStyles();

const DA_StyleSelectorNode = {
    name: "DA_StyleSelector",
    
    _pendingStateUpdates: new Map(),
    
    async setUiState(nodeId, galleryId, state) {
        const key = `${nodeId}-${galleryId}`;
        
        if (this._pendingStateUpdates.has(key)) {
            clearTimeout(this._pendingStateUpdates.get(key).timeout);
            state = { ...this._pendingStateUpdates.get(key).state, ...state };
        }
        
        const timeout = setTimeout(async () => {
            this._pendingStateUpdates.delete(key);
            try {
                await api.fetchApi("/styleselector/set_ui_state", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ node_id: nodeId, gallery_id: galleryId, state }),
                });
            } catch(e) {
                console.error("DA_StyleSelector: Failed to set UI state", e);
            }
        }, 1000);
        
        this._pendingStateUpdates.set(key, { timeout, state });
    },

    setup(nodeType) {
        if (nodeType.prototype._galleryInitialized) return;
        nodeType.prototype._galleryInitialized = true;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated?.apply(this, arguments);

            this._gallery = {
                isLoading: false,
                currentPage: 1,
                totalPages: 1,
                availableImages: [],
                selectedImages: [],
                sortOrder: "name",
                previewSize: 110,
                selectedDatabase: "",
                availableDatabases: [],
                elements: {},
                cachedHeights: { controls: 0, selectedDisplay: 0 },
                visibleRange: { start: 0, end: 0 },
                cardHeight: 140,
                columnsCount: 4,
            };
            
            if (!this.properties) this.properties = {};
            
            if (!this.properties.image_gallery_unique_id) {
                this.properties.image_gallery_unique_id = "style-selector-" + Math.random().toString(36).substring(2, 11);
            }
            
            const HEADER_HEIGHT = 80;
            const MIN_NODE_WIDTH = 600;
            const MIN_GALLERY_HEIGHT = 200;

            this.size = [600, 480];

            const node = this;
            const state = this._gallery;

            const originalConfigure = this.configure;
            this.configure = function(data) {
                const result = originalConfigure?.apply(this, arguments);
                return result;
            };

            // Hidden widgets
            const galleryIdWidget = this.addWidget("hidden_text", "image_gallery_unique_id_widget", 
                this.properties.image_gallery_unique_id, () => {}, {});
            galleryIdWidget.serializeValue = () => this.properties.image_gallery_unique_id;
            galleryIdWidget.draw = () => {};
            galleryIdWidget.computeSize = () => [0, 0];

            const selectionWidget = this.addWidget("hidden_text", "selected_image",
                this.properties.selected_image || "", () => {}, { multiline: false });
            selectionWidget.serializeValue = () => {
                return node.properties["selected_image"] || "";
            };

            const databaseWidget = this.addWidget("hidden_text", "database",
                this.properties.database || "", () => {}, {});
            databaseWidget.serializeValue = () => node.properties.database;
            databaseWidget.draw = () => {};
            databaseWidget.computeSize = () => [0, 0];
            
            // Container creation
            const widgetContainer = document.createElement("div");
            widgetContainer.className = "styleselector-container-wrapper";
            widgetContainer.dataset.captureWheel = "true";
            widgetContainer.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

            this.addDOMWidget("gallery", "div", widgetContainer, {});

            const uniqueId = `styleselector-gallery-${this.id}`;
            
            widgetContainer.innerHTML = `
                <div id="${uniqueId}" class="styleselector-root" style="height: 100%;">
                    <div class="styleselector-container">
                        <div class="styleselector-selected-display">
                            <span class="label">Selected:</span>
                            <span class="selected-name" title="">None</span>
                        </div>
                        <div class="styleselector-controls">
                            <select class="database-select" title="Select style database"></select>
                            <input type="text" class="search-input" placeholder="🔍 Search style...">
                            <button class="refresh-btn" title="Refresh style list">🔄</button>
                            <button class="clear-btn" title="Clear selected styles">🗑️</button>
                            <button class="help-btn" title="Help">❓</button>
                        </div>
                        <div class="styleselector-size-control">
                            <span class="size-label size-label-small">🖼️</span>
                            <input type="range" class="size-slider" min="80" max="180" value="100" title="Preview size">
                            <span class="size-label size-label-large">🖼️</span>
                        </div>
                        <div class="styleselector-gallery">
                            <div class="styleselector-gallery-viewport"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // --- Create a tooltip element in document.body (outside the node) ---
            const tooltipEl = document.createElement('div');
            tooltipEl.className = 'styleselector-body-tooltip';
            tooltipEl.id = `styleselector-tooltip-${this.id}`;
            document.body.appendChild(tooltipEl);
            
            // Caching elements
            const els = state.elements;
            els.root = widgetContainer.querySelector(`#${uniqueId}`);
            els.container = widgetContainer;
            els.mainContainer = widgetContainer.querySelector(".styleselector-container");
            els.gallery = widgetContainer.querySelector(".styleselector-gallery");
            els.viewport = widgetContainer.querySelector(".styleselector-gallery-viewport");
            els.searchInput = widgetContainer.querySelector(".search-input");
            els.selectedName = widgetContainer.querySelector(".selected-name");
            els.refreshBtn = widgetContainer.querySelector(".refresh-btn");
            els.clearBtn = widgetContainer.querySelector(".clear-btn");
            els.selectedDisplay = widgetContainer.querySelector(".styleselector-selected-display");
            els.controls = widgetContainer.querySelector(".styleselector-controls");
            els.sizeSlider = widgetContainer.querySelector(".size-slider");
            els.sizeControl = widgetContainer.querySelector(".styleselector-size-control");
            els.databaseSelect = widgetContainer.querySelector(".database-select");
            els.helpBtn = widgetContainer.querySelector(".help-btn");
            els.globalTooltip = tooltipEl;   // ссылка на body-тултип

            const cacheHeights = () => {
                if (els.controls) state.cachedHeights.controls = els.controls.offsetHeight;
                if (els.selectedDisplay) state.cachedHeights.selectedDisplay = els.selectedDisplay.offsetHeight;
            };

            // === API FUNCTIONS ===
            const getImages = async (page = 1, search = "", forceReload = false) => {
                state.isLoading = true;
                try {
                    const forceParam = forceReload ? '&force=true' : '';
                    const url = `/styleselector/get_images?page=${page}&per_page=100&search=${encodeURIComponent(search)}&database=${encodeURIComponent(state.selectedDatabase)}${forceParam}`;
                    const response = await api.fetchApi(url);
                    const data = await response.json();
                    state.totalPages = data.total_pages || 1;
                    state.currentPage = data.current_page || 1;
                    return data;
                } catch (error) {
                    console.error("DA_StyleSelector: Error fetching images:", error);
                    return { images: [], total_pages: 1, current_page: 1 };
                } finally {
                    state.isLoading = false;
                }
            };

            const fetchDatabases = async () => {
                try {
                    const response = await api.fetchApi("/styleselector/get_databases");
                    const data = await response.json();
                    state.availableDatabases = data.databases || [];
                } catch (e) {
                    console.error("DA_StyleSelector: Error fetching databases", e);
                    state.availableDatabases = [];
                }
                // Update dropdown list
                els.databaseSelect.innerHTML = "";
                if (state.availableDatabases.length === 0) {
                    const opt = document.createElement("option");
                    opt.textContent = "No databases found";
                    opt.disabled = true;
                    els.databaseSelect.appendChild(opt);
                } else {
                    state.availableDatabases.forEach(db => {
                        const opt = document.createElement("option");
                        opt.value = db;
                        opt.textContent = db;
                        els.databaseSelect.appendChild(opt);
                    });
                }
                // Set current database
                if (state.selectedDatabase && state.availableDatabases.includes(state.selectedDatabase)) {
                    els.databaseSelect.value = state.selectedDatabase;
                } else if (state.availableDatabases.length > 0) {
                    state.selectedDatabase = state.availableDatabases[0];
                    els.databaseSelect.value = state.selectedDatabase;
                } else {
                    state.selectedDatabase = "";
                }
                node.setProperty("database", state.selectedDatabase);
            };

            const updateSelection = () => {
                const widgetValue = state.selectedImages.join(', ');
                node.setProperty("selected_image", widgetValue);
                
                const widget = node.widgets.find(w => w.name === "selected_image");
                if (widget) widget.value = widgetValue;
                
                let displayText = "None";
                if (state.selectedImages.length > 0) {
                    const baseNames = state.selectedImages.map(fullName => {
                        const parts = fullName.split(/[\/\\]/);
                        const filenameWithExt = parts[parts.length - 1];
                        const extIndex = filenameWithExt.lastIndexOf('.');
                        return extIndex > -1 ? filenameWithExt.slice(0, extIndex) : filenameWithExt;
                    });
                    
                    const MAX_DISPLAY = 3;
                    if (baseNames.length <= MAX_DISPLAY) {
                        displayText = baseNames.join(', ');
                    } else {
                        displayText = baseNames.slice(0, MAX_DISPLAY).join(', ') + ` +${baseNames.length - MAX_DISPLAY} more`;
                    }
                }
                els.selectedName.textContent = displayText;
                els.selectedName.title = displayText;

                els.viewport.querySelectorAll('.styleselector-image-card').forEach(card => {
                    const originalName = card.dataset.originalName;
                    card.classList.toggle('selected', state.selectedImages.includes(originalName));
                });

                DA_StyleSelectorNode.setUiState(node.id, node.properties.image_gallery_unique_id, { 
                    selected_image: state.selectedImages,
                    preview_size: state.previewSize,
                    selected_database: state.selectedDatabase
                });
            };

            const EMPTY_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMjIyIi8+CjxwYXRoIGQ9Ik0zNSA2NUw0NSA1MEw1NSA2MEw2NSA0NUw3NSA2NUgzNVoiIGZpbGw9IiM0NDQiLz4KPGNpcmNsZSBjeD0iNjUiIGN5PSIzNSIgcj0iOCIgZmlsbD0iIzQ0NCIvPgo8L3N2Zz4=';

            const updatePreviewSize = (size) => {
                state.previewSize = size;
                if (!els.viewport) return;
                
                els.viewport.style.gridTemplateColumns = `repeat(auto-fill, minmax(${size}px, 1fr))`;
                
                const cardHeight = Math.round(size * 1.1);
                const imageHeight = Math.round(size * 0.9);
                state.cardHeight = cardHeight;
                
                els.viewport.style.setProperty('--card-height', `${cardHeight}px`);
                els.viewport.style.setProperty('--image-height', `${imageHeight}px`);
                
                state.visibleRange = { start: 0, end: 0 };
                renderVisibleCards();
            };

            const calculateGridMetrics = () => {
                if (!els.gallery) return;
                const galleryWidth = els.gallery.clientWidth - 16;
                const minCardWidth = state.previewSize;
                const gap = 8;
                state.columnsCount = Math.max(1, Math.floor((galleryWidth + gap) / (minCardWidth + gap)));
                state.cardHeight = Math.round(state.previewSize * 1.1);
            };

            const getFilteredImages = () => {
                const nameFilter = els.searchInput ? els.searchInput.value.toLowerCase() : '';
                return state.availableImages.filter(img => 
                    img.name.toLowerCase().includes(nameFilter)
                );
            };

            // --- Updated tooltip functions (using body-level tooltip) ---
            const showTooltip = (card, tooltipHtmlString) => {
                const tooltip = els.globalTooltip;
                if (!tooltip) return;
                
                tooltip.innerHTML = tooltipHtmlString;
                // Temporarily display to measure dimensions
                tooltip.style.visibility = 'hidden';
                tooltip.classList.add('visible');
                
                const cardRect = card.getBoundingClientRect();
                const tooltipWidth = tooltip.offsetWidth;
                const tooltipHeight = tooltip.offsetHeight;
                
                let left = cardRect.right + 8;
                let top = cardRect.top;
                
                // Prevent overflow on the right
                if (left + tooltipWidth > window.innerWidth - 8) {
                    left = cardRect.left - tooltipWidth - 8;
                }
                // Prevent overflow on the left
                if (left < 8) left = 8;
                
                // Center vertically relative to the card, but keep within viewport
                let topPos = cardRect.top + cardRect.height / 2 - tooltipHeight / 2;
                if (topPos < 8) topPos = 8;
                if (topPos + tooltipHeight > window.innerHeight - 8) {
                    topPos = window.innerHeight - tooltipHeight - 8;
                }
                
                tooltip.style.left = left + 'px';
                tooltip.style.top = topPos + 'px';
                tooltip.style.visibility = 'visible';
            };

            const hideTooltip = () => {
                if (els.globalTooltip) {
                    els.globalTooltip.classList.remove('visible');
                }
            };

            const renderVisibleCards = () => {
                if (!els.viewport || !els.gallery) return;
                
                const filteredImages = getFilteredImages();
                const totalImages = filteredImages.length;
                
                if (totalImages === 0) {
                    els.viewport.innerHTML = '<div class="styleselector-no-images">📂 No styles found<br><small>Add images to the styles folder</small></div>';
                    els.viewport.style.height = 'auto';
                    return;
                }

                calculateGridMetrics();
                
                const rowHeight = state.cardHeight + 8;
                const totalRows = Math.ceil(totalImages / state.columnsCount);
                const totalHeight = totalRows * rowHeight;
                
                const scrollTop = els.gallery.scrollTop;
                const viewportHeight = els.gallery.clientHeight;
                
                const buffer = 2;
                const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
                const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer);
                
                const startIndex = startRow * state.columnsCount;
                const endIndex = Math.min(totalImages, endRow * state.columnsCount);
                
                if (state.visibleRange.start === startIndex && state.visibleRange.end === endIndex) {
                    return;
                }
                
                state.visibleRange = { start: startIndex, end: endIndex };
                
                const topOffset = startRow * rowHeight;
                
                const fragment = document.createDocumentFragment();
                
                const topSpacer = document.createElement('div');
                topSpacer.className = 'styleselector-spacer';
                topSpacer.style.height = `${topOffset}px`;
                topSpacer.style.gridColumn = '1 / -1';
                fragment.appendChild(topSpacer);
                
                const imageHeight = Math.round(state.previewSize * 0.9);
                
                for (let i = startIndex; i < endIndex; i++) {
                    const img = filteredImages[i];
                    const card = document.createElement("div");
                    card.className = "styleselector-image-card";
                    
                    if (state.selectedImages.includes(img.original_name)) {
                        card.classList.add("selected");
                    }
                    
                    card.dataset.imageName = img.name;
                    card.dataset.originalName = img.original_name || img.name;
                    card.dataset.imageWidth = img.width || 0;
                    card.dataset.imageHeight = img.height || 0;
                    card.dataset.index = i;
                    
                    let displayName = img.name;
                    const extIndex = displayName.lastIndexOf('.');
                    if (extIndex > -1) {
                        displayName = displayName.slice(0, extIndex);
                    }
                    const escapedDisplayName = escapeHtml(displayName);

                    const safePosContent = escapeHtml(img.style_positive || "");
                    const safeNegContent = escapeHtml(img.style_negative || "");
                    
                    let tooltipHtml = `<span class="tooltip-label-pos">Positive:</span> <span class="tooltip-content-text">${safePosContent}</span>`;
                    if (img.style_negative) {
                        tooltipHtml += `</br><span class="tooltip-label-neg">Negative:</span> <span class="tooltip-content-text">${safeNegContent}</span>`;
                    } else {
                         tooltipHtml += `<div style="color:#888; font-size:10px; margin-top:4px;">No negative prompt defined</div>`;
                    }

                    card.dataset.tooltip = tooltipHtml;

                    card.innerHTML = `
                        <div class="styleselector-media-container" style="height: ${imageHeight}px;">
                            <img src="${img.preview_url || EMPTY_IMAGE}" loading="lazy" decoding="async" alt="${escapedDisplayName}">
                        </div>
                        <div class="styleselector-image-card-info">
                            <p>${escapedDisplayName}</p>
                        </div>
                    `;

                    const imgEl = card.querySelector("img");
                    imgEl.onerror = () => { imgEl.src = EMPTY_IMAGE; };
                    
                    fragment.appendChild(card);
                }
                
                const bottomOffset = totalHeight - (endRow * rowHeight);
                if (bottomOffset > 0) {
                    const bottomSpacer = document.createElement('div');
                    bottomSpacer.className = 'styleselector-spacer';
                    bottomSpacer.style.height = `${bottomOffset}px`;
                    bottomSpacer.style.gridColumn = '1 / -1';
                    fragment.appendChild(bottomSpacer);
                }
                
                els.viewport.innerHTML = '';
                els.viewport.appendChild(fragment);
            };

            // === Tooltip event handlers ===
            els.viewport.addEventListener("mouseenter", (e) => {
                const card = e.target.closest(".styleselector-image-card");
                if (!card) return;
                const tooltipHtmlString = card.dataset.tooltip;
                if (tooltipHtmlString) {
                    showTooltip(card, tooltipHtmlString);
                }
            }, true);

            els.viewport.addEventListener("mouseleave", (e) => {
                const card = e.target.closest(".styleselector-image-card");
                if (!card) return;
                hideTooltip();
            }, true);

            // Hide tooltip on gallery scroll
            els.gallery.addEventListener("scroll", () => {
                hideTooltip();
            }, { passive: true });

            // Click selection
            els.viewport.addEventListener("click", (e) => {
                const card = e.target.closest(".styleselector-image-card");
                if (!card) return;
                
                const originalName = card.dataset.originalName;
                const index = state.selectedImages.indexOf(originalName);
                
                if (index === -1) {
                    state.selectedImages.push(originalName);
                } else {
                    state.selectedImages.splice(index, 1);
                }
                
                updateSelection();
            });

            const fetchAndRender = async (append = false, forceReload = false) => {
                if (state.isLoading) return;
                
                const pageToFetch = append ? state.currentPage + 1 : 1;
                if (append && pageToFetch > state.totalPages) return;
                
                if (!append) {
                    els.viewport.innerHTML = '<div class="styleselector-loading">Loading images...</div>';
                    state.visibleRange = { start: 0, end: 0 };
                }
                
                const { images } = await getImages(
                    pageToFetch, 
                    els.searchInput.value,
                    forceReload
                );

                if (append) {
                    const existingNames = new Set(state.availableImages.map(i => i.name));
                    state.availableImages.push(...(images || []).filter(i => !existingNames.has(i.name)));
                } else {
                    state.availableImages = images || [];
                    els.gallery.scrollTop = 0;
                }
                
                renderVisibleCards();
                
                if (!append) cacheHeights();
            };

            // Search handler
            let searchTimeout;
            els.searchInput.addEventListener("input", () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    state.visibleRange = { start: 0, end: 0 };
                    renderVisibleCards();
                }, 150);
            });
            
            els.searchInput.addEventListener("keydown", (e) => { 
                if (e.key === 'Enter') {
                    fetchAndRender(false); 
                }
            });

            // Database selection change
            els.databaseSelect.addEventListener("change", async () => {
                const newDb = els.databaseSelect.value;
                if (newDb === state.selectedDatabase) return;
                state.selectedDatabase = newDb;
                node.setProperty("database", newDb);
                // Reset selected images when changing database
                state.selectedImages = [];
                updateSelection();
                await fetchAndRender(false);
                DA_StyleSelectorNode.setUiState(node.id, node.properties.image_gallery_unique_id, { 
                    selected_database: state.selectedDatabase,
                    selected_image: state.selectedImages,
                    preview_size: state.previewSize
                });
            });

            // Clear selected styles button
            els.clearBtn.addEventListener("click", () => {
                state.selectedImages = [];
                updateSelection();
                renderVisibleCards();
            });

            // Preview size slider
            let sizeSliderTimeout;
            els.sizeSlider.addEventListener("input", (e) => {
                const size = parseInt(e.target.value, 10);
                updatePreviewSize(size);
                
                clearTimeout(sizeSliderTimeout);
                sizeSliderTimeout = setTimeout(() => {
                    DA_StyleSelectorNode.setUiState(node.id, node.properties.image_gallery_unique_id, { 
                        preview_size: state.previewSize,
                        selected_database: state.selectedDatabase
                    });
                }, 500);
            });

            // Refresh button
            els.refreshBtn.addEventListener("click", () => {
                fetchAndRender(false, true);
            });

            // Help button: show help dialog with Markdown
            els.helpBtn.addEventListener("click", () => {
                const htmlContent = simpleMarkdownToHtml(HELP_MARKDOWN);
                app.ui.dialog.show(htmlContent);
            });

            let scrollRAF = null;
            let lastScrollTime = 0;
            const SCROLL_THROTTLE = 16;
            
            els.gallery.addEventListener('scroll', () => {
                const now = performance.now();
                if (now - lastScrollTime < SCROLL_THROTTLE) return;
                lastScrollTime = now;
                
                if (scrollRAF) return;
                
                scrollRAF = requestAnimationFrame(() => {
                    scrollRAF = null;
                    
                    renderVisibleCards();
                    
                    if (!state.isLoading && state.currentPage < state.totalPages) {
                        const { scrollTop, scrollHeight, clientHeight } = els.gallery;
                        if (scrollHeight - scrollTop - clientHeight < 300) {
                            fetchAndRender(true);
                        }
                    }
                });
            }, { passive: true });

            let resizeRAF = null;
            
            const fitHeight = () => {
                resizeRAF = null;
                if (!els.container) return;
                
                let topOffset = els.container.offsetTop;
                if (topOffset < 20) topOffset = 65;
                const bottomPadding = 32;
                const targetHeight = Math.max(0, node.size[1] - topOffset - bottomPadding);
                
                els.container.style.height = `${targetHeight}px`;
                els.container.style.width = "100%";
                
                calculateGridMetrics();
                state.visibleRange = { start: 0, end: 0 };
                renderVisibleCards();
            };

            this.onResize = function(size) {
                let minHeight = state.cachedHeights.selectedDisplay + state.cachedHeights.controls + HEADER_HEIGHT + MIN_GALLERY_HEIGHT;
                
                if (size[1] < minHeight) size[1] = minHeight;
                if (size[0] < MIN_NODE_WIDTH) size[0] = MIN_NODE_WIDTH;

                if (!resizeRAF) {
                    resizeRAF = requestAnimationFrame(fitHeight);
                }
            };

            this.initializeNode = async () => {
                // Load the list of databases
                await fetchDatabases();
                
                // Load saved state
                let initialState = { 
                    selected_image: [], 
                    preview_size: 110,
                    selected_database: state.selectedDatabase || (state.availableDatabases[0] || "")
                };
                
                try {
                    const url = `/styleselector/get_ui_state?node_id=${node.id}&gallery_id=${node.properties.image_gallery_unique_id}`;
                    const res = await api.fetchApi(url);
                    const loadedState = await res.json();
                    
                    let loadedSelected = loadedState.selected_image || [];
                    if (!Array.isArray(loadedSelected)) {
                        loadedSelected = loadedSelected ? [loadedSelected] : [];
                    }
                    initialState = { 
                        selected_image: loadedSelected, 
                        preview_size: loadedState.preview_size || 110,
                        selected_database: loadedState.selected_database || initialState.selected_database
                    };
                } catch(e) { 
                    console.error("[Gallery Debug] Failed to get initial UI state:", e); 
                }

                // Apply the database if it exists in the available list, otherwise take the first one
                if (initialState.selected_database && state.availableDatabases.includes(initialState.selected_database)) {
                    state.selectedDatabase = initialState.selected_database;
                } else if (state.availableDatabases.length > 0) {
                    state.selectedDatabase = state.availableDatabases[0];
                }
                els.databaseSelect.value = state.selectedDatabase;
                node.setProperty("database", state.selectedDatabase);

                state.previewSize = initialState.preview_size;
                if (els.sizeSlider) els.sizeSlider.value = state.previewSize;

                await fetchAndRender();

                updatePreviewSize(state.previewSize);

                state.selectedImages = initialState.selected_image.filter(name => name && typeof name === 'string');
                
                const existingSelectedImage = node.properties?.selected_image || "";
                if (existingSelectedImage && state.selectedImages.length === 0) {
                    const namesFromProp = existingSelectedImage.split(',').map(s => s.trim()).filter(s => s);
                    if (namesFromProp.length > 0) {
                        const matched = state.availableImages.filter(img => {
                            const base = img.name.replace(/\.[^/.]+$/, "");
                            return namesFromProp.includes(base);
                        }).map(img => img.original_name);
                        if (matched.length > 0) {
                            state.selectedImages = matched;
                        }
                    }
                }
                
                updateSelection();

                if (state.selectedImages.length > 0) {
                    const firstSelected = state.selectedImages[0];
                    const filteredImages = getFilteredImages();
                    const selectedIndex = filteredImages.findIndex(img => 
                        img.original_name === firstSelected
                    );
                    
                    if (selectedIndex >= 0) {
                        calculateGridMetrics();
                        const row = Math.floor(selectedIndex / state.columnsCount);
                        const rowHeight = state.cardHeight + 8;
                        const targetScrollTop = Math.max(0, (row * rowHeight) - (els.gallery.clientHeight / 2) + (rowHeight / 2));

                        setTimeout(() => {
                            els.gallery.scrollTop = targetScrollTop;
                            state.visibleRange = { start: 0, end: 0 };
                            renderVisibleCards();
                        }, 100);
                    }
                }
                
                DA_StyleSelectorNode.setUiState(node.id, node.properties.image_gallery_unique_id, { 
                    selected_database: state.selectedDatabase,
                    selected_image: state.selectedImages,
                    preview_size: state.previewSize
                });
            };

            const originalOnRemoved = this.onRemoved;
            this.onRemoved = function() {
                if (scrollRAF) cancelAnimationFrame(scrollRAF);
                if (resizeRAF) cancelAnimationFrame(resizeRAF);
                clearTimeout(searchTimeout);
                
                // Remove the body tooltip
                if (els.globalTooltip) {
                    els.globalTooltip.remove();
                }
                
                state.elements = {};
                state.availableImages = [];
                
                if (originalOnRemoved) originalOnRemoved.apply(this, arguments);
            };

            requestAnimationFrame(async () => {
                await this.initializeNode();
                fitHeight();
            });

        };
    }
};

app.registerExtension({
    name: "StyleSelector.SelectorUI",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "DA_StyleSelector") {
            DA_StyleSelectorNode.setup(nodeType);
        }
    },
});