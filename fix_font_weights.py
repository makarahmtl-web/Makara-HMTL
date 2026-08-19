import re
import glob

files = glob.glob("src/views/*.tsx") + glob.glob("src/components/*.tsx") + glob.glob("src/App.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Change text-slate-900 and text-gray-900 to text-black
    content = content.replace("text-slate-900", "text-black")
    content = content.replace("text-gray-900", "text-black")
    
    # Also for secondary text, use a very dark gray or black
    content = content.replace("text-slate-800", "text-[#111111]")
    
    # Change font-black (900) to font-bold (700) because 900 causes fallback to thin on some Khmer fonts
    content = content.replace("font-black", "font-bold")

    # Ensure font-medium is bumped to font-bold for better readability in Khmer
    # We did this mostly, but let's double check.
    content = content.replace("font-medium", "font-bold")
    
    # Clean up double font-bold
    content = content.replace("font-bold font-bold", "font-bold")
    content = content.replace("text-black text-black", "text-black")

    with open(file_path, "w") as f:
        f.write(content)
