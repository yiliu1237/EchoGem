// shader.js
export default `
    #define DTR 0.01745329
    #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))

    const int MAX_STEPS = 25;
    precision mediump float; 
    uniform vec3 iResolution;
    uniform float uRotationTime;
    uniform vec4 iMouse;
    uniform vec4 uClick;
    uniform vec3 zoomTarget;
    uniform float zoomProgress;
    uniform vec3 currentCameraPos;
    uniform vec3 baseColor;

    vec2 uv;
    vec3 cp,cn,cr,ro,rd,ss,oc,cc,gl,vb;
    vec4 fc;
    float tt,cd,sd,io,oa,td;
    int es=0,ec;

    //Computes the signed distance from a point p to an axis-aligned box of half-size s centered at origin (a box with s = vec3(1.0) has full size 2.0 × 2.0 × 2.0)
    //If any component of q is positive, then p is outside the box on that axis. If all components of q are negative, then p is inside the box.
    //q = abs(p) - s gives you how far p is from the box on each axis. (The shortest straight-line distance from the point p to the surface of the box.)
    //length(max(q, 0.0)) → computes Euclidean distance to the box *only if outside*
    float bx(vec3 p, vec3 s) {
      vec3 q = abs(p) - s;
      return min(max(q.x, max(q.y, q.z)), 0.0) + length(max(q, 0.0));
    }


    //smin(a, b, k) returns a smoothly blended minimum between a and b, where k controls how soft or rounded the transition is.
    // mix(a, b, t) => a * (1.0 - t) + b * t
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); //how much to blend between a and b.
      return mix(b, a, h) - k * h * (1.0 - h);
    }


    // lattice is a space-warping function - it repeatedly rotates, folds, and shifts space to create a complex, crystal-like structure.
    // p: The 3D point to be modified
    // iter:  Number of repetitions (loops)
    // an : angle in degrees used to rotate space (will be converted to radians)
    vec3 lattice(vec3 p, int iter, float an)
    {
      for(int i = 0; i < 9; i++) //hardcoded
      {
        p.xy *= rot(an*DTR);  //makes the shape spin in 2D around the Z axis.
        p.yz=abs(p.yz)-1.;
        p.xz *= rot(-an*DTR); //rotate in the XZ plane (around Y axis), but in the opposite direction.
      }
      return p;
    }

    // Calculates the signed distance from point p to a procedurally generated
    // crystal-like shape made from a warped and repeated box structure.
    // Also updates visual properties like glow, color, and material settings
    // when the ray hits the surface.
    float mp(vec3 p){
      // MOUSE CONTROL: rotate space based on mouse position
      if (iMouse.z > 0.) { 
        p.yz *= rot(2.0 * (iMouse.y / iResolution.y - 0.5));  // rotate in YZ (vertical drag)
        p.zx *= rot(-7.0 * (iMouse.x / iResolution.x - 0.5)); // rotate in ZX (horizontal drag)
      }

      vec3 pp = p; // backup (not used here, might be for debugging or legacy)

      // Add rotation over time
      p.xz *= rot(tt * 0.1);  // slow spin around Y axis
      p.xy *= rot(tt * 0.1);  // slow spin around Z axis


      //Fracture the space into a crystal lattice
      //vec3 p_0 = lattice(p, 9, 45. + cos(tt * 0.1) * 5.) - vec3(20.0, 0.0,  0.0);

      p = lattice(p, 9, 45. + cos(tt * 0.1) * 5.); 

      //Distance to a box at the origin
      sd = bx(p, vec3(1)) - 0.01;

      //float sd_0 = bx(p_0, vec3(1)) - 0.01;

      //sd = smin(sd, sd_0, 0.8);
      sd = smin(sd, sd, 0.8);

      //Add glow effect by accumulating values from the distance field
      gl += exp(-sd * 0.001) * normalize(p * p) * 0.003;

      sd=abs(sd)-0.001;

      // Surface hit detection
      if (sd < 0.001) {
        oc = vec3(1);         // Color on hit (white)
        io = 1.2;             // Index of refraction (used later)
        oa = 0.0;             // Opacity accumulator
        ss = vec3(0);         // Specular/secondary light (unused here)
        vb = vec3(0.,10,2.8); // Some params: visibility, max depth, blend curve?
        ec = 2;               // Event counter (used in ray bounce logic)
      }

      return sd;
    }


    // Performs a raymarching loop to trace the ray from the current ray origin (ro) 
    // along direction (rd) and accumulate distance into cd.
    void tr() {
      vb.x = 0.;  // Reset effect parameter (maybe 'visibility blend'?)
      cd = 0.;    // Total distance traveled along the ray

      for (int i = 0; i < 256; i++) {
        mp(ro + rd * cd); // Evaluate distance at current point along the ray
        cd += sd;         // Advance along the ray by that distance
        td += sd;         // Also track total traveled distance (for glow/fog)

        if (sd < 0.0001 || cd > 128.) break; // Hit or exceeded max range
      }
    }

    //calculate gradient of the SDF at point cp, which is the surface normal.
    //SDF gives the shortest distance from any point in space to the surface of an object. 
    //The gradient of that function tells you which direction the distance increases fastest.
    void nm() {
      float e = 0.001;

      //k[0] = cp - vec3(e, 0, 0) : slightly behind cp on X
      //k[1] = cp - vec3(0, e, 0) : slightly behind on Y
      //k[2] = cp - vec3(0, 0, e) : slightly behind on Z
      mat3 k = mat3(cp, cp, cp) - mat3(0.001); 
    
      cn = normalize(vec3(
        mp(cp) - mp(cp - vec3(e, 0, 0)),  // ∂SDF/∂x
        mp(cp) - mp(cp - vec3(0, e, 0)),  // ∂SDF/∂y
        mp(cp) - mp(cp - vec3(0, 0, e))   // ∂SDF/∂z
      ));
    }

    
    // Calculates the final color cc for the current ray step based on
    // lighting, glow, ambient occlusion, and surface properties.
    // Inputs:
    //   - rd: ray direction
    //   - cr: current reflection/refraction direction
    //   - cn: surface normal at current point
    //   - cp: current surface point
    //   - gl: accumulated glow
    //   - oc: base surface color (usually white)
    //   - vb.x: visibility blend (used for transparency or effects)

    // Output:
    //   - cc: calculated color at the hit point
    void px(){
      cc = baseColor + length(pow(abs(rd + vec3(0, 0.5, 0)), vec3(3))) * 0.3 + gl;
      vec3 l = vec3(0.9, 0.7, 0.5);  // Light direction

      if (cd > 128.) { oa = 1.; return; } //If we didn't hit anything (traveled too far), skip the lighting and fully fade the current ray by setting opacity = 1.

      //diffuse lighting term.
      float df = clamp(length(cn * l), 0.0, 1.0);

      //fresnel/reflection fade near grazing angles
      vec3 fr = pow(1. - df, 3.) * mix(cc, vec3(0.4), 0.5);

      // Calculates a specular highlight.
      float sp = (1. - length(cross(cr, cn * l))) * 0.2;

      //ambient occlusion
      float ao = min(mp(cp + cn * 0.3) - 0.3, 0.3) * 0.4;

      //final color
      cc = mix((oc * (df + fr + ss) + fr + sp + ao + gl), oc, vb.x);
    }


    // Renders a single fragment (pixel) by casting a ray into the scene,
    // tracing its interactions (hits, reflections, refractions), and
    // accumulating color and glow into a final output color.
    // Parameters:
    //   - frag: fragment (pixel) position on screen
    //   - res: screen resolution
    //   - time: global animation time
    //   - col: (out) final RGBA color for this pixel
    void render(vec2 frag, vec2 res, float time, out vec4 col){
      fc = vec4(0.0); // Final color accumulator (RGBA)
      gl = vec3(0.0); //Global glow accumulator

      tt = mod(time + 25., 260.); // Time offset used for animation.

      //Converts pixel coordinate to centered, normalized UV coordinates.
      //Adjusts for screen aspect ratio so it looks correct on all devices.
      uv = vec2(frag.x / res.x, frag.y / res.y);
      uv -= 0.5;
      uv /= vec2(res.y / res.x, 1.0);

      //This smoothly animates a value an over time in a fancy curve.
      float an = (sin(tt * 0.3) * 0.5 + 0.5);
      an = 1.0 - pow(1.0 - pow(an, 5.0), 10.0);


      //ro = vec3(0, 0, -5.0 - an * 15.0);   // Ray origin (camera position)

      // vec3 baseCam = vec3(0, 0, -8.0);
      // ro = mix(baseCam, zoomTarget, zoomProgress);
      ro = currentCameraPos;


      rd = normalize(vec3(uv, 1.0));       // Ray direction

      for (int i = 0; i < 25; i++){
        tr();              // March until hit or miss

        cp = ro + rd * cd; // Surface hit point

        nm();              // Calculate normal at cp
        ro = cp - cn * 0.01;

        //Simulates light bending through glass/crystal.
        cr = refract(rd, cn, mod(float(i), 2.0) == 0.0 ? 1.0 / io : io);
        if (length(cr) == 0.0 && es <= 0) {
          cr = reflect(rd, cn); // fallback to reflection
          es = ec;
        }

        //Handles whether the ray should bounce.
        if (mod(float(max(float(es), 0.0)), 3.0) == 0.0 && cd < 128.0) rd = cr;
        es--;

        //Adjusts opacity oa based on how far the ray has traveled.
        if (vb.x > 0.0 && mod(float(i), 2.0) == 1.0){
          oa = pow(clamp(cd / vb.y, 0.0, 1.0), vb.z);
        }

        px(); // Computes cc = final color for this step

        fc = fc + vec4(cc * oa, oa) * (1.0 - fc.a);

        if (fc.a >= 1.0 || cd > 128.0) break;
      }
      col = fc / fc.a;  //if (fc.a >= 1.0 || cd > 128.0) break;
    }


    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      render(fragCoord.xy, iResolution.xy, uRotationTime, fragColor);
    
      // fallback safety color if fragColor is empty
      if (fragColor.a <= 0.0) {
        fragColor = vec4(1.0, 0.0, 1.0, 1.0); // bright pink debug
      }
    }

    void main() {
      vec4 color;
      mainImage(color, gl_FragCoord.xy);
      gl_FragColor = color;
    }`;