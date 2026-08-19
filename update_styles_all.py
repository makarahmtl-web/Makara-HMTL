import re
import glob

files = glob.glob("src/views/*.tsx") + glob.glob("src/components/*.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Colors -> darker slate/gray
    content = content.replace("text-gray-800", "text-slate-900")
    # Using regex to add font-medium to text-gray-600/500/400 if it doesn't exist
    content = re.sub(r'text-gray-600(?!\s+font-)', 'text-slate-800 font-medium', content)
    content = re.sub(r'text-gray-500(?!\s+font-)', 'text-slate-700 font-medium', content)
    content = re.sub(r'text-gray-400(?!\s+font-)', 'text-slate-600 font-medium', content)
    
    # And replace any plain remaining text-gray-X that had font- already
    content = content.replace("text-gray-600", "text-slate-800")
    content = content.replace("text-gray-500", "text-slate-700")
    content = content.replace("text-gray-400", "text-slate-600")
    content = content.replace("text-gray-300", "text-slate-400")
    
    # Also boost text-[#2D3436] readability by replacing it or making sure it's bold enough
    content = content.replace("text-[#2D3436]", "text-slate-900")
    
    # General sizing reductions to make it sleeker
    content = content.replace("w-6 h-6", "w-5 h-5")
    content = content.replace("w-12 h-12", "w-11 h-11") # Avatar sizes
    content = content.replace("w-14 h-14", "w-12 h-12") # Story/Avatar sizes
    
    # Increase font weights slightly
    content = content.replace("font-semibold", "font-bold")
    content = re.sub(r'text-sm(?!\s+font-)', 'text-sm font-medium', content)
    content = re.sub(r'text-xs(?!\s+font-)', 'text-xs font-medium', content)

    # Some padding adjustments
    content = content.replace("p-6", "p-4")
    content = content.replace("p-5", "p-4")
    # For gap-6 -> gap-4
    content = content.replace("gap-6", "gap-4")
    content = content.replace("gap-5", "gap-4")

    with open(file_path, "w") as f:
        f.write(content)
