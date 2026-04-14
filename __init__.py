import os
import json
from aiohttp import web
import urllib.parse
from PIL import Image
import server

IMAGE_EXTENSIONS = frozenset(['.png', '.jpg', '.jpeg', '.webp'])
UI_STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "styleselector_ui_state.json")

# === CONFIGURATION ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STYLES_FOLDER_PATH = os.path.join(SCRIPT_DIR, "styles")
STYLES_JSON_PATH = os.path.join(SCRIPT_DIR, "styles.json")   # now in the extension root directory

# Cache for JSON styles
_styles_cache = None
_styles_cache_time = 0

def load_styles_json():
    """Loads styles.json and returns a dictionary {style_name: {positive, negative}}."""
    global _styles_cache, _styles_cache_time
    if not os.path.exists(STYLES_JSON_PATH):
        print(f"DA_StyleSelector: styles.json not found at {STYLES_JSON_PATH}")
        return {}
    try:
        mtime = os.path.getmtime(STYLES_JSON_PATH)
        if _styles_cache is not None and _styles_cache_time == mtime:
            return _styles_cache
        with open(STYLES_JSON_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        styles = {}
        for item in data:
            name = item.get("name")
            if name:
                styles[name] = {
                    "positive": item.get("positive", ""),
                    "negative": item.get("negative_prompt", "")
                }
        _styles_cache = styles
        _styles_cache_time = mtime
        return styles
    except Exception as e:
        print(f"DA_StyleSelector: Error loading styles.json: {e}")
        return {}

def _scan_input_directory(input_dir):
    """Returns a sorted list of image filenames and a dictionary of their modification times."""
    if not os.path.exists(input_dir):
        return [], {}
    images = []
    mtimes = {}
    for entry in os.scandir(input_dir):
        if entry.is_file():
            ext = os.path.splitext(entry.name)[1].lower()
            if ext in IMAGE_EXTENSIONS:
                images.append(entry.name)
                try:
                    mtimes[entry.name] = entry.stat().st_mtime
                except OSError:
                    mtimes[entry.name] = 0
    return sorted(images, key=lambda x: x.lower()), mtimes


# === API Endpoints ===

@server.PromptServer.instance.routes.get("/styleselector/get_images")
async def get_images_endpoint(request):
    try:
        page = int(request.query.get('page', 1))
        per_page = int(request.query.get('per_page', 100))
        search = request.query.get('search', '').lower()

        input_dir = STYLES_FOLDER_PATH
        
        all_images, mtimes = _scan_input_directory(input_dir)

        # Sorting (Name A-Z only)
        all_images = sorted(all_images, key=lambda x: x.lower())

        # Search filter
        if search:
            all_images = [img for img in all_images if search in img.lower()]

        total_images = len(all_images)
        total_pages = max(1, (total_images + per_page - 1) // per_page)
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_images = all_images[start_index:end_index]

        # Load styles once for all images
        styles_data = load_styles_json()

        image_info_list = []
        for img in paginated_images:
            encoded_name = urllib.parse.quote(img, safe='')
            width, height = 0, 0
            try:
                full_path = os.path.join(input_dir, img)
                with Image.open(full_path) as img_opened:
                    width, height = img_opened.size
            except Exception:
                pass

            mtime = mtimes.get(img, 0)

            # Get style name (without extension) and look up in JSON
            style_name = os.path.splitext(img)[0]
            style_info = styles_data.get(style_name, {})
            style_positive = style_info.get("positive", "")
            style_negative = style_info.get("negative", "")

            image_info_list.append({
                "name": img,
                "original_name": img,
                "preview_url": f"/styleselector/preview?filename={encoded_name}&t={int(mtime)}",
                "source": input_dir,
                "width": width,
                "height": height,
                "style_positive": style_positive,
                "style_negative": style_negative
            })

        return web.json_response({
            "images": image_info_list,
            "folders": [],
            "total_pages": total_pages,
            "current_page": page,
            "source_folder": input_dir
        })
    except Exception as e:
        import traceback
        print(f"Error in get_images_endpoint: {traceback.format_exc()}")
        return web.json_response({"error": str(e)}, status=500)


@server.PromptServer.instance.routes.get("/styleselector/preview")
async def get_preview_image(request):
    filename = request.query.get('filename')
    if not filename:
        return web.Response(status=400, text="Missing filename parameter")

    try:
        filename_decoded = urllib.parse.unquote(filename)
        if ".." in filename_decoded:
            return web.Response(status=403, text="Invalid filename")

        input_dir = STYLES_FOLDER_PATH
        image_path = os.path.normpath(os.path.join(input_dir, filename_decoded))

        if not image_path.startswith(os.path.normpath(input_dir)):
            return web.Response(status=403, text="Access denied")

        if os.path.exists(image_path) and os.path.isfile(image_path):
            return web.FileResponse(image_path, headers={
                'Cache-Control': 'public, max-age=3600'
            })
        else:
            return web.Response(status=404, text=f"Image '{filename_decoded}' not found.")
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@server.PromptServer.instance.routes.post("/styleselector/set_ui_state")
async def set_ui_state(request):
    try:
        data = await request.json()
        node_id = str(data.get("node_id"))
        gallery_id = data.get("gallery_id")
        state = data.get("state", {})

        if not gallery_id:
            return web.Response(status=400)

        node_key = f"{gallery_id}_{node_id}"

        # Load existing state
        ui_states = {}
        if os.path.exists(UI_STATE_FILE):
            try:
                with open(UI_STATE_FILE, 'r', encoding='utf-8') as f:
                    ui_states = json.load(f)
            except Exception as e:
                print(f"DA_StyleSelector: Error reading UI state file: {e}")

        # Ensure selected_image stores a list of names (for multi-select)
        if not isinstance(state.get('selected_image'), list):
             state['selected_image'] = [state['selected_image']] if state.get('selected_image') else []
        
        if node_key not in ui_states:
            ui_states[node_key] = {}
        ui_states[node_key].update({k: v for k, v in state.items() if k != "selected_image"})
        
        selected_images = state.get('selected_image', [])
        if isinstance(selected_images, str):
            selected_images = [selected_images]
        ui_states[node_key]['selected_image'] = selected_images

        # Save with error handling
        try:
            with open(UI_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump(ui_states, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"DA_StyleSelector: Error writing UI state file: {e}")
            return web.json_response({"status": "error", "message": "Failed to save state"}, status=500)

        return web.json_response({"status": "ok"})
    except Exception as e:
        print(f"DA_StyleSelector: Exception in set_ui_state: {e}")
        return web.json_response({"status": "error", "message": str(e)}, status=500)


@server.PromptServer.instance.routes.get("/styleselector/get_ui_state")
async def get_ui_state(request):
    try:
        node_id = request.query.get('node_id')
        gallery_id = request.query.get('gallery_id')

        if not node_id or not gallery_id:
            return web.json_response({"error": "node_id or gallery_id is required"}, status=400)

        node_key = f"{gallery_id}_{node_id}"

        if os.path.exists(UI_STATE_FILE):
            with open(UI_STATE_FILE, 'r', encoding='utf-8') as f:
                ui_states = json.load(f)
        else:
            return web.json_response({"selected_image": [], "sort_order": "name", "preview_size": 110})

        node_state = ui_states.get(node_key, {})
        raw_selected = node_state.get("selected_image", "")
        
        if not isinstance(raw_selected, list):
            if raw_selected and isinstance(raw_selected, str) and raw_selected.strip():
                selected_list = [raw_selected]
            else:
                selected_list = []
        else:
            selected_list = raw_selected

        state_obj = {
            "selected_image": selected_list,
            "sort_order": node_state.get("sort_order", "name"),
            "preview_size": node_state.get("preview_size", 110)
        }

        return web.json_response(state_obj)
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)


class DA_StyleSelector:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "positive": ("STRING", {"forceInput": True, "default": ""}),
                "negative": ("STRING", {"forceInput": True, "default": ""}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "selected_image": ("STRING", {"default": ""}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("positive", "negative")
    FUNCTION = "load_style"
    CATEGORY = "Style selector"

    @classmethod
    def IS_CHANGED(cls, selected_image="", **kwargs):
        if not selected_image:
            return ""
        return f"selected_names_{cls.__name__}"

    @classmethod
    def VALIDATE_INPUTS(cls, selected_image="", **kwargs):
        if not selected_image:
            return True
        input_dir = STYLES_FOLDER_PATH
        
        if isinstance(selected_image, str):
            images_list = [i.strip() for i in selected_image.split(',') if i.strip()]
        else:
            images_list = selected_image

        for img in images_list:
            image_path = os.path.normpath(os.path.join(input_dir, img))
            if not image_path.startswith(os.path.normpath(input_dir)):
                return f"Invalid image path: {img}"
            if not os.path.exists(image_path):
                return f"Image not found: {img}"
        return True

    def load_style(self, unique_id, selected_image="", positive="", negative="", **kwargs):
        # Handle None for disabled inputs
        positive = positive or ""
        negative = negative or ""

        styles = load_styles_json()

        if not selected_image:
            print("DA_StyleSelector: No images selected, returning input prompts unchanged.")
            return (positive, negative)

        input_dir = STYLES_FOLDER_PATH
        
        selection_list = []
        if isinstance(selected_image, str):
            selection_list = [s.strip() for s in selected_image.split(',') if s.strip()]
        elif isinstance(selected_image, list):
            selection_list = selected_image

        positive_additions = []
        negative_additions = []

        for img_name in selection_list:
            full_path = os.path.normpath(os.path.join(input_dir, img_name))
            if not full_path.startswith(os.path.normpath(input_dir)):
                continue
            if not os.path.exists(full_path):
                print(f"DA_StyleSelector: Image not found: {full_path}")
                continue

            style_name, _ = os.path.splitext(img_name)
            style = styles.get(style_name)
            if style:
                if style.get("positive"):
                    positive_additions.append(style["positive"])
                if style.get("negative"):
                    negative_additions.append(style["negative"])
            else:
                print(f"DA_StyleSelector: Style '{style_name}' not found in styles.json")

        result_positive = positive
        result_negative = negative

        if positive_additions:
            if result_positive:
                result_positive += ", "
            result_positive += ", ".join(positive_additions)

        if negative_additions:
            if result_negative:
                result_negative += ", "
            result_negative += ", ".join(negative_additions)

        return (result_positive, result_negative)


NODE_CLASS_MAPPINGS = {
    "DA_StyleSelector": DA_StyleSelector
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DA_StyleSelector": "Style Selector"
}

WEB_DIRECTORY = "./js"
__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
