import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

console.log("%c[DA_StyleSelector] JS File Initialization Started!", "color: #00FFC9; font-weight: bold;");

// === (CACHE BUSTING) ===
let cacheVersion = Date.now(); // Cache version counter to force browser cache reset on update

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

function ensureGlobalStyles() {
    if (document.getElementById('styleselector-v2-global-tooltip-style')) return;
    const style = document.createElement('style');
    style.id = 'styleselector-v2-global-tooltip-style';
    style.textContent = `
        .ss-v2-body-tooltip {
            position: fixed; z-index: 9999; background-color: rgba(10, 10, 10, 0.95);
            color: #eee; font-size: 12px; line-height: 1.4; padding: 8px 12px;
            border-radius: 4px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            pointer-events: none; user-select: none; max-width: 280px;
            white-space: pre-wrap; word-break: break-word; display: none;
            border-left: 4px solid #00FFC9; font-family: sans-serif;
        }
        .ss-v2-body-tooltip.visible { display: block; }
        .ss-v2-body-tooltip .t-pos { color: #00FFC9; font-weight: bold; }
        .ss-v2-body-tooltip .t-neg { color: #ff6b6b; font-weight: bold; }
        .ss-v2-body-tooltip .t-txt { color: #ccc; display: block; margin-top: 2px; margin-bottom: 4px; }
		
		/* Hover for style cards */
        .ss-card { transition: border-color 0.15s ease, filter 0.15s ease; }
        .ss-card:hover { 
            border-color: #666 !important; /* Light gray border on hover */
            filter: brightness(1.15);      /* Slight brightening of background */
        }
        /* If card is already selected, hover should not override the green color */
        .ss-card.selected:hover { border-color: #00FFC9 !important; }

        /* Hover for control buttons */
        .ss-btn { transition: background-color 0.2s ease, transform 0.1s ease; }
        .ss-btn:hover { 
            background-color: #555 !important; /* Lighter background */
            transform: translateY(-1px);       /* Slight lift */
        }
        .ss-btn:active { transform: translateY(0); }
    `;
    document.head.appendChild(style);
}
ensureGlobalStyles();
function createSvgPlaceholder(text) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
        <rect width="100%" height="100%" fill="#2a2a2a"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-family="sans-serif" font-size="12">${text}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const DA_StyleSelectorNode = {
    name: "DA_StyleSelector",
	async onCreate(node) {
		console.log("[DA_StyleSelector] onCreate called for node ID:", node.id);
		
        // 1. Set node size
        node.size = [640, 600];

        // 2. MANUAL WIDGET CREATION (Critical for passing data to Python)
		const selectionWidget = node.addWidget("hidden_text", "selected_styles", "", () => {}, { multiline: false });
        selectionWidget.serializeValue = () => node.properties["selected_styles"] || "";
	
		selectionWidget.draw = () => {};
		selectionWidget.computeSize = () => [0, 0];
		
		const databaseWidget = node.addWidget("hidden_text", "database", "__all__", () => {}, {});
		databaseWidget.serializeValue = () => node.properties.database || "__all__";
		databaseWidget.draw = () => {};
		databaseWidget.computeSize = () => [0, 0];
		
		const uiStateWidget = node.addWidget("hidden_text", "ui_state", "{}", () => {}, { multiline: true });
		uiStateWidget.serializeValue = () => node.properties.ui_state || "{}";
		uiStateWidget.draw = () => {};
		uiStateWidget.computeSize = () => [0, 0];
		
		if (!node.properties) node.properties = {};
		if (!node.properties.selected_styles) node.properties.selected_styles = "";
		if (!node.properties.database) node.properties.database = "__all__";
		if (!node.properties.ui_state) node.properties.ui_state = "{}";


        //  Local State
        let allStyles = [];
        let selectedStyleIds = new Set();
        let activeTag = null;
        let cacheVersion = Date.now(); // For preview cache reset

        // Tooltip
        let tooltipEl = document.getElementById("ss-v2-global-tooltip");
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'ss-v2-body-tooltip';
            tooltipEl.id = "ss-v2-global-tooltip";
            document.body.appendChild(tooltipEl);
        }

        // 3. DOM Structure
        const container = document.createElement("div");
        container.style.cssText = "display:flex; flex-direction:column; width:100%; height:100%; flex: 1 1 0px; min-width: 0px; min-height: 0px; background-color:#1e1e1e; color:#ccc; font-family:sans-serif; overflow:hidden; border-radius:4px;";
        container.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

        // 1. Panel for displaying selected elements
        const selectedDisplay = document.createElement("div");
        selectedDisplay.style.cssText = "padding:10px; background:#252525; border-bottom:1px solid #3a3a3a; font-size:14px; flex-shrink:0; display:flex; gap:6px; overflow:hidden;";
        selectedDisplay.innerHTML = `<span style="color:#888;">Selected:</span>`;
        const selectedNameSpan = document.createElement("span");
        selectedNameSpan.style.cssText = "color:#00FFC9; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex-grow:1;";
        selectedNameSpan.textContent = "None";
        selectedDisplay.appendChild(selectedNameSpan);
        container.appendChild(selectedDisplay);

        // 2. Control Panel (Database selector, search, buttons)
        const controls = document.createElement("div");
        controls.style.cssText = "display:flex; padding:8px; gap:8px; background:#252525; align-items:center; flex-shrink:0; border-bottom:1px solid #3a3a3a;";
        
        const dbSelect = document.createElement("select");
        dbSelect.style.cssText = "background:#333; color:#fff; border:1px solid #555; padding:8px 6px; border-radius:4px; max-width:140px; cursor:pointer;";
        
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search style or tag...";
        searchInput.style.cssText = "flex-grow:1; background:#333; color:#fff; border:1px solid #555; padding:8px 10px; border-radius:4px; font-size:14px;";

        const clearBtn = document.createElement("button");
		clearBtn.className = "ss-btn";
        clearBtn.textContent = "🗑️";
        clearBtn.title = "Clear selected styles";
        clearBtn.style.cssText = "background:#444; color:#fff; border:none; border-radius:4px; padding:4px 6px; cursor:pointer; font-size:20px;";
		
		const refreshBtn = document.createElement("button");
		refreshBtn.textContent = "🔄";
		refreshBtn.className = "ss-btn";
		refreshBtn.title = "Refresh styles and previews";
		refreshBtn.style.cssText = "background:#444; color:#fff; border:none; border-radius:4px; padding:4px 6px; cursor:pointer; font-size:20px;";

        const helpBtn = document.createElement("button");
        helpBtn.textContent = "❓";
		helpBtn.className = "ss-btn";
        helpBtn.title = "Help";
        helpBtn.style.cssText = "background:#444; color:#fff; border:none; border-radius:4px; padding:4px 6px; cursor:pointer; font-size:20px;";

		
        controls.appendChild(dbSelect);
        controls.appendChild(searchInput);
		controls.appendChild(refreshBtn);
        controls.appendChild(clearBtn);
        controls.appendChild(helpBtn);
        container.appendChild(controls);

        // 3. Tags Panel
        const tagsPanel = document.createElement("div");
        tagsPanel.style.cssText = "display:flex; gap:6px; padding:6px 8px; background:#252525; flex-wrap:wrap; font-size:11px; flex-shrink:0; max-height: 60px; overflow-y:auto;";
        container.appendChild(tagsPanel);

	
		// 4. Scrollable Gallery
		const galleryScroll = document.createElement("div");
		galleryScroll.style.cssText = "flex: 1 1 0px; min-width: 0px; min-height: 0px; overflow-y:auto; padding:8px; background-color:#1a1a1a;";
		
		const grid = document.createElement("div");
		// Flex-wrap instead of Grid for reliable adaptability in Nodes 2.0
		grid.style.cssText = "display:flex; flex-wrap:wrap; gap:8px; align-content:flex-start; width:100%;";
		
		galleryScroll.appendChild(grid);
		container.appendChild(galleryScroll);
		node.addDOMWidget("style_gallery_widget", "div", container);

        // Lazy Load Observer
        const lazyImageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                    observer.unobserve(img);
                }
            });
        });

        // === FIX FOR NODES 2.0: GLOBAL WHEEL INTERCEPTION ===
        // In Nodes 2.0, the canvas intercepts wheel events globally.
        // To enable scrolling inside the node without focus, use capture phase.
        const wheelHandler = (e) => {
            // Check if the target element (or its parent) is inside our gallery
            if (galleryScroll.contains(e.target)) {
                e.stopPropagation();
            }
        };
        
        // passive: true is mandatory, otherwise browser might block scroll due to synchronicity
        // capture: true is critical — intercept BEFORE event reaches canvas
        document.addEventListener('wheel', wheelHandler, { passive: true, capture: true });
        
        // Save reference to handler so it can be removed when node is destroyed
        node._ss_wheelHandler = wheelHandler;
        
        // Optionally: cleanup on node removal (if ComfyUI ever starts calling onDestroy)
        const originalOnRemoved = node.onRemoved;
        node.onRemoved = function() {
            document.removeEventListener('wheel', wheelHandler, { capture: true });
            if (originalOnRemoved) originalOnRemoved.call(this);
        };

        // --- UI Update Logic ---
		const updateSelectionUI = () => {
			const arr = Array.from(selectedStyleIds);
			
			if (arr.length === 0) {
				selectedNameSpan.textContent = "None";
			} else {
				const names = arr.map(id => id.split("/")[1]);
				selectedNameSpan.textContent = names.length <= 3 ? names.join(", ") : `${names.slice(0,3).join(", ")} +${names.length - 3} more`;
			}

			const strVal = arr.join(", ");
			selectionWidget.value = strVal;
			node.properties["selected_styles"] = strVal;

			const stateObj = { selected_styles: arr, selected_database: dbSelect.value };
			const jsonVal = JSON.stringify(stateObj);
			uiStateWidget.value = jsonVal;
			node.properties["ui_state"] = jsonVal;

			databaseWidget.value = dbSelect.value;
			node.properties["database"] = dbSelect.value;

			// Update borders via classes
			grid.querySelectorAll('.ss-card').forEach(card => {
				if (selectedStyleIds.has(card.dataset.id)) {
					card.classList.add("selected");
					card.style.borderColor = "#00FFC9";
				} else {
					card.classList.remove("selected");
					card.style.borderColor = "transparent";
				}
			});

			if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
			if (app.graph.setDirtyCanvas) app.graph.setDirtyCanvas(true, true);
		};

        const showTooltip = (card, style) => {

            tooltipEl.innerHTML = `<span class="t-pos">Positive:</span><span class="t-txt">${escapeHtml(style.positive || 'None')}</span>`;
            if (style.negative) {
                tooltipEl.innerHTML += `<span class="t-neg">Negative:</span><span class="t-txt">${escapeHtml(style.negative)}</span>`;

            }
            tooltipEl.classList.add('visible');
            const rect = card.getBoundingClientRect();
            let left = rect.right + 8;
            if (left + tooltipEl.offsetWidth > window.innerWidth) left = rect.left - tooltipEl.offsetWidth - 8;
            let top = rect.top + rect.height/2 - tooltipEl.offsetHeight/2;
            tooltipEl.style.left = `${Math.max(8, left)}px`;
            tooltipEl.style.top = `${document.documentElement.scrollTop + Math.max(8, top)}px`;
        };

        // Create style card
		const createCard = (style) => {
			const card = document.createElement("div");
			card.className = "ss-card"; // Class for CSS hover
			card.dataset.id = style.id;
			
			card.style.cssText = "width:128px; background:#2a2a2a; border-radius:6px; overflow:hidden; cursor:pointer; display:flex; flex-direction:column; border:3px solid transparent; flex-shrink:0;";
			
			if (selectedStyleIds.has(style.id)) {
				card.classList.add("selected"); // Add class instead of inline style
				card.style.borderColor = "#00FFC9";
			}

			const imgContainer = document.createElement("div");
			imgContainer.style.cssText = "width:100%; height:100px; background:#111; display:flex; align-items:center; justify-content:center; overflow:hidden;";
			const img = document.createElement("img");
			img.style.cssText = "width:100%; height:100%; object-fit:cover;";
			
			if (style.preview_url) {
				const separator = style.preview_url.includes('?') ? '&' : '?';
				img.dataset.src = `${style.preview_url}${separator}v=${cacheVersion}`;
				img.src = createSvgPlaceholder("Loading...");
				lazyImageObserver.observe(img);
			} else {
				img.src = createSvgPlaceholder(style.name.substring(0, 10));
			}
			
			imgContainer.appendChild(img);
			card.appendChild(imgContainer);
			
			// Card's setting
			const info = document.createElement("div");
			info.style.cssText = "padding:6px; font-size:9px; text-align:center; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; color:#aaa;";
			info.textContent = style.name;
			card.appendChild(info);

			card.addEventListener("click", () => {
				if (selectedStyleIds.has(style.id)) selectedStyleIds.delete(style.id);
				else selectedStyleIds.add(style.id);
				updateSelectionUI();
			});

			card.addEventListener("mouseenter", () => showTooltip(card, style));
			card.addEventListener("mouseleave", () => tooltipEl.classList.remove('visible'));

			return card;
		};

        // Render entire grid
        const renderGrid = () => {
            grid.innerHTML = "";
            const filterText = searchInput.value.toLowerCase();
            
            // Filtering and rendering in one loop (optimization)
            allStyles.forEach(style => {
                const matchesSearch = style.name.toLowerCase().includes(filterText) || (style.tags && style.tags.some(t => t.toLowerCase().includes(filterText)));
                const matchesTag = !activeTag || (style.tags && style.tags.includes(activeTag));
                
                if (matchesSearch && matchesTag) {
                    const card = createCard(style);
                    grid.appendChild(card); 
					// IMPORTANT: observe called here, after appendChild, so element is in DOM
                    const img = card.querySelector('img');
                    if (img && img.dataset.src) {
                        lazyImageObserver.observe(img);
                    }
                }

            });

            renderTagsPanel();
        };

        const renderTagsPanel = () => {
            tagsPanel.innerHTML = "";
            // Simple collection of unique tags from all styles (optimized version)
            const uniqueTags = new Set();
            allStyles.forEach(style => {
                if (style.tags) style.tags.forEach(t => uniqueTags.add(t));
            });

            uniqueTags.forEach(tag => {
                const badge = document.createElement("span");
                badge.style.cssText = "padding:3px 8px; border-radius:12px; background:#444; cursor:pointer; user-select:none; color:#eee; font-weight:500;";
                if (activeTag === tag) {
                    badge.style.background = "#00FFC9"; badge.style.color = "#000";
                }
                badge.textContent = tag;
                badge.addEventListener("click", () => {
                    activeTag = (activeTag === tag) ? null : tag;
                    renderGrid();
                });
                tagsPanel.appendChild(badge);
            });
        };

        // Load styles
        const loadStyles = async () => {
			console.log("[DA_StyleSelector] loadStyles called, database:", dbSelect.value);
            const db = dbSelect.value || "__all__";
            databaseWidget.value = db;
            node.properties["database"] = db;

            try {
                const response = await api.fetchApi(`/styleselector/v2/get_styles?database=${db}`);
                const data = await response.json();
				console.log("[DA_StyleSelector] Styles received:", data.styles ? data.styles.length : 0);
                allStyles = data.styles || [];
				renderGrid();
            } catch (e) { 
                console.error("[DA_StyleSelector] Error loading styles:", e); 
            }
        };

        // --- DATABASE LOADING AND EVENTS ---
        try {
            const response = await api.fetchApi("/styleselector/v2/databases");
            const data = await response.json();
			console.log("[DA_StyleSelector] Available databases:", data.databases);
            dbSelect.innerHTML = '<option value="__all__">✨ All Databases</option>';
            if (data.databases) {
                data.databases.forEach(db => {
                    const opt = document.createElement("option");
					opt.value = db; 
                    opt.textContent = db;
                    dbSelect.appendChild(opt);
                });
            }
        } catch (e) { 
            console.error("[DA_StyleSelector] Error loading databases:", e);
		}
        // Event Handlers
        dbSelect.addEventListener("change", async () => {
            const newDb = dbSelect.value;
            databaseWidget.value = newDb;
            node.properties["database"] = newDb;
            uiStateWidget.value = JSON.stringify({ selected_styles: Array.from(selectedStyleIds), selected_database: newDb });
            node.properties["ui_state"] = uiStateWidget.value;
            await loadStyles();
        });
        
        searchInput.addEventListener("input", renderGrid);
        
        galleryScroll.addEventListener("scroll", () => {
            tooltipEl.classList.remove('visible');
        }, { passive: true });

        clearBtn.addEventListener("click", () => {
            selectedStyleIds.clear();
            updateSelectionUI();
        });

        // === UPDATED REFRESH BUTTON HANDLER (PATCH INTEGRATION) ===
        refreshBtn.addEventListener("click", async () => {
            console.log("[DA_StyleSelector] Forced refresh + cache reset...");
            
            // 1. Increment cache version
            cacheVersion = Date.now();
            
            // 2. Clear styles memory
            allStyles = [];
            
            // 3. Reload databases
            try {
                const response = await api.fetchApi("/styleselector/v2/databases");
                const data = await response.json();
                dbSelect.innerHTML = '<option value="__all__">✨ All Databases</option>';
                if (data.databases) {
                    data.databases.forEach(db => {
                        const opt = document.createElement("option");
						opt.value = db;
                        opt.textContent = db;
                        dbSelect.appendChild(opt);
                    });
                }
            } catch (e) { console.error(e); }
            
            // 4. Reload styles (they will get new ?v=timestamp on render)
            await loadStyles();
            updateSelectionUI();
        });


        let cachedHelpHTML = null;
        helpBtn.addEventListener("click", async () => {
            if (cachedHelpHTML) { app.ui.dialog.show(cachedHelpHTML); return; }
            try {
                const response = await fetch(new URL('docs/DA_StyleSelector.md', import.meta.url).href);
                if (response.ok) {
                    cachedHelpHTML = simpleMarkdownToHtml(await response.text());
                    app.ui.dialog.show(cachedHelpHTML);
                }
            } catch { app.ui.dialog.show('<p>⚠️ Failed to load help markdown.</p>'); }
        });

        // --- STATE RESTORATION --- . Execute synchronously immediately after creating all elements, without setTimeout
        (function restoreState() {
            if (uiStateWidget.value && uiStateWidget.value !== "{}") {
                try {
                    const savedState = JSON.parse(uiStateWidget.value);
                    console.log("[DA_StyleSelector] Restoring state:", savedState);
                    
                    // Restore database first
                    if (savedState.selected_database) {
                        dbSelect.value = savedState.selected_database;
                        databaseWidget.value = savedState.selected_database;
                        node.properties["database"] = savedState.selected_database;
                    }
                    
                    // Then restore selected styles
                    if (savedState.selected_styles) {
                        selectedStyleIds = new Set(savedState.selected_styles);
                    }
                } catch(e) { 
                    console.error("[DA_StyleSelector] Error parsing state:", e); 
                }
            }
            loadStyles().then(() => updateSelectionUI());
        })();
    }
};


app.registerExtension({
    name: "StyleSelector.CleanV2",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "DA_StyleSelector") {
            console.log("[DA_StyleSelector] Extension bound to node:", nodeData.name);
            Object.assign(nodeType.prototype, {
                onNodeCreated() {
                    DA_StyleSelectorNode.onCreate(this);
                }
            });
        }
    }
});
