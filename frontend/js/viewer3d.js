/* =========================================================
   CIVIL 3D PLANNER AI
   Upgraded Architectural 3D Viewer
   ========================================================= */

let scene3D = null;
let camera3D = null;
let renderer3D = null;
let controls3D = null;
let houseGroup = null;
let lightsGroup = null;

let roofVisible = false;
let labelsVisible = true;

/* ---------------------------------------------------------
   OPEN / CLOSE VIEWER
--------------------------------------------------------- */

function open3D() {
    if (!rooms || rooms.length === 0) {
        alert("Draw a 2D floor plan first.");
        return;
    }

    document.getElementById("viewer").classList.remove("hidden");
    document.getElementById("threeCanvas").classList.remove("hidden");
    document.getElementById("elevationCanvas").classList.add("hidden");
    document.getElementById("threeControls").classList.remove("hidden");
    document.getElementById("elevationControls").classList.add("hidden");
    document.getElementById("viewerTitle").textContent =
        "🏠 Architectural 3D Model";

    create3DViewer();
}

function closeViewer() {
    document.getElementById("viewer").classList.add("hidden");
}

function openElevation() {
    if (!rooms || rooms.length === 0) {
        alert("Draw a 2D floor plan first.");
        return;
    }

    document.getElementById("viewer").classList.remove("hidden");
    document.getElementById("elevationSide").value = "front";
    document.getElementById("viewerTitle").textContent = "Front Elevation";
    document.getElementById("threeCanvas").classList.add("hidden");
    document.getElementById("elevationCanvas").classList.remove("hidden");
    document.getElementById("threeControls").classList.add("hidden");
    document.getElementById("elevationControls").classList.remove("hidden");
    redrawElevation();
}

