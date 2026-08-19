import re

with open("src/views/ProfileView.tsx", "r") as f:
    content = f.read()

# Make text darker and bolder
content = content.replace("text-gray-800", "text-slate-900")
content = content.replace("text-gray-600", "text-slate-800 font-medium")
content = content.replace("text-gray-500", "text-slate-700 font-medium")
content = content.replace("text-gray-400", "text-slate-500 font-medium")
content = content.replace("text-gray-300", "text-slate-400")
content = content.replace("font-semibold", "font-bold") # Slightly more weight

# Sizing and spacing
# Making icons slightly more compact
content = content.replace("w-6 h-6", "w-5 h-5")
content = content.replace("w-8 h-8", "w-7 h-7")
content = content.replace("w-12 h-12", "w-10 h-10")

# Adjust paddings for a sleeker look
content = content.replace("p-6", "p-4")
content = content.replace("p-4", "p-3")
content = content.replace("p-5", "p-3.5")
content = content.replace("gap-6", "gap-4")
content = content.replace("gap-4", "gap-3")

with open("src/views/ProfileView.tsx", "w") as f:
    f.write(content)
