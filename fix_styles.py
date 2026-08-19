import re
import glob

files = glob.glob("src/views/*.tsx") + glob.glob("src/components/*.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Deduplicate font-medium
    content = content.replace("font-medium font-medium", "font-medium")
    
    # Remove font-medium if font-bold or font-black is present
    def clean_fonts(match):
        cls = match.group(0)
        if "font-bold" in cls or "font-black" in cls or "font-semibold" in cls:
            cls = cls.replace("font-medium", "")
            cls = re.sub(r'\s+', ' ', cls).strip(' "')
            return f'className="{cls}"'
        return cls

    content = re.sub(r'className="[^"]+"', clean_fonts, content)
    
    with open(file_path, "w") as f:
        f.write(content)
