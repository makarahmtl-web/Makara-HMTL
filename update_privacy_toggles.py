with open("src/views/ProfileView.tsx", "r") as f:
    content = f.read()

new_toggles = """
              <div className="flex items-center justify-between p-4">
                <div>
                  <h4 className="font-bold text-black text-sm">បង្ហាញលេខទូរស័ព្ទ</h4>
                </div>
                <button onClick={() => setShowPhone(!showPhone)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${showPhone ? 'bg-[#6C63FF]' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${showPhone ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <h4 className="font-bold text-black text-sm">បង្ហាញអ៊ីមែល</h4>
                </div>
                <button onClick={() => setShowEmail(!showEmail)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${showEmail ? 'bg-[#6C63FF]' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${showEmail ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
"""

content = content.replace('<div className="flex items-center justify-between p-4">', new_toggles + '\n              <div className="flex items-center justify-between p-4">', 1)

with open("src/views/ProfileView.tsx", "w") as f:
    f.write(content)
