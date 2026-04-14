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

// --- Global styles injection (called once on extension load) ---
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
            font-size: 7px; margin: 0; word-break: break-word; text-align: center; 
            color: #aaa; line-height: 1.2; max-height: 26px; overflow: hidden;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }

        /* Styles for global tooltip */
        .styleselector-root .global-tooltip {
            position: absolute;
            z-index: 1000;
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

        .styleselector-root .global-tooltip.visible {
            display: block;
        }

        .styleselector-root .tooltip-label-pos {
            color: #00FFC9;
            font-weight: bold;
            margin-right: 4px;
        }
        
        .styleselector-root .tooltip-content-text {
            color: #ccc;
            display: block;
            margin-top: 2px;
        }

        .styleselector-root .tooltip-label-neg {
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

// Called globally on module load
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
			// Size limits
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
                const val = node.properties["selected_image"] || "";
                return val;
            };
            
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
                            <input type="text" class="search-input" placeholder="🔍 Search style...">
                            <button class="refresh-btn" title="Refresh style list">🔄</button>
                        </div>
                        <div class="styleselector-size-control">
                            <span class="size-label size-label-small">🖼️</span>
                            <input type="range" class="size-slider" min="80" max="180" value="100" title="Preview size">
                            <span class="size-label size-label-large">🖼️</span>
                        </div>
                        <div class="styleselector-gallery">
                            <div class="styleselector-gallery-viewport"></div>
                        </div>
                        <div class="global-tooltip"></div>
                    </div>
                </div>
            `;
            
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
            els.selectedDisplay = widgetContainer.querySelector(".styleselector-selected-display");
            els.controls = widgetContainer.querySelector(".styleselector-controls");
            els.sizeSlider = widgetContainer.querySelector(".size-slider");
            els.sizeControl = widgetContainer.querySelector(".styleselector-size-control");
            els.globalTooltip = widgetContainer.querySelector(".global-tooltip");

            const cacheHeights = () => {
                if (els.controls) state.cachedHeights.controls = els.controls.offsetHeight;
                if (els.selectedDisplay) state.cachedHeights.selectedDisplay = els.selectedDisplay.offsetHeight;
            };

            // === API FUNCTIONS ===
            const getImages = async (page = 1, search = "") => {
                state.isLoading = true;
                try {
                    const url = `/styleselector/get_images?page=${page}&per_page=100&search=${encodeURIComponent(search)}`;
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
                    preview_size: state.previewSize
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

            // Function to show global tooltip
            const showTooltip = (card, tooltipHtmlString) => {
                if (!els.globalTooltip || !els.root) return;
                
                els.globalTooltip.innerHTML = tooltipHtmlString; 
                els.globalTooltip.classList.add('visible');
                
                const rootRect = els.root.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
                const tooltipRect = els.globalTooltip.getBoundingClientRect();
                
                let scale = 1;
                let parent = els.root.parentElement;
                while (parent) {
                    const transform = window.getComputedStyle(parent).transform;
                    if (transform && transform !== 'none') {
                        const matrix = transform.match(/matrix\(([^)]+)\)/);
                        if (matrix) {
                            const values = matrix[1].split(',').map(parseFloat);
                            scale = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
                            break;
                        }
                    }
                    if (parent.classList.contains('litegraph') || parent.classList.contains('graph-canvas')) break;
                    parent = parent.parentElement;
                }
                
                let left = (cardRect.right - rootRect.left) / scale + 8;
                let top = (cardRect.top - rootRect.top) / scale;
                
                const tooltipWidth = tooltipRect.width / scale;
                const rootWidth = rootRect.width / scale;
                const tooltipHeight = tooltipRect.height / scale;
                const rootHeight = rootRect.height / scale;
                
                if (left + tooltipWidth > rootWidth - 8) {
                    left = (cardRect.left - rootRect.left) / scale - tooltipWidth - 8;
                }
                
                const maxTop = rootHeight - tooltipHeight - 8;
                if (top > maxTop) top = maxTop;
                if (top < 8) top = 8;
                
                els.globalTooltip.style.left = left + 'px';
                els.globalTooltip.style.top = top + 'px';
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

            // === Tooltip handlers (delegation) ===
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

            els.gallery.addEventListener("scroll", () => {
                hideTooltip();
            }, { passive: true });

            // Click for style selection
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

            const fetchAndRender = async (append = false) => {
                if (state.isLoading) return;
                
                const pageToFetch = append ? state.currentPage + 1 : 1;
                if (append && pageToFetch > state.totalPages) return;
                
                if (!append) {
                    els.viewport.innerHTML = '<div class="styleselector-loading">Loading images...</div>';
                    state.visibleRange = { start: 0, end: 0 };
                }
                
                const { images } = await getImages(
                    pageToFetch, 
                    els.searchInput.value
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

            // Search
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

            // Preview size slider
            let sizeSliderTimeout;
            els.sizeSlider.addEventListener("input", (e) => {
                const size = parseInt(e.target.value, 10);
                updatePreviewSize(size);
                
                clearTimeout(sizeSliderTimeout);
                sizeSliderTimeout = setTimeout(() => {
                    DA_StyleSelectorNode.setUiState(node.id, node.properties.image_gallery_unique_id, { 
                        preview_size: state.previewSize 
                    });
                }, 500);
            });

            // Refresh button
            els.refreshBtn.addEventListener("click", () => {
                fetchAndRender(false);
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
                const existingSelectedImage = node.properties?.selected_image || "";
                
                let initialState = { 
                    selected_image: [], 
                    preview_size: 110 
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
                        preview_size: loadedState.preview_size || 110 
                    };
                } catch(e) { 
                    console.error("[Gallery Debug] Failed to get initial UI state:", e); 
                }

                state.previewSize = initialState.preview_size;
                if (els.sizeSlider) els.sizeSlider.value = state.previewSize;

                await fetchAndRender();

                updatePreviewSize(state.previewSize);

                state.selectedImages = initialState.selected_image.filter(name => name && typeof name === 'string');
                
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
            };

            const originalOnRemoved = this.onRemoved;
            this.onRemoved = function() {
                if (scrollRAF) cancelAnimationFrame(scrollRAF);
                if (resizeRAF) cancelAnimationFrame(resizeRAF);
                clearTimeout(searchTimeout);
                
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
