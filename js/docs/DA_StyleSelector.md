## 🛠 How to Add Your Own Style

To use custom styles or databases, follow this new directory structure and configuration method:

### 1. Create Base Directory
Create a folder named after your database (e.g., `MyStyleBase`) inside the `style_databases` folder in your ComfyUI user directory (`ComfyUI/custom_nodes/DemonAlone-StyleSelector-ComfyUI/...`.

**Path Structure:**

```text
style_databases/
└── [YourBaseName]/
    ├── styles.json
    └── previews/
        ├── style_name_1.jpg
        └── style_name_2.png
```
### 2. Edit styles.json
The styles.json file must be placed directly inside your specific base folder. Add a record using the following JSON structure:

```json
{
    "name": "The name of your style",
    "positive": "A positive for the style",
    "negative_prompt": "Negative for this style"
}
```

### 3. Add Preview Images
Images must be stored inside the previews subfolder of your base directory.

Supported formats: .png, .jpg, .jpeg, .webp
Resolution: Dimensions and proportions do not matter. Suggested size: 256x256. Format JPG is recommended.
Naming: The image filename must match the name field in `styles.json` exactly (case-sensitive). For example: `Cyberpunk.jpg`.

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

    DA_StyleSelector: Style 'YOUR STYLE NAME' not found in styles.json
* Ensure capitalization matches exactly (e.g., Cyberpunk vs cyberpunk).
* Verify the JSON syntax is correct and valid.

### Page Reload Behavior
While simple refresh works for most updates, remember that the initial registration of a new database folder may require a browser reload after pressing "Refresh style list".