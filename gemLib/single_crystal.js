// shader.js
export default `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform samplerCube iChannel0;

uniform int numPlanes;
uniform vec4 planes[32]; // max size
uniform vec3 gemCenter;

uniform vec3 rgb_factor;


// reference: https://www.shadertoy.com/view/3tyyDz 
#define AA      0
#define GAMMA   1
#define ANIMATE 1

const float cref = 0.95;
const float speed = -0.02;


const float fltMax = 1000000.;
const float fltMin = -1000000.;

// from xjorma https://www.shadertoy.com/view/3tVcDh

bool convexIntersect( in vec3 ro, in vec3 rd, out vec2 oDis, out vec3 oNor)
{
    oDis = vec2(fltMin, fltMax);
    for(int i = 0 ; i < 32; i++)
    {
        if (i >= numPlanes) break;
        vec4 plane = planes[i];
        float t = -(plane.w + dot(plane.xyz, ro)) / dot(plane.xyz, rd);
        if(dot(plane.xyz, rd) < 0.) // enter
        {
            if(t > oDis.x)
            {
                oDis.x = t;
                oNor = plane.xyz;
            }
        }
        else  // exit
        {
            oDis.y = min(oDis.y, t);
        }
    }
    if(oDis.x < oDis.y)
    {
        return true;
    }
    return false;
}


// Noise from Nimitz https://www.shadertoy.com/view/4ts3z2
float tri(in float x)
{
    return abs(fract(x) - .5);
}
vec3 tri3(in vec3 p)
{
    return vec3( tri(p.z + tri(p.y * 1.)), tri(p.z + tri(p.x * 1.)), tri(p.y + tri(p.z * 1.)));
}
                                 

float triNoise3d(in vec3 p, in float inter)
{
    float z= 1.4;
	float rz = 0.;
    vec3 bp = p;
	for (float i = 0.; i <= inter; i++)
	{
        p += tri3(bp * 2.);
#if ANIMATE
        p += iTime * speed;
#endif
        bp *= 1.8;
		z *= 1.5;
		p *= 1.2;
        
        rz+= (tri(p.z + tri(p.x + tri(p.y)))) / z;
        bp += 0.14;
	}
	return rz;
}

float map(in vec3 p)
{
    return pow(triNoise3d(p * 0.1, 3.), 1.);
}

// https://iquilezles.org/articles/normalsSDF
vec3 calcNormal( in vec3 pos )
{
    vec2 e = vec2(1.0,-1.0)*0.5773*0.0005;
    return normalize( e.xyy*map( pos + e.xyy ) + 
					  e.yyx*map( pos + e.yyx ) + 
					  e.yxy*map( pos + e.yxy ) + 
					  e.xxx*map( pos + e.xxx ) );
}


// from Guil https://www.shadertoy.com/view/MtX3Ws
vec4 raymarch( in vec3 ro, inout vec3 rd, float mind, float maxd)
{
    float t = mind;
    float dt = .02;
    vec4 col= vec4(0.);
    float c = 0.;
    for( int i=0; i < 128; i++ )
	{
        t+=dt*exp(-2.*c);
        if( t > maxd)
            break;
        vec3 pos = ro+t*rd;
        
        c = map(pos);
        
        rd = normalize(mix(rd, -calcNormal(pos), 0.0003));  // Little refraction effect
        
        float glow = c * 0.8; // or even lower
        
        //col = 0.99*col + .03 * vec4(glow*glow, glow, glow*glow*glow, glow);	//more green like

        col = 0.99*col + .03 * vec4(pow(glow, rgb_factor[0]), pow(glow, rgb_factor[1]),  pow(glow, rgb_factor[2]), glow);
    }    
    return col;
}

vec4 textureGamma(samplerCube sampler, vec3 v)
{
    vec4 col = texture(sampler, v);
    #if GAMMA
    	return pow(col, vec4(2.2));
    #else
        return col;
    #endif
}


vec3 render(in vec3 ro,in vec3 rd)
{
    vec3 col;
    vec3  n;
    vec2  d;
    if(convexIntersect(ro, rd, d, n))
    {
        vec3 refl = reflect(rd, n);
        vec3 refr = refract(rd, n, cref);
        vec3 nout;
        vec2 dout;
        convexIntersect(ro + rd * d.x + refr * 20., -refr, dout, nout);
        dout.x = 20. - dout.x;
        vec4 c = raymarch(ro + rd * d.x, refr, 0., dout.x);
        nout *= -1.;    // If want the normal in the opposite direction we are inside not outside
        vec3 refrOut = refract(refr, nout, mix(1. / cref, 1., smoothstep(0.35, 0.20, dot(refr, -nout))));   // Dirty trick to avoid refract returning a zero vector when nornal and vector are almost perpendicular and eta bigger than 1.
        col = mix(textureGamma(iChannel0, refrOut).rgb, c.rgb, c.a);
        float fresnel = 1.0 - pow(dot(n, -rd), 2.);
        col += textureGamma(iChannel0, refl).rgb * fresnel;   // add reflexion
    }
    else
    {
        discard;
    }
    return col;
}



mat3 setCamera( in vec3 ro, in vec3 ta )
{
	vec3 cw = normalize(ta-ro);
	vec3 up = vec3(0, 1, 0);
	vec3 cu = normalize( cross(cw,up) );
	vec3 cv = normalize( cross(cu,cw) );
    return mat3( cu, cv, cw );
}


vec3 vignette(vec3 color, vec2 q, float v)
{
    color *= 0.3 + 0.8 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), v);
    return color;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec3 tot = vec3(0.0);      
#if AA
	vec2 rook[4];
    rook[0] = vec2( 1./8., 3./8.);
    rook[1] = vec2( 3./8.,-1./8.);
    rook[2] = vec2(-1./8.,-3./8.);
    rook[3] = vec2(-3./8., 1./8.);
    for( int n=0; n<4; ++n )
    {
        // pixel coordinates
        vec2 o = rook[n];
        vec2 p = (-iResolution.xy + 2.0*(fragCoord+o))/iResolution.y;
#else //AA
        vec2 p = (-iResolution.xy + 2.0*fragCoord)/iResolution.y;
#endif //AA
        // camera        
        float theta	= radians(360.) * (iMouse.x/iResolution.x-0.5) + iTime*.2;
        float phi	= radians(70.) * (iMouse.y/iResolution.y-0.5) - radians(60.);
        vec3 ta = vec3(0.);
        vec3 ro = ta + 3. * vec3( sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
        // camera-to-world transformation
        mat3 ca = setCamera( ro, ta );
        vec3 rd =  ca*normalize(vec3(p,1.5));        
        vec3 col = render(ro ,rd);  
        tot += col;            
#if AA
    }
    tot /= 4.;
#endif
    #if GAMMA
    	tot = pow(tot, vec3(1. / 2.2));
    #endif
    tot = vignette(tot, fragCoord / iResolution.xy, 0.6);
    fragColor = vec4( tot, 1.0 );
}

void main() {
    vec4 color;
    mainImage(color, gl_FragCoord.xy);
    gl_FragColor = color;
}
`;