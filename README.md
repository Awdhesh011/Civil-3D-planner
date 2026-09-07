# Civil 3D Planner AI

Full-stack project: FastAPI backend + HTML/CSS/JavaScript + Three.js + AI image analysis.

## Features
- Upload PNG/JPG/JPEG/WEBP 2D floor plan
- AI reconstruction into editable rooms/doors/windows
- Confidence and notes
- Manual 2D correction
- Area/dimension analysis
- 3D model
- Basic elevation
- Backend save/load

## Setup in VS Code

Install Python 3.11+.

Windows:
```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

PowerShell:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Linux/macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-2.5-flash
```

Run:
```bash
uvicorn backend.main:app --reload
```

Open:
http://127.0.0.1:8000

Do not open index.html directly with file://.

## Workflow
Upload plan -> Analyze & Reconstruct -> verify/edit 2D -> Analyze -> 3D -> Elevation -> Save.

## Important
AI reconstruction is an assistive result. Always verify dimensions and geometry before any construction use. Low-resolution or dimensionless plans can be ambiguous.

Current upload endpoint accepts image formats. PDF rasterization can be added as a next module.
