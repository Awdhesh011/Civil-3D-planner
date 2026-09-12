# Civil 3D Planner

Full-stack project: FastAPI backend + HTML/CSS/JavaScript + Three.js.

## Features
- Manual 2D floor-plan editing
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
```

PowerShell:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Linux/macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run:
```bash
uvicorn backend.main:app --reload
```

Open:
http://127.0.0.1:8000

Do not open index.html directly with file://.

## Workflow
Draw or edit the 2D plan -> Analyze -> 3D -> Elevation -> Save.
