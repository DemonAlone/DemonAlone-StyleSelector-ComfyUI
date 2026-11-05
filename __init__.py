import os
import json
import urllib.parse
from aiohttp import web
from PIL import Image
import server

IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.webp')
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STYLE_DATABASES_DIR = os.path.join(SCRIPT_DIR, "style_databases")

def get_databases_list():
    if not os.path.exists(STYLE_DATABASES_DIR):
        return []
    dbs = []
    for entry in os.scandir(STYLE_DATABASES_DIR):
        if entry.is_dir() and os.path.isfile(os.path.join(entry.path, "styles.json")):
            dbs.append(entry.name)
    return sorted(dbs)

def get_database_paths(database_name):
    available = get_databases_list()
    if not available:
        return None, None
    if database_name not in available:
        database_name = available[0]
    db_path = os.path.join(STYLE_DATABASES_DIR, database_name)
    previews_dir = os.path.join(db_path, "previews")
    json_path = os.path.join(db_path, "styles.json")
    return previews_dir, json_path

@server.PromptServer.instance.routes.get("/styleselector/v2/databases")
async def api_get_databases(request):
    return web.json_response({"databases": get_databases_list()})

@server.PromptServer.instance.routes.get("/styleselector/v2/get_styles")
async def api_get_styles(request):
    try:
        target_db = request.query.get('database', '__all__')
        search_query = request.query.get('search', '').lower()
        
        available_dbs = get_databases_list()
        dbs_to_scan = available_dbs if target_db == "__all__" else [target_db] if target_db in available_dbs else []
        
        master_list = []
        
        for db in dbs_to_scan:
            previews_dir, json_path = get_database_paths(db)
            if not json_path or not os.path.exists(json_path):
                continue
                
            # Collect existing preview files for fast checking
            existing_previews = {}
            if previews_dir and os.path.isdir(previews_dir):
                for f in os.scandir(previews_dir):
                    if f.is_file() and f.name.lower().endswith(IMAGE_EXTENSIONS):
                        name_without_ext = os.path.splitext(f.name)[0].lower()
                        existing_previews[name_without_ext] = f.name

            with open(json_path, 'r', encoding='utf-8') as f:
                try: data = json.load(f)
                except: data = []

            for item in data:
                style_name = item.get("name", "")
                if not style_name:
                    continue

                encoded_name = urllib.parse.quote(img, safe='')
                width, height = 0, 0
                try:
                    full_path = os.path.join(previews_dir, img)
                    with Image.open(full_path) as img_opened:
                        width, height = img_opened.size
                except Exception as e:
                    print(f"DA_StyleSelector: Warning - Could not read dimensions for image '{img}': {e}")

                mtime = mtimes.get(img, 0)
                style_name = os.path.splitext(img)[0]
                style_info = styles_data.get(style_name, {})
                style_positive = style_info.get("positive", "")
                style_negative = style_info.get("negative", "")

                # Important: make a unique original_name as 'db_name/img_name' to avoid collisions between databases in the common list
                uniq_name = f"{db}/{img}"

                all_image_info_list.append({
                    "name": f"[{db}] {style_name}",
                    "original_name": uniq_name,
                    "preview_url": f"/styleselector/preview?filename={encoded_name}&database={db}&t={int(mtime)}",
                    "source": previews_dir,
                    "width": width,
                    "height": height,
                    "style_positive": style_positive,
                    "style_negative": style_negative
                })
                
        # Sort styles by name
        def _get_style_name_lower(style_item):
            return style_item["name"].lower()

        master_list.sort(key=_get_style_name_lower)
        return web.json_response({"styles": master_list})
        
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

@server.PromptServer.instance.routes.get("/styleselector/v2/preview")
async def api_get_preview(request):
    db = request.query.get('db', '')
    filename = request.query.get('file', '')
    if not db or not filename or ".." in filename or ".." in db:
        return web.Response(status=400)
        
    img_path = os.path.normpath(os.path.join(STYLE_DATABASES_DIR, db, "previews", urllib.parse.unquote(filename)))
    if os.path.isfile(img_path):
        return web.FileResponse(img_path, headers={'Cache-Control': 'public, max-age=300, must-revalidate'})
    return web.Response(status=404)

# === ComfyUI Node Class ===
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
                "selected_styles": ("STRING", {"default": ""}),
                "database": ("STRING", {"default": "__all__"}),
                "ui_state": ("STRING", {"default": "{}"})
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("positive", "negative")
    FUNCTION = "apply_styles"
    CATEGORY = "Style Selector"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def apply_styles(self, selected_styles="", positive="", negative="", database="", ui_state="{}", **kwargs):
        # --- DEBUG: Print to ComfyUI console what actually came from JS ---
        print(f"[DA_StyleSelector DEBUG] incoming selected_styles: '{selected_styles}'")
        print(f"[DA_StyleSelector DEBUG] incoming ui_state: '{ui_state}'")
        positive = positive or ""
        negative = negative or ""

        # parse ui_state and override the selected images and database
        try:
            state = json.loads(ui_state) if ui_state else {}
        except json.JSONDecodeError:
            print(f"DA_StyleSelector: Warning - Failed to parse ui_state JSON. Resetting to default.")
            state = {}
        except Exception as e:
            print(f"DA_StyleSelector: Warning - Unexpected error parsing ui_state: {e}")
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

        if not selected_image:
            return (positive, negative)

        # Frontend sends IDs separated by comma: "default/Cyberpunk, model/Anime"
        selection_list = [s.strip() for s in current_selection_str.split(',') if s.strip()]

        positive_additions = []
        negative_additions = []

        for item in selection_list:
            if "/" not in item:
                continue
            
            target_db, style_name = item.split("/", 1)
            
            # Check if database exists
            available = get_databases_list()
            if target_db not in available:
                print(f"[DA_StyleSelector WARNING] DB '{target_db}' not found for style '{item}'")
                continue

            # Load JSON of specific database
            db_dir = os.path.join(STYLE_DATABASES_DIR, target_db)
            json_path = os.path.join(db_dir, "styles.json")
            
            if not os.path.exists(json_path):
                continue

            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Find the desired style in the JSON structure array
                found = False
                for style_item in data:
                    if style_item.get("name") == style_name:
                        pos = style_item.get("positive", "")
                        neg = style_item.get("negative_prompt", "") or style_item.get("negative", "")
                        
                        if pos:
                            positive_additions.append(pos)
                        if neg:
                            negative_additions.append(neg)
                        found = True
                        break
                
                if not found:
                    print(f"[DA_StyleSelector WARNING] Style '{style_name}' not found in '{target_db}/styles.json'")

            except Exception as e:
                print(f"[DA_StyleSelector ERROR] Loading JSON for {target_db}: {e}")

        # Combine results
        result_positive = positive
        if positive_additions:
            if result_positive:
                result_positive += ", "
            result_positive += ", ".join(positive_additions)

        result_negative = negative
        if negative_additions:
            if result_negative:
                result_negative += ", "
            result_negative += ", ".join(negative_additions)
            print(f"[DA_StyleSelector SUCCESS] Final Positive: '{result_positive[:50]}...'")
        return (result_positive, result_negative)

        

NODE_CLASS_MAPPINGS = {"DA_StyleSelector": DA_StyleSelector}
NODE_DISPLAY_NAME_MAPPINGS = {"DA_StyleSelector": "Style Selector V2"}
WEB_DIRECTORY = "./web"
__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
