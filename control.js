let autoRotate = true;
let holding = false;
let lastInteractionTime = performance.now();

let lastMouseX = window.innerWidth / 2;
let lastMouseY = window.innerHeight / 2;


let getRotationClock = () => 0; // fallback

const movementKeys = {
    w: false, // up
    a: false,
    s: false, // down
    d: false,
    z: false, // zoom in
    x: false  // zoom out
};  



// Mouse drag tracking for iMouse 
export function setupMouseControl(uniforms, renderer, rotationClockGetter) {
    getRotationClock = rotationClockGetter;

    const mouseVec = uniforms.iMouse.value;

    function updateMouseState(x, y, isDown, isHolding) {
        uniforms.iMouse.value.set(x, y, isDown ? 1 : 0, 0);
        holding = isDown;

        if (!isDown) {
            lastInteractionTime = performance.now(); // Mark when drag ends
        } else if(isHolding){
            autoRotate = false; // Stop auto-rotation on drag
        }
    }

    function updateMouseCoords(e) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouseVec.x = e.clientX - rect.left;
        mouseVec.y = rect.height - (e.clientY - rect.top);
    }


    renderer.domElement.addEventListener('mousedown', (e) => {
        updateMouseCoords(e);

        // initialize mouse-based rotation to match the auto-rotation at the moment dragging starts.
        // Convert current rotation into fake mouse pos
        const simulatedMouseX = window.innerWidth * 0.5 + Math.sin(getRotationClock() * 0.1) * 200;
        const simulatedMouseY = window.innerHeight * 0.5;
        uniforms.iMouse.value.set(simulatedMouseX, simulatedMouseY, 1.0, 0);
        
        updateMouseState(e.clientX, e.clientY, true, false);


    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        updateMouseCoords(e);

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    
        if (holding) {
            updateMouseState(e.clientX, e.clientY, true, true);
        }
    });

    renderer.domElement.addEventListener('mouseup', (e) => {
        updateMouseCoords(e);
        updateMouseState(e.clientX, e.clientY, false, false);
    });



    // Resize canvas and update iResolution
    window.addEventListener("resize", () => {
        uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1.0);
        renderer.setSize(window.innerWidth, window.innerHeight);
    });



    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key in movementKeys) movementKeys[key] = true;
    });
      

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key in movementKeys) movementKeys[key] = false;
    });

}

// This function should be called every frame from your animation loop
export function checkAutoRotateResume() {
    const now = performance.now();
    if (!holding && (now - lastInteractionTime) > 1500) {
        autoRotate = true;
    }
    return autoRotate;
}


export function getMovementKeys() {
    return { ...movementKeys }; // return a copy
}