function redrawElevation() {
    const canvas = document.getElementById("elevationCanvas");
    if (!canvas || canvas.classList.contains("hidden") || !rooms.length) return;

    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(canvas.clientWidth, 320);
    const height = Math.max(canvas.clientHeight, 240);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const bounds = getPlanBounds();
    const side = document.getElementById("elevationSide")?.value || "front";
    const sideLabels = { front: "Front", back: "Back", left: "Left", right: "Right" };
    document.getElementById("viewerTitle").textContent = `${sideLabels[side]} Elevation`;
    const floorsCount = Math.max(1, Number(document.getElementById("floors").value) || 1);
    const floorHeight = Math.max(0.1, Number(document.getElementById("floorToFloor").value) || 3);
    const totalHeight = floorsCount * floorHeight;
    const facadeLength = side === "front" || side === "back" ? bounds.width : bounds.depth;
    const padding = { left: 82, right: 42, top: 48, bottom: 84 };
    const scaleX = (width - padding.left - padding.right) / Math.max(facadeLength, 1);
    const scaleY = (height - padding.top - padding.bottom) / Math.max(totalHeight, 1);
    const scale = Math.min(scaleX, scaleY);
    const drawingWidth = facadeLength * scale;
    const drawingHeight = totalHeight * scale;
    const originX = padding.left + ((width - padding.left - padding.right) - drawingWidth) / 2;
    const groundY = padding.top + drawingHeight;

    const skyGradient = context.createLinearGradient(0, 0, 0, groundY);
    skyGradient.addColorStop(0, "#8ed8f4");
    skyGradient.addColorStop(0.62, "#d8f3fb");
    skyGradient.addColorStop(1, "#f4fbf8");
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, width, height);
    const groundGradient = context.createLinearGradient(0, groundY, 0, height);
    groundGradient.addColorStop(0, "#b8d99b");
    groundGradient.addColorStop(1, "#6fa36f");
    context.fillStyle = groundGradient;
    context.fillRect(0, groundY, width, height - groundY);
    context.fillStyle = "rgba(255, 255, 255, 0.55)";
    context.beginPath();
    context.arc(width - 58, 58, 23, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#37474f";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(24, groundY);
    context.lineTo(width - 24, groundY);
    context.stroke();

    const facadeRooms = rooms.filter(room => {
        if (side === "front") return room.y <= bounds.minY + 0.01;
        if (side === "back") return room.y + room.height >= bounds.minY + bounds.depth - 0.01;
        if (side === "left") return room.x <= bounds.minX + 0.01;
        return room.x + room.width >= bounds.minX + bounds.width - 0.01;
    });
    const facadeColors = ["#f6c98f", "#f2a7a0", "#a8d8c0", "#a9c9e8", "#e5c4f1", "#f3d78b"];
    facadeRooms.forEach((room, roomIndex) => {
        for (let floor = 0; floor < floorsCount; floor += 1) {
            const along = side === "front" || side === "back" ? room.x - bounds.minX : room.y - bounds.minY;
            const roomLength = side === "front" || side === "back" ? room.width : room.height;
            const x = originX + along * scale;
            const y = groundY - (floor + 1) * floorHeight * scale;
            const roomWidth = roomLength * scale;
            const roomHeight = floorHeight * scale;
            const baseColor = facadeColors[roomIndex % facadeColors.length];
            const facadeGradient = context.createLinearGradient(x, y, x, y + roomHeight);
            facadeGradient.addColorStop(0, floor % 2 ? baseColor : "#fff4d9");
            facadeGradient.addColorStop(1, baseColor);
            context.fillStyle = facadeGradient;
            context.fillRect(x, y, roomWidth, roomHeight);
            context.strokeStyle = "#5d6870";
            context.lineWidth = 1.5;
            context.strokeRect(x, y, roomWidth, roomHeight);
            context.fillStyle = "rgba(255, 255, 255, 0.35)";
            context.fillRect(x + 3, y + 3, Math.max(0, roomWidth - 6), Math.min(5, roomHeight / 8));
        }
    });

    openings.forEach(opening => {
        const room = rooms.find(item => item.id === opening.room_id);
        if (!room) return;
        const horizontal = side === "front" || side === "back";
        const expectedSide = side === "front" ? "top" : side === "back" ? "bottom" : side === "left" ? "left" : "right";
        const isFacadeOpening = opening.side === expectedSide;
        if (!isFacadeOpening) return;
        const openingWidth = Math.min(Number(opening.width) || 1, horizontal ? room.width : room.height) * scale;
        const along = horizontal ? opening.x - bounds.minX : opening.y - bounds.minY;
        const x = originX + along * scale;
        const openingHeight = opening.type === "door" ? 2.1 : 1.2;
        const openingFloor = Math.max(0, Math.min(floorsCount - 1, Math.floor((opening.floor || 1) - 1)));
        const y = groundY - (openingFloor + 1) * floorHeight * scale + (floorHeight - openingHeight) * scale;
        const openingGradient = context.createLinearGradient(x, y, x, y + openingHeight * scale);
        if (opening.type === "door") {
            openingGradient.addColorStop(0, "#b9784c");
            openingGradient.addColorStop(1, "#633b2b");
        } else {
            openingGradient.addColorStop(0, "#b9f1ff");
            openingGradient.addColorStop(0.5, "#38b9df");
            openingGradient.addColorStop(1, "#176f9c");
        }
        context.fillStyle = openingGradient;
        context.fillRect(x, y, openingWidth, openingHeight * scale);
        context.strokeStyle = opening.type === "door" ? "#4a281d" : "#084d72";
        context.lineWidth = 2;
        context.strokeRect(x, y, openingWidth, openingHeight * scale);
        if (opening.type === "window") {
            context.beginPath();
            context.moveTo(x + openingWidth / 2, y);
            context.lineTo(x + openingWidth / 2, y + openingHeight * scale);
            context.moveTo(x, y + openingHeight * scale / 2);
            context.lineTo(x + openingWidth, y + openingHeight * scale / 2);
            context.stroke();
        }
    });

    const roofY = padding.top;
    const roofGradient = context.createLinearGradient(0, roofY - 14, 0, roofY);
    roofGradient.addColorStop(0, "#e76f51");
    roofGradient.addColorStop(1, "#9f3f35");
    context.fillStyle = roofGradient;
    context.fillRect(originX - 8, roofY - 14, drawingWidth + 16, 14);
    context.strokeStyle = "#672d2a";
    context.lineWidth = 2;
    context.strokeRect(originX - 8, roofY - 14, drawingWidth + 16, 14);
    context.fillStyle = "#f7c948";
    context.fillRect(originX - 2, roofY - 4, drawingWidth + 4, 4);

    for (let floor = 1; floor < floorsCount; floor += 1) {
        const lineY = groundY - floor * floorHeight * scale;
        context.strokeStyle = "rgba(67, 97, 112, 0.55)";
        context.lineWidth = 1;
        context.setLineDash([5, 4]);
        context.beginPath();
        context.moveTo(originX, lineY);
        context.lineTo(originX + drawingWidth, lineY);
        context.stroke();
        context.setLineDash([]);
    }

    function dimensionLine(x1, y1, x2, y2, label, vertical = false) {
        context.strokeStyle = "#546e7a";
        context.fillStyle = "#37474f";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        const tick = 5;
        context.beginPath();
        if (vertical) {
            context.moveTo(x1 - tick, y1);
            context.lineTo(x1 + tick, y1);
            context.moveTo(x2 - tick, y2);
            context.lineTo(x2 + tick, y2);
        } else {
            context.moveTo(x1, y1 - tick);
            context.lineTo(x1, y1 + tick);
            context.moveTo(x2, y2 - tick);
            context.lineTo(x2, y2 + tick);
        }
        context.stroke();
        context.font = "12px Arial";
        context.textAlign = "center";
        if (vertical) {
            context.save();
            context.translate(x1 - 14, (y1 + y2) / 2);
            context.rotate(-Math.PI / 2);
            context.fillText(label, 0, 0);
            context.restore();
        } else {
            context.fillText(label, (x1 + x2) / 2, y1 + 18);
        }
    }

    dimensionLine(originX, groundY + 38, originX + drawingWidth, groundY + 38, `${facadeLength.toFixed(2)} m`);
    dimensionLine(originX - 32, groundY, originX - 32, roofY, `${totalHeight.toFixed(2)} m`, true);

    context.fillStyle = "#15364b";
    context.font = "600 15px Arial";
    context.textAlign = "left";
    context.fillText(`${sideLabels[side].toUpperCase()} ELEVATION`, 24, 25);
    context.font = "12px Arial";
    context.textAlign = "left";
    context.fillText(`Scale 1:${Math.max(1, Math.round(1 / Math.max(scale / 80, 0.01)))}`, 24, height - 22);
}


