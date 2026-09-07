from .models import Project

def bounds(p):
    if not p.rooms:return 0,0,0,0
    return min(r.x for r in p.rooms),min(r.y for r in p.rooms),max(r.x+r.width for r in p.rooms),max(r.y+r.height for r in p.rooms)

def analyze(p):
    a=sum(r.width*r.height for r in p.rooms);x,y,X,Y=bounds(p)
    return {"total_area":round(a,2),"building_width":round(X-x,2),"building_depth":round(Y-y,2),"building_height":round(p.floors*p.floor_to_floor,2),"rooms":len(p.rooms),"openings":len(p.openings)}

def validate(p):
    errors=[];ids=set()
    for r in p.rooms:
        if r.id in ids:errors.append(f"Duplicate room id: {r.id}")
        ids.add(r.id)
        if r.width<1 or r.height<1:errors.append(f"Room '{r.name}' is too small.")
    for o in p.openings:
        if o.room_id not in ids:errors.append(f"Opening {o.id} has no valid room.")
    return errors
