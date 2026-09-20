const canvas = document.getElementById('planCanvas');
const ctx = canvas.getContext('2d');
let rooms = [], openings = [], selected = null, selectedKind = null, selectedRoom = null;
let currentTool = 'select', drawing = false, draggingFurniture = false, start = null, cursor = null, dragOffset = null;
let scale = 80, zoomFactor = 1, panX = 24, panY = 24, history = [];
const C = { grid: '#d7dee3', room: '#e3f2fd', wall: '#263238', sel: '#0288d1', door: '#795548', window: '#0277bd' };

function resizeCanvas() {
    const d = devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * d;
    canvas.height = canvas.clientHeight * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    draw();
}
function worldToScreen(x, y) { return { x: x * scale * zoomFactor + panX, y: y * scale * zoomFactor + panY }; }
function screenToWorld(x, y) { return { x: (x - panX) / (scale * zoomFactor), y: (y - panY) / (scale * zoomFactor) }; }
function snap(point) {
    if (!document.getElementById('snapToggle').checked) return point;
    const grid = +document.getElementById('gridSize').value || .5;
    return { x: Math.round(point.x / grid) * grid, y: Math.round(point.y / grid) * grid };
}
function pnt(event) {
    const rect = canvas.getBoundingClientRect();
    return snap(screenToWorld(event.clientX - rect.left, event.clientY - rect.top));
}

