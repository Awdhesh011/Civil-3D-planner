from pathlib import Path
import json
from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .models import Project
from .planner import analyze,validate

BASE=Path(__file__).resolve().parent.parent; DATA=BASE/'data'
DATA.mkdir(exist_ok=True);DB=DATA/'projects.json'
if not DB.exists():DB.write_text('{}',encoding='utf8')

app=FastAPI(title='Civil 3D Planner',version='2.0')
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])

@app.get('/api/health')
def health():return {'status':'ok'}

@app.post('/api/analyze')
def api_analyze(project:Project):
    e=validate(project)
    if e:raise HTTPException(400,detail=e)
    return analyze(project)

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
