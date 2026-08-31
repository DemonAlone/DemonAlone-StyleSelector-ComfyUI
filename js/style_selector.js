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
			
			
            // Hidden widget for ui_state
            const uiStateWidget = this.addWidget("hidden_text", "ui_state",
                this.properties.ui_state || "{}", () => {}, { multiline: true });
            uiStateWidget.serializeValue = () => node.properties.ui_state || "{}";
            uiStateWidget.draw = () => {};
            uiStateWidget.computeSize = () => [0, 0];
            
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
            els.globalTooltip = tooltipEl;   // link on body-tooltip

            const cacheHeights = () => {
                if (els.controls) state.cachedHeights.controls = els.controls.offsetHeight;
                if (els.selectedDisplay) state.cachedHeights.selectedDisplay = els.selectedDisplay.offsetHeight;
            };

            // === API FUNCTIONS ===
            const getImages = async (page = 1, search = "", forceReload = false) => {
                state.isLoading = true;
                try {
                    const forceParam = forceReload ? '&force=true' : '';
                    const url = `/styleselector/get_images?page=${page}&per_page=300&search=${encodeURIComponent(search)}&database=${encodeURIComponent(state.selectedDatabase)}${forceParam}`;
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
			
            // Function to update ui_state widget and sync other widgets
            const updateUiState = (updates) => {
                let currentState = {};
                try {
                    const raw = uiStateWidget.value;
                    if (raw) currentState = JSON.parse(raw);
                } catch(e) {}
                
                Object.assign(currentState, updates);
                const newJson = JSON.stringify(currentState);
                uiStateWidget.value = newJson;
                node.setProperty("ui_state", newJson);
                
                // Synchronize separate widgets for compatibility (though they may not be used directly)
                if ('selected_image' in updates) {
                    const selectedList = updates.selected_image || [];
                    const strVal = selectedList.join(', ');
                    node.setProperty("selected_image", strVal);
                    if (selectionWidget) selectionWidget.value = strVal;
                }
                if ('selected_database' in updates) {
                    const db = updates.selected_database || "";
                    node.setProperty("database", db);
                    if (databaseWidget) databaseWidget.value = db;
                }
                // trigger node update (optional)
                // node.onNodeChange?.();
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

                // Save state to ui_state (only selected_image)
                updateUiState({ selected_image: state.selectedImages });
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
			const createCardElement = (img, imageHeight) => {
				const card = document.createElement("div");
				card.className = "styleselector-image-card";

				if (state.selectedImages.includes(img.original_name)) {
					card.classList.add("selected");
				}

				card.dataset.imageName = img.name;
				card.dataset.originalName = img.original_name || img.name;
				card.dataset.imageWidth = img.width || 0;
				card.dataset.imageHeight = img.height || 0;

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

				return card;
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

				// If there are few images (for example, < 300) – render everything without virtualization
				const USE_VIRTUALIZATION = totalImages >= 300;

				if (!USE_VIRTUALIZATION) {
					// Simple rendering of all cards
					const imageHeight = Math.round(state.previewSize * 0.9);
					const fragment = document.createDocumentFragment();

					for (let i = 0; i < totalImages; i++) {
						const img = filteredImages[i];
						const card = createCardElement(img, imageHeight);
						fragment.appendChild(card);
					}

					els.viewport.innerHTML = '';
					els.viewport.appendChild(fragment);
					// We save the “visible range” as all elements to avoid unnecessary redraws
					state.visibleRange = { start: 0, end: totalImages };
					return;
				}

				// --- Below is virtualization for large databases (more than 300 elements) ---
				const rowHeight = state.cardHeight + 8;
				const totalRows = Math.ceil(totalImages / state.columnsCount);
				const totalHeight = totalRows * rowHeight;

				const scrollTop = els.gallery.scrollTop;
				const viewportHeight = els.gallery.clientHeight;

				const buffer = 5; // increased the buffer for better UX
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
					const card = createCardElement(img, imageHeight);
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
                // Save database and cleared selection
                updateUiState({ selected_database: state.selectedDatabase, selected_image: state.selectedImages });
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
				// Save preview_size
                
                clearTimeout(sizeSliderTimeout);
                sizeSliderTimeout = setTimeout(() => {
                    updateUiState({ preview_size: state.previewSize });
                }, 500);
            });

            // Refresh button
            els.refreshBtn.addEventListener("click", () => {
                fetchAndRender(false, true);
            });

            // Help button: show help dialog with Markdown
			let cachedHelpHTML = null;

			els.helpBtn.addEventListener("click", async () => {
				// If already loaded, show it immediately
				if (cachedHelpHTML) {
					app.ui.dialog.show(cachedHelpHTML);
					return;
				}

				try {
					// Determine the path to the .md file relative to the current script
					const scriptUrl = import.meta.url;
					// Get the base directory (where style_selector.js is located)
					const baseDir = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
					// Formulate the path to the .md file (assuming it's located next to docs/)
					const mdUrl = new URL('docs/DA_StyleSelector.md', baseDir).href;

					const response = await fetch(mdUrl);
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					const markdownText = await response.text();
					// Convert Markdown to HTML
					const htmlContent = simpleMarkdownToHtml(markdownText);
					// Save to cache
					cachedHelpHTML = htmlContent;
					// Show the dialog
					app.ui.dialog.show(htmlContent);
				} catch (error) {
					console.error('Failed to load help file:', error);
					// Display an error message if loading failed
					app.ui.dialog.show('<p>⚠️ Failed to load help. Check for the presence of the <code>DA_StyleSelector.md</code> file in the folder <code>js/docs/</code>.</p>');
				}
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
                
                // Read initial state from ui_state widget
                let initialState = { 
                    selected_image: [], 
                    preview_size: 110,
                    selected_database: state.selectedDatabase || (state.availableDatabases[0] || "")
                };
                
                try {
                    const rawState = uiStateWidget.value;
                    if (rawState) {
                        const parsed = JSON.parse(rawState);
                        if (parsed.selected_image) initialState.selected_image = parsed.selected_image;
                        if (parsed.preview_size) initialState.preview_size = parsed.preview_size;
                        if (parsed.selected_database) initialState.selected_database = parsed.selected_database;
                    }
                } catch(e) {
                    console.warn("Failed to parse ui_state:", e);
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
                
                // fallback: if we have selected_image in properties but not in ui_state (for compatibility)
                if (state.selectedImages.length === 0 && node.properties.selected_image) {
                    const existingSelectedImage = node.properties.selected_image || "";
                    const namesFromProp = existingSelectedImage.split(',').map(s => s.trim()).filter(s => s);
                    if (namesFromProp.length > 0) {
                        const matched = state.availableImages.filter(img => {
                            const base = img.name.replace(/\.[^/.]+$/, "");
                            return namesFromProp.includes(base);
                        }).map(img => img.original_name);
                        if (matched.length > 0) {
                            state.selectedImages = matched;
							// Save to ui_state
                            updateUiState({ selected_image: state.selectedImages });
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
                
                // Initial save of full state (ensure consistency)
                updateUiState({
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

            return result;
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