/* ---------------------------------------------------------
   CREATE VIEWER
--------------------------------------------------------- */

function create3DViewer() {

    const canvas = document.getElementById("threeCanvas");

    if (!canvas) return;

    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight - 52;

    /* Remove previous renderer */
    if (renderer3D) {
        renderer3D.dispose();
    }

    scene3D = new THREE.Scene();

    scene3D.background = new THREE.Color(0xb9d9e8);
    scene3D.fog = new THREE.Fog(0xb9d9e8, 35, 110);

    /* -----------------------------------------------------
       CAMERA
    ----------------------------------------------------- */

    camera3D = new THREE.PerspectiveCamera(
        45,
        width / height,
        0.1,
        1000
    );

    camera3D.position.set(14, 12, 16);

    /* -----------------------------------------------------
       RENDERER
    ----------------------------------------------------- */

    renderer3D = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });

    renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer3D.setSize(width, height);

    renderer3D.shadowMap.enabled = true;

    renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer3D.outputEncoding = THREE.sRGBEncoding;
    renderer3D.toneMapping = THREE.NoToneMapping;

    /* -----------------------------------------------------
       CAMERA CONTROLS
       THREE.js r128 has OrbitControls separately
    ----------------------------------------------------- */

    if (typeof THREE.OrbitControls !== "undefined") {
        controls3D = new THREE.OrbitControls(
            camera3D,
            renderer3D.domElement
        );

        controls3D.enableDamping = true;
        controls3D.dampingFactor = 0.06;

        controls3D.minDistance = 4;
        controls3D.maxDistance = 80;

        controls3D.maxPolarAngle = Math.PI / 2.05;

        controls3D.target.set(0, 1.5, 0);
    }

    /* -----------------------------------------------------
       LIGHTING
    ----------------------------------------------------- */

    lightsGroup = new THREE.Group();

    const ambient = new THREE.AmbientLight(
        0xffffff,
        0.28
    );

    lightsGroup.add(ambient);

    const hemi = new THREE.HemisphereLight(
        0xddeeff,
        0x777777,
        0.38
    );

    hemi.position.set(0, 20, 0);

    lightsGroup.add(hemi);

    const sun = new THREE.DirectionalLight(
        0xffffff,
        0.72
    );

    sun.position.set(
        15,
        25,
        12
    );

    sun.castShadow = true;

    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;

    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;

    lightsGroup.add(sun);

    scene3D.add(lightsGroup);


    /* -----------------------------------------------------
       HOUSE GROUP
    ----------------------------------------------------- */

    houseGroup = new THREE.Group();

    scene3D.add(houseGroup);


    /* -----------------------------------------------------
       GROUND
    ----------------------------------------------------- */

    createGround();

    /* -----------------------------------------------------
       BUILD HOUSE
    ----------------------------------------------------- */

    buildArchitecturalHouse();

    /* -----------------------------------------------------
       CAMERA POSITION
    ----------------------------------------------------- */

    fitCameraToHouse();

    /* -----------------------------------------------------
       RESIZE
    ----------------------------------------------------- */

    window.onresize = resize3DViewer;

    animate3D();
}


