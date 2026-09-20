from pydantic import BaseModel, Field
from typing import Literal, List

class Room(BaseModel):
    id:str
    name:str="Room"
    x:float
    y:float
    width:float=Field(gt=0)
    height:float=Field(gt=0)
    wall_thickness:float=Field(default=.23,gt=0)
    floor_height:float=Field(default=3,gt=0)
    furniture:List['Furniture'] = []

class Furniture(BaseModel):
    id:str
    type:Literal["bed","sofa","table","desk","wardrobe","chair","cabinet"]
    x:float=Field(ge=0)
    y:float=Field(ge=0)
    width:float=Field(default=1,gt=0)
    depth:float=Field(default=1,gt=0)
    rotation:float=0

class Opening(BaseModel):
    id:str
    type:Literal["door","window"]
    x:float
    y:float
    width:float=Field(default=1,gt=0)
    side:Literal["top","bottom","left","right"]
    room_id:str

class Project(BaseModel):
    project_name:str="AI House"
    floors:int=Field(default=1,ge=1,le=10)
    floor_to_floor:float=Field(default=3,gt=0)
    rooms:List[Room]=[]
    openings:List[Opening]=[]

