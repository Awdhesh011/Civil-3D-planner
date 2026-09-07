from pathlib import Path
import json,uuid,shutil,os
from fastapi import FastAPI,UploadFile,File,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from .models import Project,AIPlan
from .planner import analyze,validate
from .ai_analyzer import analyze_image

BASE=Path(__file__).resolve().parent.parent; UPLOADS=BASE/'uploads'; DATA=BASE/'data'
UPLOADS.mkdir(exist_ok=True);DATA.mkdir(exist_ok=True);DB=DATA/'projects.json'
if not DB.exists():DB.write_text('{}',encoding='utf8')
load_dotenv(BASE/'.env')

app=FastAPI(title='Civil 3D Planner AI',version='2.0')
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])

@app.get('/api/health')
def health():return {'status':'ok','ai_configured':bool(os.getenv('GEMINI_API_KEY'))}

@app.post('/api/analyze')
def api_analyze(project:Project):
    e=validate(project)
    if e:raise HTTPException(400,detail=e)
    return analyze(project)

@app.post('/api/upload-plan')
async def upload_plan(file:UploadFile=File(...)):
    ext=Path(file.filename or '').suffix.lower()
    if ext not in {'.png','.jpg','.jpeg','.webp'}:raise HTTPException(400,'Upload PNG/JPG/JPEG/WEBP.')
    path=UPLOADS/f'{uuid.uuid4().hex}{ext}'
    with path.open('wb') as f:shutil.copyfileobj(file.file,f)
    try:return AIPlan.model_validate(analyze_image(path)).model_dump()
    except Exception as e:raise HTTPException(500,str(e))

@app.post('/api/projects/{project_id}')
def save(project_id:str,project:Project):
    e=validate(project)
    if e:raise HTTPException(400,detail=e)
    db=json.loads(DB.read_text());db[project_id]=project.model_dump();DB.write_text(json.dumps(db,indent=2))
    return {'saved':True,'project_id':project_id}

@app.get('/api/projects/{project_id}')
def load(project_id:str):
    db=json.loads(DB.read_text())
    if project_id not in db:raise HTTPException(404,'Project not found')
    return db[project_id]

app.mount('/',StaticFiles(directory=str(BASE/'frontend'),html=True),name='frontend')