/* ---------------------------------------------------------
   GROUND
--------------------------------------------------------- */

function createGround() {

    const size = 80;

    const geometry =
        new THREE.PlaneGeometry(size, size);

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x789b78,
            roughness: 0.9,
            metalness: 0
        });

    const ground =
        new THREE.Mesh(
            geometry,
            material
        );

    ground.rotation.x = -Math.PI / 2;

    ground.position.y = -0.06;

    ground.receiveShadow = true;

    scene3D.add(ground);


    /* Grid */

    const grid =
        new THREE.GridHelper(
            60,
            60,
            0x64748b,
            0xb7c4cc
        );

    grid.position.y = -0.03;

    scene3D.add(grid);
}


/* ---------------------------------------------------------
   MATERIALS
--------------------------------------------------------- */

function wallMaterial() {

    return new THREE.MeshStandardMaterial({
        color: 0xd9d2c3,
        roughness: 0.8,
        metalness: 0
    });
}

function floorMaterial() {

    return new THREE.MeshStandardMaterial({
        color: 0xb8a98e,
        roughness: 0.72,
        metalness: 0.02
    });
}

function ceilingMaterial() {

    return new THREE.MeshStandardMaterial({
        color: 0xe8f1f2,
        roughness: 0.8,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        side: THREE.DoubleSide
    });
}

