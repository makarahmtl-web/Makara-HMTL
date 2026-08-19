import re
import glob

files = glob.glob("src/views/*.tsx") + glob.glob("src/components/*.tsx") + glob.glob("src/App.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Darken colors
    content = content.replace("text-slate-800", "text-slate-900")
    content = content.replace("text-slate-700", "text-slate-900")
    content = content.replace("text-slate-600", "text-slate-800")
    content = content.replace("text-slate-500", "text-slate-800")
    content = content.replace("text-gray-600", "text-slate-800")
    content = content.replace("text-gray-500", "text-slate-800")
    
    # Increase weight
    content = content.replace("font-medium", "font-bold")
    content = content.replace("font-semibold", "font-bold")

    # Clean up any potential double classes
    content = content.replace("font-bold font-bold", "font-bold")
    content = content.replace("text-slate-900 text-slate-900", "text-slate-900")
    
    # Remove any extra font-bold where there's already font-black
    def clean_fonts(match):
        cls = match.group(0)
        if "font-black" in cls:
            cls = cls.replace("font-bold", "")
            cls = re.sub(r'\s+', ' ', cls).strip(' "')
            return f'className="{cls}"'
        return cls

    content = re.sub(r'className="[^"]+"', clean_fonts, content)
    
    with open(file_path, "w") as f:
        f.write(content)
