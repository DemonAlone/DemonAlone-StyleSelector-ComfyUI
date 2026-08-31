import os
import json
from aiohttp import web
import urllib.parse
from PIL import Image
import server

IMAGE_EXTENSIONS = frozenset(['.png', '.jpg', '.jpeg', '.webp'])

# === CONFIGURATION ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STYLE_DATABASES_DIR = os.path.join(SCRIPT_DIR, "style_databases")

# Cache for JSON styles per database
_styles_cache = {}
_styles_cache_time = {}

def get_available_databases():
    """Returns list of subfolder names within style_databases that contain styles.json and previews folder."""
    databases = []
    if not os.path.exists(STYLE_DATABASES_DIR):
        return databases
    for entry in os.scandir(STYLE_DATABASES_DIR):
        if entry.is_dir():
            db_path = entry.path
            json_path = os.path.join(db_path, "styles.json")
            previews_path = os.path.join(db_path, "previews")
            if os.path.isfile(json_path) and os.path.isdir(previews_path):
                databases.append(entry.name)
    return sorted(databases)

def get_database_paths(database_name):
    """
    Returns (previews_dir, json_path) for specified database.
    If database doesn't exist, returns paths for first available database (fallback).
    If no available databases, returns (None, None).
    """
    available = get_available_databases()
    if not available:
        return None, None
    if database_name not in available:
        database_name = available[0]  # fallback to first
    db_path = os.path.join(STYLE_DATABASES_DIR, database_name)
    previews_dir = os.path.join(db_path, "previews")
    json_path = os.path.join(db_path, "styles.json")
    return previews_dir, json_path

def load_styles_json(database_name, force=False):
    """Loads styles.json for specified database with caching."""
    _, json_path = get_database_paths(database_name)
    if not json_path or not os.path.exists(json_path):
        return {}
    try:
        mtime = os.path.getmtime(json_path)
        cache_key = database_name
        if not force and cache_key in _styles_cache and _styles_cache_time.get(cache_key) == mtime:
            return _styles_cache[cache_key]
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        styles = {}
        for item in data:
            name = item.get("name")
            if name:
                styles[name] = {
                    "positive": item.get("positive", ""),
                    "negative": item.get("negative_prompt", "")
                }
        _styles_cache[cache_key] = styles
        _styles_cache_time[cache_key] = mtime
        return styles
    except Exception as e:
        print(f"DA_StyleSelector: Error loading styles.json for '{database_name}': {e}")
        return {}

def _scan_input_directory(input_dir):
    """Returns sorted list of image file names and dictionary of their mtimes."""
    if not input_dir or not os.path.exists(input_dir):
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

@server.PromptServer.instance.routes.get("/styleselector/get_databases")
async def get_databases_endpoint(request):
    """Returns list of available style databases."""
    databases = get_available_databases()
    return web.json_response({"databases": databases})

