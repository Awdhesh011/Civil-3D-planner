import json,os,re
from pathlib import Path
from google import genai
from google.genai import types

SYSTEM='''You are an expert architectural floor-plan reconstruction assistant. Analyze an uploaded 2D residential floor plan. Return ONLY JSON:
{"project_name":"string","floors":1,"floor_to_floor":3.0,"confidence":0.0,"notes":[],"rooms":[{"id":"r1","name":"Living Room","x":0,"y":0,"width":5,"height":4,"wall_thickness":0.23,"floor_height":3}],"openings":[{"id":"o1","type":"door","x":1,"y":0,"width":1,"side":"top","room_id":"r1"}]}
Use metres; x right, y down. Use printed dimensions when readable. If scale is unavailable, infer proportions and say so. Do not invent invisible details. Keep room labels faithful. Lower confidence for uncertainty.'''

def analyze_image(path:Path):
    key=os.getenv("GEMINI_API_KEY")
    if not key:raise RuntimeError("GEMINI_API_KEY is not configured. Copy .env.example to .env and add your API key.")
    mime={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp"}.get(path.suffix.lower())
    if not mime:raise RuntimeError("Use PNG/JPG/JPEG/WEBP images.")
    client=genai.Client(api_key=key)
    r=client.models.generate_content(
        model=os.getenv("AI_MODEL","gemini-3.8-flash"),
        contents=[
            SYSTEM,
            "Reconstruct this floor plan into the JSON schema. Carefully inspect walls, room labels, doors, windows and dimensions.",
            types.Part.from_bytes(data=path.read_bytes(),mime_type=mime),
        ],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    text=re.sub(r"^```json\s*|\s*```$","",r.text.strip(),flags=re.I).strip()
    return json.loads(text)
