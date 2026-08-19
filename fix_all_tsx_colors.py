import re
import glob

files = glob.glob("src/views/*.tsx") + glob.glob("src/components/*.tsx") + glob.glob("src/App.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Enforce pure black and maximum boldness for all text elements globally in TSX files
    # Replacing all variations of dark text with pure black
    content = content.replace("text-slate-900", "text-black")
    content = content.replace("text-gray-900", "text-black")
    content = content.replace("text-slate-800", "text-black")
    content = content.replace("text-gray-800", "text-black")
    content = content.replace("text-slate-700", "text-black")
    content = content.replace("text-gray-700", "text-black")
    
    # Replacing medium and semibold with bold and black to ensure it is thick
    content = content.replace("font-medium", "font-bold")
    content = content.replace("font-semibold", "font-bold")
    
    # Also ensuring text-[#2D3436] (a dark grey) becomes text-black
    content = content.replace("text-[#2D3436]", "text-black")

    with open(file_path, "w") as f:
        f.write(content)