function roomFloorMaterial(room) {
    const colors = [0xf6c6b4, 0xb9d8f2, 0xc8e6c9, 0xf6df9d, 0xd8c4ed, 0xbfe5df];
    const index = Math.abs(String(room.id || room.name || "room").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % colors.length;
    return new THREE.MeshStandardMaterial({
        color: colors[index],
        roughness: 0.76,
        metalness: 0.02
    });
}

function doorMaterial() {

    return new THREE.MeshStandardMaterial({
        color: 0x6d4631,
        roughness: 0.65
    });
}

function windowMaterial() {

    return new THREE.MeshPhysicalMaterial({
        color: 0x74c9e8,
        transparent: true,
        opacity: 0.55,
        roughness: 0.15,
        metalness: 0.05
    });
}


/* ---------------------------------------------------------
   BUILD HOUSE
--------------------------------------------------------- */

function buildArchitecturalHouse() {

    if (!rooms || rooms.length === 0) return;

    const floorsCount =
        Number(document.getElementById("floors").value) || 1;

    const floorHeight =
        Number(document.getElementById("floorToFloor").value) || 3;

    const wallMat = wallMaterial();

    const windowMat = windowMaterial();

    const doorMat = doorMaterial();


    /* -----------------------------------------------------
       BUILD EACH ROOM
    ----------------------------------------------------- */

    rooms.forEach(room => {

        const thickness =
            Number(room.wall_thickness) || 0.23;

        const roomHeight =
            Number(room.floor_height) || floorHeight;

        for (
            let floor = 0;
            floor < floorsCount;
            floor++
        ) {

            const baseY =
                floor * floorHeight;

            /* ---------------------------------------------
               ROOM FLOOR
            --------------------------------------------- */

            createFloorSlab(
                room,
                baseY,
                roomFloorMaterial(room)
            );


            /* ---------------------------------------------
               WALLS
            --------------------------------------------- */

            createWall(
                room.x + room.width / 2,
                baseY + roomHeight / 2,
                room.y,
                room.width,
                roomHeight,
                thickness,
                wallMat
            );

            createWall(
                room.x + room.width / 2,
                baseY + roomHeight / 2,
                room.y + room.height,
                room.width,
                roomHeight,
                thickness,
                wallMat
            );

            createSideWall(
                room.x,
                baseY + roomHeight / 2,
                room.y + room.height / 2,
                thickness,
                roomHeight,
                room.height,
                wallMat
            );

            createSideWall(
                room.x + room.width,
                baseY + roomHeight / 2,
                room.y + room.height / 2,
                thickness,
                roomHeight,
                room.height,
                wallMat
            );


            /* ---------------------------------------------
               SIMPLE CEILING
            --------------------------------------------- */

            if (roofVisible && floor === floorsCount - 1) {

                createCeiling(
                    room,
                    baseY + roomHeight,
                    ceilingMaterial()
                );
            }


            /* ---------------------------------------------
               ROOM INTERIOR
            --------------------------------------------- */

            createRoomFurniture(
                room,
                baseY
            );
        }
    });


    /* -----------------------------------------------------
       DOORS
    ----------------------------------------------------- */

    if (typeof openings !== "undefined") {

        openings
            .filter(o => o.type === "door")
            .forEach(opening => {

                createDoor(
                    opening,
                    floorHeight,
                    doorMat
                );
            });


        /* -------------------------------------------------
           WINDOWS
        ------------------------------------------------- */

        openings
            .filter(o => o.type === "window")
            .forEach(opening => {

                createWindow(
                    opening,
                    floorHeight,
                    windowMat
                );
            });
    }


    /* -----------------------------------------------------
       ROOF
    ----------------------------------------------------- */

    if (roofVisible) {
        createRoof(floorsCount, floorHeight);
    }
}


/* ---------------------------------------------------------
   FLOOR SLAB
--------------------------------------------------------- */

function createFloorSlab(
    room,
    baseY,
    material
) {

    const geometry =
        new THREE.BoxGeometry(
            room.width,
            0.12,
            room.height
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(
        room.x + room.width / 2,
        baseY - 0.06,
        room.y + room.height / 2
    );

    mesh.receiveShadow = true;

    houseGroup.add(mesh);
}


/* ---------------------------------------------------------
   WALL
--------------------------------------------------------- */

function createWall(
    x,
    y,
    z,
    width,
    height,
    thickness,
    material
) {

    const geometry =
        new THREE.BoxGeometry(
            width,
            height,
            thickness
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(x, y, z);

    mesh.castShadow = true;

    mesh.receiveShadow = true;

    houseGroup.add(mesh);
}


/* ---------------------------------------------------------
   SIDE WALL
--------------------------------------------------------- */

function createSideWall(
    x,
    y,
    z,
    thickness,
    height,
    depth,
    material
) {

    const geometry =
        new THREE.BoxGeometry(
            thickness,
            height,
            depth
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(
        x,
        y,
        z
    );

    mesh.castShadow = true;

    mesh.receiveShadow = true;

    houseGroup.add(mesh);
}


/* ---------------------------------------------------------
   CEILING
--------------------------------------------------------- */

function createCeiling(
    room,
    y,
    material
) {

    const geometry =
        new THREE.BoxGeometry(
            room.width,
            0.10,
            room.height
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(
        room.x + room.width / 2,
        y,
        room.y + room.height / 2
    );

    mesh.receiveShadow = true;

    houseGroup.add(mesh);
}


/* ---------------------------------------------------------
   DOOR
--------------------------------------------------------- */

function createDoor(
    opening,
    floorHeight,
    material
) {

    const doorHeight = 2.1;

    const doorWidth =
        Number(opening.width) || 1;


    const floorsCount =
        Number(document.getElementById("floors").value) || 1;


    for (
        let floor = 0;
        floor < floorsCount;
        floor++
    ) {

        const y =
            floor * floorHeight +
            doorHeight / 2;
            const geometry =
            new THREE.BoxGeometry(
                doorWidth,
                doorHeight,
                0.08
            );

        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );


        if (
            opening.side === "top" ||
            opening.side === "bottom"
        ) {

            mesh.position.set(
                opening.x + doorWidth / 2,
                y,
                opening.y
            );

        } else {

            mesh.rotation.y =
                Math.PI / 2;

            mesh.position.set(
                opening.x,
                y,
                opening.y + doorWidth / 2
            );
        }


        mesh.castShadow = true;
        mesh.renderOrder = 3;
        mesh.material.depthTest = false;

        houseGroup.add(mesh);


        /* Door frame */

        createDoorFrame(
            opening,
            floor,
            floorHeight
        );
    }
}


/* ---------------------------------------------------------
   DOOR FRAME
--------------------------------------------------------- */

function createDoorFrame(
    opening,
    floor,
    floorHeight
) {

    const frameMat =
        new THREE.MeshStandardMaterial({
            color: 0x3e2723,
            roughness: 0.7
        });

    const w =
        Number(opening.width) || 1;

    const h = 2.1;

    const t = 0.07;

    const y =
        floor * floorHeight + h / 2;


    function frameBox(
        width,
        height,
        depth,
        x,
        yy,
        z
    ) {

        const mesh =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width,
                    height,
                    depth
                ),
                frameMat
            );

        mesh.position.set(
            x,
            yy,
            z
        );

        mesh.renderOrder = 3;
        mesh.material.depthTest = false;
        houseGroup.add(mesh);
    }


    if (
        opening.side === "top" ||
        opening.side === "bottom"
    ) {

        frameBox(
            t,
            h,
            0.13,
            opening.x,
            y,
            opening.y
        );

        frameBox(
            t,
            h,
            0.13,
            opening.x + w,
            y,
            opening.y
        );

        frameBox(
            w,
            t,
            0.13,
            opening.x + w / 2,
            floor * floorHeight + h,
            opening.y
        );

    } else {

        frameBox(
            0.13,
            h,
            t,
            opening.x,
            y,
            opening.y
        );
    }
}


/* ---------------------------------------------------------
   WINDOW
--------------------------------------------------------- */

function createWindow(
    opening,
    floorHeight,
    material
) {

    const width =
        Number(opening.width) || 1.2;

    const height = 1.2;

    const windowY =
        1.5;


    const floorsCount =
        Number(document.getElementById("floors").value) || 1;


    for (
        let floor = 0;
        floor < floorsCount;
        floor++
    ) {

        const y =
            floor * floorHeight +
            windowY;


        let geometry;


        if (
            opening.side === "top" ||
            opening.side === "bottom"
        ) {

            geometry =
                new THREE.BoxGeometry(
                    width,
                    height,
                    0.06
                );

        } else {

            geometry =
                new THREE.BoxGeometry(
                    0.06,
                    height,
                    width
                );
        }


        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );


        if (
            opening.side === "top" ||
            opening.side === "bottom"
        ) {

            mesh.position.set(
                opening.x + width / 2,
                y,
                opening.y
            );

        } else {

            mesh.position.set(
                opening.x,
                y,
                opening.y + width / 2
            );
        }


        mesh.castShadow = true;
        mesh.renderOrder = 3;
        mesh.material.depthTest = false;

        houseGroup.add(mesh);


        createWindowFrame(
            opening,
            floor,
            floorHeight
        );
    }
}

/* ---------------------------------------------------------
   WINDOW FRAME
--------------------------------------------------------- */

function createWindowFrame(
    opening,
    floor,
    floorHeight
) {

    const mat =
        new THREE.MeshStandardMaterial({
            color: 0x37474f,
            roughness: 0.45,
            metalness: 0.2
        });

    const w =
        Number(opening.width) || 1.2;

    const h = 1.2;

    const y =
        floor * floorHeight + 1.5;

    const frame = 0.06;


    function addFrame(
        geometry,
        x,
        yy,
        z
    ) {

        const mesh =
            new THREE.Mesh(
                geometry,
                mat
            );

        mesh.position.set(
            x,
            yy,
            z
        );

        mesh.renderOrder = 3;
        mesh.material.depthTest = false;
        houseGroup.add(mesh);
    }


    if (
        opening.side === "top" ||
        opening.side === "bottom"
    ) {

        addFrame(
            new THREE.BoxGeometry(
                frame,
                h,
                0.10
            ),
            opening.x,
            y,
            opening.y
        );

        addFrame(
            new THREE.BoxGeometry(
                frame,
                h,
                0.10
            ),
            opening.x + w,
            y,
            opening.y
        );

        addFrame(
            new THREE.BoxGeometry(
                w,
                frame,
                0.10
            ),
            opening.x + w / 2,
            y + h / 2,
            opening.y
        );

        addFrame(
            new THREE.BoxGeometry(
                w,
                frame,
                0.10
            ),
            opening.x + w / 2,
            y - h / 2,
            opening.y
        );

    } else {

        addFrame(
            new THREE.BoxGeometry(
                0.10,
                h,
                frame
            ),
            opening.x,
            y,
            opening.y
        );
    }
}


/* ---------------------------------------------------------
   ROOF
--------------------------------------------------------- */

function createRoof(
    floorsCount,
    floorHeight
) {

    const b = getPlanBounds();

    if (!b || !b.width || !b.depth) return;


    const roofHeight =
        floorsCount * floorHeight;


    const roofWidth =
        b.width + 0.8;

    const roofDepth =
        b.depth + 0.8;


    const roofMat =
        new THREE.MeshStandardMaterial({
            color: 0x7b4b3a,
            roughness: 0.72
        });


    /* Flat roof slab */

    const geometry =
        new THREE.BoxGeometry(
            roofWidth,
            0.20,
            roofDepth
        );


    const roof =
        new THREE.Mesh(
            geometry,
            roofMat
        );


    roof.position.set(
        b.minX + b.width / 2,
        roofHeight + 0.1,
        b.minY + b.depth / 2
    );


    roof.castShadow = true;

    houseGroup.add(roof);


    /* Small parapet */

    const parapetHeight = 0.45;

    const parapetThickness = 0.15;


    createWall(
        b.minX + b.width / 2,
        roofHeight + parapetHeight / 2,
        b.minY - 0.1,
        roofWidth,
        parapetHeight,
        parapetThickness,
        roofMat
    );

    createWall(
        b.minX + b.width / 2,
        roofHeight + parapetHeight / 2,
        b.minY + b.depth + 0.1,
        roofWidth,
        parapetHeight,
        parapetThickness,
        roofMat
    );

    createSideWall(
        b.minX - 0.1,
        roofHeight + parapetHeight / 2,
        b.minY + b.depth / 2,
        parapetThickness,
        parapetHeight,
        roofDepth,
        roofMat
    );

    createSideWall(
        b.minX + b.width + 0.1,
        roofHeight + parapetHeight / 2,
        b.minY + b.depth / 2,
        parapetThickness,
        parapetHeight,
        roofDepth,
        roofMat
    );
}

function getPlanBounds() {
    if (!rooms || !rooms.length) return { minX: 0, minY: 0, width: 0, depth: 0 };

    const minX = Math.min(...rooms.map(room => room.x));
    const minY = Math.min(...rooms.map(room => room.y));
    const maxX = Math.max(...rooms.map(room => room.x + room.width));
    const maxY = Math.max(...rooms.map(room => room.y + room.height));

    return { minX, minY, width: maxX - minX, depth: maxY - minY };
}


/* ---------------------------------------------------------
   SIMPLE ROOM FURNITURE
--------------------------------------------------------- */

function createRoomFurniture(
    room,
    baseY
) {

    const name =
        String(room.name || "").toLowerCase();


    /* Do not add furniture to tiny rooms */

    if (
        room.width < 2 ||
        room.height < 2
    ) return;


    if (
        name.includes("bedroom") ||
        name.includes("bed")
    ) {

        createBed(
            room,
            baseY
        );

    } else if (
        name.includes("living") ||
        name.includes("drawing")
    ) {

        createSofa(
            room,
            baseY
        );

    } else if (
        name.includes("kitchen")
    ) {

        createKitchen(
            room,
            baseY
        );

    } else if (
        name.includes("dining")
    ) {

        createDiningTable(
            room,
            baseY
        );
    }
}

/* ---------------------------------------------------------
   BED
--------------------------------------------------------- */

function createBed(
    room,
    baseY
) {

    const mat =
        new THREE.MeshStandardMaterial({
            color: 0xe8d8bd,
            roughness: 0.9
        });


    const bedWidth =
        Math.min(1.8, room.width * 0.55);

    const bedLength =
        Math.min(2.1, room.height * 0.55);


    const bed =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                bedWidth,
                0.35,
                bedLength
            ),
            mat
        );


    bed.position.set(
        room.x + room.width / 2,
        baseY + 0.22,
        room.y + room.height / 2
    );


    bed.castShadow = true;

    houseGroup.add(bed);


    /* Pillow */

    const pillowMat =
        new THREE.MeshStandardMaterial({
            color: 0xf5f5f5
        });


    const pillow =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                bedWidth * 0.8,
                0.12,
                0.45
            ),
            pillowMat
        );


    pillow.position.set(
        bed.position.x,
        baseY + 0.45,
        bed.position.z - bedLength / 2 + 0.35
    );


    houseGroup.add(pillow);
}


