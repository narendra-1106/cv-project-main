import urllib.request
import re

url = "https://cv-project-main.vercel.app/assets/index-CQQ8WPH6.js"
js = urllib.request.urlopen(url).read().decode()

pos = js.find("cv-project-main.onrender.com")
print("Contains cv-project-main.onrender.com:", pos != -1)

pos2 = js.find("FastAPI is running on port 8000")
print("Contains old error message:", pos2 != -1)

# print context around onrender
if pos != -1:
    print(js[max(0, pos-100):min(len(js), pos+150)])
