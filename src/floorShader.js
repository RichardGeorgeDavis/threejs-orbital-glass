export const floorVertexShader = `
varying vec3 v_viewNormal;
varying vec2 v_uv;
varying vec3 v_modelPosition;
varying vec3 v_worldPosition;
varying vec3 v_viewPosition;

#ifdef USE_SHADOWMAP
    uniform mat4 directionalShadowMatrix[1];
    varying vec4 vDirectionalShadowCoord[1];

    struct DirectionalLightShadow {
        float shadowBias;
        float shadowNormalBias;
        float shadowRadius;
        vec2 shadowMapSize;
    };

    uniform DirectionalLightShadow directionalLightShadows[1];
#endif

#define saturate( a ) clamp( a, 0.0, 1.0 )
vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
    return normalize((vec4(dir, 0.0) * matrix).xyz);
}

void main () {
    vec3 pos = position;
    vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);

    gl_Position = projectionMatrix * viewPosition;

    vec4 worldPosition = (modelMatrix * vec4(pos, 1.0));
	v_viewNormal = normalMatrix * normal;
	v_uv = uv;
    v_modelPosition = position;
    v_worldPosition = worldPosition.xyz;
    v_viewPosition = -viewPosition.xyz;
    vec3 worldNormal = inverseTransformDirection(v_viewNormal, viewMatrix);

    vDirectionalShadowCoord[0] = directionalShadowMatrix[0] * worldPosition + vec4(worldNormal * directionalLightShadows[0].shadowNormalBias, 0. );
}
`

export const floorFragmentShader = `
varying vec3 v_viewNormal;
varying vec3 v_viewPosition;
varying vec3 v_worldPosition;
varying vec2 v_uv;

uniform sampler2D directionalShadowMap[ 1 ];
varying vec4 vDirectionalShadowCoord[ 1 ];

struct DirectionalLightShadow {
    float shadowBias;
    float shadowNormalBias;
    float shadowRadius;
    vec2 shadowMapSize;
};
uniform DirectionalLightShadow directionalLightShadows[ 1 ];
uniform sampler2D u_noiseTexture;
uniform vec2 u_noiseTexelSize;
uniform vec2 u_noiseCoordOffset;

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}

#include <packing>

float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
    return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
}

float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
    float shadow = 1.0;

    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.z += shadowBias;

    bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
    bool inFrustum = all( inFrustumVec );

    bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );

    bool frustumTest = all( frustumTestVec );

    if ( frustumTest ) {
        vec2 texelSize = vec2( 1.0 ) / shadowMapSize;

        float dx0 = - texelSize.x * shadowRadius;
        float dy0 = - texelSize.y * shadowRadius;
        float dx1 = + texelSize.x * shadowRadius;
        float dy1 = + texelSize.y * shadowRadius;
        float dx2 = dx0 / 2.0;
        float dy2 = dy0 / 2.0;
        float dx3 = dx1 / 2.0;
        float dy3 = dy1 / 2.0;

        shadow = (
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
        ) * ( 1.0 / 17.0 );
    }

    return shadow;
}

vec3 getBlueNoise (vec2 coord) {
    return texture2D(u_noiseTexture, coord * u_noiseTexelSize + u_noiseCoordOffset).rgb;
}


float getShadowMask() {
    float shadow = 1.0;
    vec3 blueNoise = getBlueNoise(gl_FragCoord.xy);
    DirectionalLightShadow directionalLight = directionalLightShadows[0];
    shadow *= 0.75 + 0.25 *getShadow( directionalShadowMap[0], directionalLight.shadowMapSize, directionalLight.shadowBias - blueNoise.z * 0.01, directionalLight.shadowRadius, vDirectionalShadowCoord[0] + vec4(50.0 * blueNoise.xy / directionalLight.shadowMapSize, 0.0, 0.0));
    shadow *= getShadow( directionalShadowMap[0], directionalLight.shadowMapSize, directionalLight.shadowBias - blueNoise.z * 0.5, directionalLight.shadowRadius, vDirectionalShadowCoord[0] + vec4(50.0 * blueNoise.xy / directionalLight.shadowMapSize, 0.0, 0.0));
    return shadow;
}

void main() {
	vec3 viewNormal = normalize(v_viewNormal);
    float shadow = getShadowMask();
    
    vec3 color = vec3(shadow);
    gl_FragColor = vec4(vec3(0.0, 0.02, 0.0), 0.3 * (1.0 - shadow));
}
`