/* ---------------------------------------------------------
   SOFA
--------------------------------------------------------- */

function createSofa(
    room,
    baseY
) {

    const mat =
        new THREE.MeshStandardMaterial({
            color: 0x607d8b,
            roughness: 0.85
        });


    const w =
        Math.min(2.4, room.width * 0.55);


    const sofa =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                w,
                0.45,
                0.8
            ),
            mat
        );


    sofa.position.set(
        room.x + room.width / 2,
        baseY + 0.28,
        room.y + room.height / 2
    );


    sofa.castShadow = true;

    houseGroup.add(sofa);


    const back =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                w,
                0.7,
                0.18
            ),
            mat
        );


    back.position.set(
        sofa.position.x,
        baseY + 0.65,
        sofa.position.z + 0.32
    );


    houseGroup.add(back);
}


/* ---------------------------------------------------------
   KITCHEN
--------------------------------------------------------- */

function createKitchen(
    room,
    baseY
) {

    const cabinetMat =
        new THREE.MeshStandardMaterial({
            color: 0x8d6e63,
            roughness: 0.75
        });


    const counter =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                Math.max(1.2, room.width * 0.65),
                0.9,
                0.55
            ),
            cabinetMat
        );


    counter.position.set(
        room.x + room.width / 2,
        baseY + 0.45,
        room.y + 0.45
    );


    counter.castShadow = true;

    houseGroup.add(counter);
}