function draw() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = '#f8fafb'; ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const gridSize = (+document.getElementById('gridSize').value || .5) * scale * zoomFactor;
    if (document.getElementById('gridToggle').checked && gridSize > 3) {
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        const xStart = ((panX % gridSize) + gridSize) % gridSize;
        const yStart = ((panY % gridSize) + gridSize) % gridSize;
        for (let x = xStart; x < canvas.clientWidth; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.clientHeight); ctx.stroke(); }
        for (let y = yStart; y < canvas.clientHeight; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.clientWidth, y); ctx.stroke(); }
    }
    rooms.forEach(room => {
        const point = worldToScreen(room.x, room.y), width = room.width * scale * zoomFactor, height = room.height * scale * zoomFactor;
        const active = selectedKind === 'room' && selected === room;
        ctx.fillStyle = active ? '#03a9f425' : C.room; ctx.fillRect(point.x, point.y, width, height);
        ctx.strokeStyle = active ? C.sel : C.wall; ctx.lineWidth = (active ? 4 : 3) / zoomFactor; ctx.strokeRect(point.x, point.y, width, height);
        ctx.fillStyle = C.wall; ctx.textAlign = 'center'; ctx.font = `${Math.max(10, 14 * zoomFactor)}px Arial`;
        ctx.fillText(room.name, point.x + width / 2, point.y + height / 2);
        ctx.font = `${Math.max(9, 12 * zoomFactor)}px Arial`;
        ctx.fillText(`${(room.width * room.height).toFixed(2)} m2`, point.x + width / 2, point.y + height / 2 + 18 * zoomFactor);
        (room.furniture || []).forEach(item => drawFurniture(room, item));
    });
    openings.forEach(opening => {
        const point = worldToScreen(opening.x, opening.y), length = opening.width * scale * zoomFactor;
        ctx.strokeStyle = selectedKind === 'opening' && selected === opening ? '#f4511e' : (opening.type === 'door' ? C.door : C.window);
        ctx.lineWidth = (selectedKind === 'opening' && selected === opening ? 9 : 6) / zoomFactor;
        ctx.beginPath();
        if (opening.side === 'top' || opening.side === 'bottom') { ctx.moveTo(point.x, point.y); ctx.lineTo(point.x + length, point.y); }
        else { ctx.moveTo(point.x, point.y); ctx.lineTo(point.x, point.y + length); }
        ctx.stroke();
    });
    if (drawing && start && cursor) {
        const point = worldToScreen(Math.min(start.x, cursor.x), Math.min(start.y, cursor.y));
        ctx.setLineDash([7, 5]); ctx.strokeStyle = '#03a9f4';
        ctx.strokeRect(point.x, point.y, Math.abs(cursor.x - start.x) * scale * zoomFactor, Math.abs(cursor.y - start.y) * scale * zoomFactor);
        ctx.setLineDash([]);
    }
    updateUI();
}
function furnitureBounds(room, item) {
    return { x: room.x + item.x, y: room.y + item.y, width: item.width, height: item.depth };
}
function drawFurniture(room, item) {
    const bounds = furnitureBounds(room, item), point = worldToScreen(bounds.x, bounds.y);
    const width = bounds.width * scale * zoomFactor, height = bounds.height * scale * zoomFactor;
    const active = selectedKind === 'furniture' && selected === item;
    const colors = { bed: '#d9b38c', sofa: '#6c8794', table: '#9a6b4f', desk: '#76513e', wardrobe: '#9aa4a8', chair: '#526b75', cabinet: '#765545' };
    ctx.save();
    ctx.translate(point.x + width / 2, point.y + height / 2);
    ctx.rotate((item.rotation || 0) * Math.PI / 180);
    ctx.fillStyle = colors[item.type] || '#78909c';
    ctx.strokeStyle = active ? C.sel : '#263238';
    ctx.lineWidth = (active ? 3 : 1.5) / zoomFactor;
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeRect(-width / 2, -height / 2, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1 / zoomFactor;
    if (item.type === 'bed') { ctx.strokeRect(-width / 2 + 4, -height / 2 + 4, width - 8, Math.min(12, height * .28)); }
    if (item.type === 'sofa') { ctx.strokeRect(-width / 2 + 3, height / 2 - Math.min(12, height * .25), width - 6, Math.min(9, height * .2)); }
    if (item.type === 'table') { ctx.beginPath(); ctx.arc(0, 0, Math.min(width, height) * .2, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
}
function findRoom(point) {
    for (let i = rooms.length - 1; i >= 0; i--) {
        const room = rooms[i];
        if (point.x >= room.x && point.x <= room.x + room.width && point.y >= room.y && point.y <= room.y + room.height) return room;
    }
    return null;
}
function findOpening(point) {
    const tolerance = .25 / zoomFactor;
    for (let i = openings.length - 1; i >= 0; i--) {
        const opening = openings[i], horizontal = opening.side === 'top' || opening.side === 'bottom';
        const distance = horizontal ? Math.hypot(Math.max(opening.x - point.x, 0, point.x - opening.x - opening.width), point.y - opening.y) : Math.hypot(point.x - opening.x, Math.max(opening.y - point.y, 0, point.y - opening.y - opening.width));
        if (distance <= tolerance) return opening;
    }
    return null;
}
function findFurniture(point) {
    for (let roomIndex = rooms.length - 1; roomIndex >= 0; roomIndex--) {
        const room = rooms[roomIndex];
        const furniture = room.furniture || [];
        for (let itemIndex = furniture.length - 1; itemIndex >= 0; itemIndex--) {
            const item = furniture[itemIndex], bounds = furnitureBounds(room, item);
            if (point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height) return { room, item };
        }
    }
    return null;
}
function nearest(point) {
    return rooms.reduce((best, room) => {
        const distance = Math.hypot(point.x - room.x - room.width / 2, point.y - room.y - room.height / 2);
        return !best || distance < best.distance ? { room, distance } : best;
    }, null)?.room;
}
function placeOpening(opening) {
    const room = rooms.find(item => item.id === opening.room_id);
    if (!room) return;
    opening.width = Math.max(.3, Math.min(+opening.width || 1, opening.side === 'top' || opening.side === 'bottom' ? room.width : room.height));
    if (opening.side === 'top' || opening.side === 'bottom') {
        opening.x = Math.max(room.x, Math.min(opening.x, room.x + room.width - opening.width));
        opening.y = opening.side === 'top' ? room.y : room.y + room.height;
    } else {
        opening.y = Math.max(room.y, Math.min(opening.y, room.y + room.height - opening.width));
        opening.x = opening.side === 'left' ? room.x : room.x + room.width;
    }
}
function addOpening(type, point) {
    const room = nearest(point);
    if (!room) return alert('Draw or import a room first.');
    pushHistory();
    const distances = { top: Math.abs(point.y - room.y), bottom: Math.abs(point.y - room.y - room.height), left: Math.abs(point.x - room.x), right: Math.abs(point.x - room.x - room.width) };
    const side = Object.keys(distances).sort((a, b) => distances[a] - distances[b])[0];
    const opening = { id: crypto.randomUUID(), type, x: point.x, y: point.y, width: type === 'door' ? 1 : 1.2, side, room_id: room.id };
    placeOpening(opening); openings.push(opening); selected = opening; selectedKind = 'opening'; draw(); updateProps();
}
function pushHistory() { history.push(JSON.stringify({ rooms, openings })); }
function undo() { if (!history.length) return; const state = JSON.parse(history.pop()); rooms = state.rooms; openings = state.openings; selected = null; selectedRoom = null; selectedKind = null; draw(); updateProps(); }
function deleteSelected() {
    if (!selected) return; pushHistory();
    if (selectedKind === 'opening') openings = openings.filter(opening => opening.id !== selected.id);
    else if (selectedKind === 'furniture' && selectedRoom) selectedRoom.furniture = (selectedRoom.furniture || []).filter(item => item.id !== selected.id);
    else { openings = openings.filter(opening => opening.room_id !== selected.id); rooms = rooms.filter(room => room.id !== selected.id); }
    selected = null; selectedRoom = null; selectedKind = null; draw(); updateProps();
}
function clearPlan() { if (confirm('Clear complete plan?')) { pushHistory(); rooms = []; openings = []; selected = null; selectedKind = null; draw(); updateProps(); } }
function newProject() { rooms = []; openings = []; selected = null; selectedKind = null; history = []; zoomFactor = 1; panX = 24; panY = 24; draw(); updateProps(); }
function setTool(tool) { currentTool = tool; document.querySelectorAll('.tool').forEach(button => button.classList.toggle('active', button.dataset.tool === tool)); document.getElementById('toolStatus').textContent = tool[0].toUpperCase() + tool.slice(1); }
document.querySelectorAll('.tool').forEach(button => button.onclick = () => setTool(button.dataset.tool));

function zoomAt(factor, screenX = canvas.clientWidth / 2, screenY = canvas.clientHeight / 2) {
    const before = screenToWorld(screenX, screenY);
    zoomFactor = Math.max(.35, Math.min(4, zoomFactor * factor));
    const after = worldToScreen(before.x, before.y); panX += screenX - after.x; panY += screenY - after.y; draw();
}
function zoomIn() { zoomAt(1.25); }
function zoomOut() { zoomAt(.8); }
function getBounds() {
    if (!rooms.length) return { width: 0, depth: 0, minX: 0, minY: 0 };
    const minX = Math.min(...rooms.map(room => room.x)), minY = Math.min(...rooms.map(room => room.y));
    const maxX = Math.max(...rooms.map(room => room.x + room.width)), maxY = Math.max(...rooms.map(room => room.y + room.height));
    return { width: maxX - minX, depth: maxY - minY, minX, minY };
}
function fitPlan() {
    if (!rooms.length) { zoomFactor = 1; panX = 24; panY = 24; draw(); return; }
    const bounds = getBounds();
    zoomFactor = Math.max(.35, Math.min(4, Math.min((canvas.clientWidth - 48) / (bounds.width * scale), (canvas.clientHeight - 48) / (bounds.depth * scale))));
    panX = (canvas.clientWidth - bounds.width * scale * zoomFactor) / 2 - bounds.minX * scale * zoomFactor;
    panY = (canvas.clientHeight - bounds.depth * scale * zoomFactor) / 2 - bounds.minY * scale * zoomFactor; draw();
}
canvas.addEventListener('wheel', event => { event.preventDefault(); const rect = canvas.getBoundingClientRect(); zoomAt(event.deltaY < 0 ? 1.1 : .9, event.clientX - rect.left, event.clientY - rect.top); }, { passive: false });
canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return; event.preventDefault(); canvas.setPointerCapture(event.pointerId);
    const point = pnt(event);
    if (currentTool === 'room') { drawing = true; start = point; cursor = point; }
    else if (currentTool === 'select') {
        const furnitureHit = findFurniture(point);
        if (furnitureHit) { pushHistory(); selected = furnitureHit.item; selectedRoom = furnitureHit.room; selectedKind = 'furniture'; draggingFurniture = true; dragOffset = { x: point.x - (selectedRoom.x + selected.x), y: point.y - (selectedRoom.y + selected.y) }; }
        else { selected = findOpening(point); selectedRoom = null; selectedKind = selected ? 'opening' : null; if (!selected) { selected = findRoom(point); selectedKind = selected ? 'room' : null; } }
        updateProps(); draw();
    }
    else addOpening(currentTool, point);
    draw();
});
canvas.addEventListener('pointermove', event => {
    if (drawing) { event.preventDefault(); cursor = pnt(event); draw(); }
    if (draggingFurniture && selectedRoom && selected) { event.preventDefault(); const point = pnt(event); selected.x = Math.max(0, Math.min(selectedRoom.width - selected.width, point.x - selectedRoom.x - dragOffset.x)); selected.y = Math.max(0, Math.min(selectedRoom.height - selected.depth, point.y - selectedRoom.y - dragOffset.y)); draw(); updateProps(); }
});
canvas.addEventListener('pointerup', event => { draggingFurniture = false; dragOffset = null; finishDrawing(event); }); canvas.addEventListener('pointercancel', event => { draggingFurniture = false; dragOffset = null; finishDrawing(event); });
function finishDrawing(event) {
    if (!drawing) return; event.preventDefault(); drawing = false;
    const end = cursor || pnt(event), x = Math.min(start.x, end.x), y = Math.min(start.y, end.y), width = Math.abs(start.x - end.x), height = Math.abs(start.y - end.y);
    if (width >= 1 && height >= 1) { pushHistory(); selected = { id: crypto.randomUUID(), name: document.getElementById('roomName').value || 'Room', x, y, width, height, wall_thickness: +document.getElementById('wallThickness').value || .23, floor_height: +document.getElementById('roomHeight').value || 3, furniture: [] }; rooms.push(selected); selectedKind = 'room'; }
    start = cursor = null; draw(); updateProps();
}
function modifyOpening(field, value) {
    if (selectedKind !== 'opening' || !selected) return; pushHistory();
    if (field === 'width') selected.width = +value || selected.width; else selected[field] = value;
    placeOpening(selected); draw(); updateProps();
}
function addFurniture(type) {
    if (selectedKind !== 'room' || !selected) return;
    const sizes = { bed: [1.8, 2.1], sofa: [2.4, .8], table: [1.4, .9], desk: [1.2, .6], wardrobe: [1.2, .6], chair: [.5, .5], cabinet: [1.2, .5] };
    const [width, depth] = sizes[type] || [1, 1];
    if (width > selected.width || depth > selected.height) return alert('This furniture does not fit in the selected room.');
    pushHistory();
    selected.furniture = selected.furniture || [];
    selected.furniture.push({ id: crypto.randomUUID(), type, x: (selected.width - width) / 2, y: (selected.height - depth) / 2, width, depth, rotation: 0 });
    draw(); updateProps();
}
function removeFurniture(id) {
    if (selectedKind !== 'room' || !selected) return;
    pushHistory(); selected.furniture = (selected.furniture || []).filter(item => item.id !== id); draw(); updateProps();
}
function modifyFurniture(field, value) {
    if (selectedKind !== 'furniture' || !selected || !selectedRoom) return;
    const numeric = Number(value);
    if (field === 'rotation') selected.rotation = numeric || 0;
    if (field === 'width') selected.width = Math.max(.3, Math.min(numeric || selected.width, selectedRoom.width - selected.x));
    if (field === 'depth') selected.depth = Math.max(.3, Math.min(numeric || selected.depth, selectedRoom.height - selected.y));
    draw(); updateProps();
}
function updateUI() {
    const area = rooms.reduce((sum, room) => sum + room.width * room.height, 0), bounds = getBounds();
    document.getElementById('roomCount').textContent = rooms.length; document.getElementById('openingCount').textContent = openings.length; document.getElementById('area').textContent = area.toFixed(2) + ' m2';
    document.getElementById('summaryArea').textContent = area.toFixed(2) + ' m2'; document.getElementById('summaryWidth').textContent = bounds.width.toFixed(2) + ' m'; document.getElementById('summaryDepth').textContent = bounds.depth.toFixed(2) + ' m';
    document.getElementById('summaryHeight').textContent = ((+document.getElementById('floors').value || 1) * (+document.getElementById('floorToFloor').value || 3)).toFixed(2) + ' m';
}
function updateProps() {
    const title = document.getElementById('selectionTitle'), props = document.getElementById('props');
    if (selectedKind === 'furniture' && selected) {
        title.textContent = `Selected ${selected.type}`;
        props.innerHTML = `<label>Width (m)<input type="number" min="0.3" step="0.1" value="${selected.width}" onchange="modifyFurniture('width', this.value)"></label><label>Depth (m)<input type="number" min="0.3" step="0.1" value="${selected.depth}" onchange="modifyFurniture('depth', this.value)"></label><label>Rotation (degrees)<input type="number" step="15" value="${selected.rotation || 0}" onchange="modifyFurniture('rotation', this.value)"></label><p>Drag the furniture in the plan to reposition it.</p>`;
    } else if (selectedKind === 'opening' && selected) {
        title.textContent = selected.type === 'door' ? 'Selected Door' : 'Selected Window';
        props.innerHTML = `<label>Type<select onchange="modifyOpening('type', this.value)"><option value="door" ${selected.type === 'door' ? 'selected' : ''}>Door</option><option value="window" ${selected.type === 'window' ? 'selected' : ''}>Window</option></select></label><label>Width (m)<input type="number" min="0.3" step="0.1" value="${selected.width}" onchange="modifyOpening('width', this.value)"></label><label>Wall side<select onchange="modifyOpening('side', this.value)">${['top', 'bottom', 'left', 'right'].map(side => `<option ${selected.side === side ? 'selected' : ''}>${side}</option>`).join('')}</select></label><p>Click Delete to remove this opening.</p>`;
    } else if (selectedKind === 'room' && selected) {
        const furniture = selected.furniture || [];
        title.textContent = 'Selected Room'; props.innerHTML = `<p><b>${selected.name}</b></p><p>${selected.width.toFixed(2)} × ${selected.height.toFixed(2)} m</p><p>Area ${(selected.width * selected.height).toFixed(2)} m2</p><label>Add furniture<select onchange="addFurniture(this.value); this.selectedIndex=0"><option>Add item...</option>${['bed', 'sofa', 'table', 'desk', 'wardrobe', 'chair', 'cabinet'].map(type => `<option value="${type}">${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select></label><p><b>Furniture (${furniture.length})</b></p>${furniture.length ? furniture.map(item => `<div class="furniture-row"><span>${item.type}</span><button onclick="removeFurniture('${item.id}')" title="Remove furniture">Delete</button></div>`).join('') : '<p>No furniture added.</p>'}`;
    } else { title.textContent = 'Selected Room'; props.textContent = 'Nothing selected.'; }
}
function getProject() { return { project_name: projectName.value || 'AI House', floors: +floors.value || 1, floor_to_floor: +floorToFloor.value || 3, rooms, openings }; }
function setProject(plan) { rooms = plan.rooms || []; openings = plan.openings || []; selected = null; selectedKind = null; projectName.value = plan.project_name || 'AI House'; floors.value = plan.floors || 1; floorToFloor.value = plan.floor_to_floor || 3; fitPlan(); updateProps(); }
async function analyzeLayout() { const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getProject()) }); const data = await response.json(); if (!response.ok) return alert(JSON.stringify(data.detail)); confidence.innerHTML = `<b>Validated</b><p>Area ${data.total_area} m2</p><p>Building ${data.building_width} × ${data.building_depth} m</p><p>Furniture ${data.furniture}</p>`; }
async function saveProject() { const id = (projectName.value || 'ai-house').toLowerCase().replace(/[^a-z0-9]+/g, '-'); const response = await fetch('/api/projects/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getProject()) }); alert(response.ok ? 'Project saved.' : 'Save failed.'); }
async function loadProject() { const id = prompt('Project ID:'); if (!id) return; const response = await fetch('/api/projects/' + id); const data = await response.json(); if (!response.ok) return alert(data.detail); setProject(data); }
window.addEventListener('resize', resizeCanvas); resizeCanvas(); setTool('select');