@server.PromptServer.instance.routes.get("/styleselector/get_images")
async def get_images_endpoint(request):
    try:
        page = int(request.query.get('page', 1))
        per_page = int(request.query.get('per_page', 100))
        search = request.query.get('search', '').lower()
        database = request.query.get('database', '')
        force_reload = request.query.get('force', 'false').lower() == 'true'

        previews_dir, json_path = get_database_paths(database)
        if not previews_dir:
            return web.json_response({"images": [], "total_pages": 0, "current_page": 1, "source_folder": ""})

        all_images, mtimes = _scan_input_directory(previews_dir)
        all_images = sorted(all_images, key=lambda x: x.lower())

        if search:
            all_images = [img for img in all_images if search in img.lower()]

        total_images = len(all_images)
        total_pages = max(1, (total_images + per_page - 1) // per_page)
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_images = all_images[start_index:end_index]

        styles_data = load_styles_json(database, force=force_reload)

        image_info_list = []
        for img in paginated_images:
            encoded_name = urllib.parse.quote(img, safe='')
            width, height = 0, 0
            try:
                full_path = os.path.join(previews_dir, img)
                with Image.open(full_path) as img_opened:
                    width, height = img_opened.size
            except Exception:
                pass

            mtime = mtimes.get(img, 0)
            style_name = os.path.splitext(img)[0]
            style_info = styles_data.get(style_name, {})
            style_positive = style_info.get("positive", "")
            style_negative = style_info.get("negative", "")

            image_info_list.append({
                "name": img,
                "original_name": img,
                "preview_url": f"/styleselector/preview?filename={encoded_name}&database={database}&t={int(mtime)}",
                "source": previews_dir,
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
            "source_folder": previews_dir
        })
    except Exception as e:
        import traceback
        print(f"Error in get_images_endpoint: {traceback.format_exc()}")
        return web.json_response({"error": str(e)}, status=500)

@server.PromptServer.instance.routes.get("/styleselector/preview")
async def get_preview_image(request):
    filename = request.query.get('filename')
    database = request.query.get('database', '')
    if not filename:
        return web.Response(status=400, text="Missing filename parameter")

    try:
        filename_decoded = urllib.parse.unquote(filename)
        if ".." in filename_decoded:
            return web.Response(status=403, text="Invalid filename")

        previews_dir, _ = get_database_paths(database)
        if not previews_dir:
            return web.Response(status=404, text="Database not found")

        image_path = os.path.normpath(os.path.join(previews_dir, filename_decoded))
        if not image_path.startswith(os.path.normpath(previews_dir)):
            return web.Response(status=403, text="Access denied")

        if os.path.exists(image_path) and os.path.isfile(image_path):
            return web.FileResponse(image_path, headers={
                'Cache-Control': 'public, max-age=3600'
            })
        else:
            return web.Response(status=404, text=f"Image '{filename_decoded}' not found.")
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

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
                "database": ("STRING", {"default": ""}),
                "ui_state": ("STRING", {"default": "{}", "multiline": True}), 
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("positive", "negative")
    FUNCTION = "load_style"
    CATEGORY = "Style selector"

    @classmethod
    def IS_CHANGED(cls, selected_image="", database="", ui_state="{}", **kwargs):
        # Base part: database and selected image
        # Add mtime of styles file to respond to content changes
        mtime = ""
        if database:
            _, json_path = get_database_paths(database)
            if json_path and os.path.exists(json_path):
                try:
                    mtime = str(os.path.getmtime(json_path))
                except OSError:
                    pass
        return f"{ui_state}_{mtime}"
        
    @classmethod
    def VALIDATE_INPUTS(cls, selected_image="", database="", ui_state="{}", **kwargs):
        if not selected_image:
            return True
        # Check that database exists, otherwise warning
        available = get_available_databases()
        if database not in available:
            return f"Database '{database}' not available"
        previews_dir, _ = get_database_paths(database)
        if not previews_dir:
            return "Database previews folder missing"

        if isinstance(selected_image, str):
            images_list = [i.strip() for i in selected_image.split(',') if i.strip()]
        else:
            images_list = selected_image

        for img in images_list:
            image_path = os.path.normpath(os.path.join(previews_dir, img))
            if not image_path.startswith(os.path.normpath(previews_dir)):
                return f"Invalid image path: {img}"
            if not os.path.exists(image_path):
                return f"Image not found: {img}"
        return True

    def load_style(self, unique_id, selected_image="", positive="", negative="", database="", ui_state="{}", **kwargs):
        positive = positive or ""
        negative = negative or ""

        # parse ui_state and override the selected images and database
        try:
            state = json.loads(ui_state) if ui_state else {}
        except:
            state = {}

        if state:
            if "selected_image" in state and state["selected_image"]:
                # If this is a list, turn it into a string separated by commas
                if isinstance(state["selected_image"], list):
                    selected_image = ", ".join(state["selected_image"])
                else:
                    selected_image = str(state["selected_image"])
            if "selected_database" in state and state["selected_database"]:
                database = state["selected_database"]
                
        available = get_available_databases()
        if not database and available:
            database = available[0]
        elif database not in available:
            print(f"DA_StyleSelector: Database '{database}' not found, using first available.")
            database = available[0] if available else ""

        styles = load_styles_json(database)
        if not selected_image:
            return (positive, negative)

        previews_dir, _ = get_database_paths(database)
        if not previews_dir:
            return (positive, negative)

        selection_list = []
        if isinstance(selected_image, str):
            selection_list = [s.strip() for s in selected_image.split(',') if s.strip()]
        elif isinstance(selected_image, list):
            selection_list = selected_image

        positive_additions = []
        negative_additions = []

        for img_name in selection_list:
            full_path = os.path.normpath(os.path.join(previews_dir, img_name))
            if not full_path.startswith(os.path.normpath(previews_dir)):
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
                print(f"DA_StyleSelector: Style '{style_name}' not found in styles.json of database '{database}'")

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