/* ---------------------------------------------------------
   DINING TABLE
--------------------------------------------------------- */

function createDiningTable(
    room,
    baseY
) {

    const tableMat =
        new THREE.MeshStandardMaterial({
            color: 0x795548,
            roughness: 0.8
        });


    const table =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.4,
                0.12,
                0.9
            ),
            tableMat
        );


    table.position.set(
        room.x + room.width / 2,
        baseY + 0.85,
        room.y + room.height / 2
    );


    houseGroup.add(table);


    /* Legs */

    for (let x of [-0.55, 0.55]) {

        for (let z of [-0.3, 0.3]) {

            const leg =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        0.08,
                        0.8,
                        0.08
                    ),
                    tableMat
                );

            leg.position.set(
                table.position.x + x,
                baseY + 0.4,
                table.position.z + z
            );

            houseGroup.add(leg);
        }
    }
}


/* ---------------------------------------------------------
   FIT CAMERA
--------------------------------------------------------- */

function fitCameraToHouse() {

    if (!houseGroup) return;

    const box =
        new THREE.Box3().setFromObject(
            houseGroup
        );


    const center =
        box.getCenter(
            new THREE.Vector3()
        );


    const size =
        box.getSize(
            new THREE.Vector3()
        );


    const maxSize =
        Math.max(
            size.x,
            size.y,
            size.z
        );


    const distance = Math.max(maxSize * 1.65, 8);


    camera3D.position.set(
        center.x + distance * 0.95,
        center.y + distance * 1.7,
        center.z + distance * 0.95
    );

    camera3D.near = Math.max(0.05, distance / 100);
    camera3D.far = Math.max(150, distance * 8);
    camera3D.updateProjectionMatrix();


    if (controls3D) {

        controls3D.target.copy(center);

        controls3D.update();
    } else {

        camera3D.lookAt(center);
    }
}


/* ---------------------------------------------------------
   RESET CAMERA
--------------------------------------------------------- */

function reset3DCamera() {

    fitCameraToHouse();
}


/* ---------------------------------------------------------
   TOGGLE ROOF
--------------------------------------------------------- */

function toggleRoof() {

    roofVisible =
        !roofVisible;

    rebuild3D();
}

/* ---------------------------------------------------------
   TOGGLE LABELS
--------------------------------------------------------- */

function toggle3DLabels() {

    labelsVisible =
        !labelsVisible;

    document
        .querySelectorAll(".room-label-3d")
        .forEach(el => {

            el.style.display =
                labelsVisible
                    ? "block"
                    : "none";
        });
}


/* ---------------------------------------------------------
   REBUILD
--------------------------------------------------------- */

function rebuild3D() {

    if (!scene3D) return;

    while (houseGroup.children.length) {

        const child =
            houseGroup.children.pop();

        if (child.geometry)
            child.geometry.dispose();

        if (child.material) {

            if (Array.isArray(child.material)) {

                child.material.forEach(
                    m => m.dispose()
                );

            } else {

                child.material.dispose();
            }
        }
    }

    buildArchitecturalHouse();

    fitCameraToHouse();
}


/* ---------------------------------------------------------
   ANIMATION
--------------------------------------------------------- */

function animate3D() {

    requestAnimationFrame(
        animate3D
    );

    if (controls3D) {

        controls3D.update();
    }

    if (renderer3D && scene3D && camera3D) {

        renderer3D.render(
            scene3D,
            camera3D
        );
    }
}


/* ---------------------------------------------------------
   RESIZE
--------------------------------------------------------- */

function resize3DViewer() {

    redrawElevation();

    if (!renderer3D || !camera3D)
        return;


    const canvas =
        document.getElementById(
            "threeCanvas"
        );


    const width =
        canvas.clientWidth ||
        window.innerWidth;


    const height =
        canvas.clientHeight ||
        window.innerHeight - 52;


    camera3D.aspect =
        width / height;


    camera3D.updateProjectionMatrix();


    renderer3D.setSize(
        width,
        height
    );
}


/* ---------------------------------------------------------
   GLOBAL FUNCTIONS
--------------------------------------------------------- */

window.open3D =
    open3D;

window.openElevation =
    openElevation;

window.redrawElevation =
    redrawElevation;

window.closeViewer =
    closeViewer;

window.reset3DCamera =
    reset3DCamera;

window.toggleRoof =
    toggleRoof;

window.toggle3DLabels =
    toggle3DLabels;

window.rebuild3D =
    rebuild3D;