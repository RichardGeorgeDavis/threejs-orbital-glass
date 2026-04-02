export const heroVertexShader = `
    attribute vec3 a_instancePos;
    attribute vec4 a_instanceQuaternions;

    #ifdef IS_DEPTH
        varying vec2 vHighPrecisionZW;
    #else
        varying vec3 v_worldPosition;
        varying vec2 v_uv;
        varying vec3 v_instancePos;
        varying vec3 v_viewPosition;
        varying vec3 v_viewNormal;
        varying vec3 v_modelPosition;
        varying vec3 v_worldNormal;

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
    #endif
    
    uniform float u_scale;
    uniform float u_time;
    uniform vec3 u_sphere1Position;
    uniform vec3 u_sphere2Position;
    uniform vec3 u_sphere3Position;
    uniform vec3 u_sphere4Position;
	
    #define saturate( a ) clamp( a, 0.0, 1.0 )

    float linearStep(float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    }

    const float PI = 3.1415654;

    vec3 rotateByQuaternion(vec3 v, vec4 q) {
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
    }

    vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
        return normalize((vec4(dir, 0.0) * matrix).xyz);
    }

    void main() {
        vec3 pos = position;
        vec3 norm = normal;

        float distanceToSphere1 = length(a_instancePos - u_sphere1Position);
        float distanceToSphere2 = length(a_instancePos - u_sphere2Position);
        float distanceToSphere3 = length(a_instancePos - u_sphere3Position);
        float distanceToSphere4 = length(a_instancePos - u_sphere4Position);
        
        float attenuationStrength = 4.0;

        float displacement = 1.0 - clamp(1.0 / (attenuationStrength * distanceToSphere1 * distanceToSphere1), 0.0, 1.0);
        displacement = min(displacement, 1.0 - clamp(1.0 / (attenuationStrength * distanceToSphere2 * distanceToSphere2), 0.0, 1.0));
        displacement = min(displacement, 1.0 - clamp(1.0 / (attenuationStrength * distanceToSphere3 * distanceToSphere3), 0.0, 1.0));
        displacement = min(displacement, 1.0 - clamp(1.0 / (attenuationStrength * distanceToSphere4 * distanceToSphere4), 0.0, 1.0));
        
        float tip = 1.0 - step(-2.5, pos.y);
        if (tip > 0.5) {
            pos.y = -2.5;
            norm = vec3(0, -1, 0);
        }

        pos = rotateByQuaternion(pos, a_instanceQuaternions);
        pos *= u_scale;
        pos += a_instancePos;
        pos += normalize(a_instancePos) * 0.4 * pow(displacement, 0.7);
        
        norm = rotateByQuaternion(norm, a_instanceQuaternions);

        vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);

        gl_Position = projectionMatrix * viewPosition;

        #ifdef IS_DEPTH
            vHighPrecisionZW = gl_Position.zw;
        #else
            vec4 worldPosition = (modelMatrix * vec4(pos, 1.0));

            v_uv = uv;
            v_viewNormal = normalize(normalMatrix * norm);
            v_worldPosition = worldPosition.xyz;
            v_modelPosition = position;
            v_viewPosition = -viewPosition.xyz;
            v_instancePos = a_instancePos;
            v_worldNormal = inverseTransformDirection(v_viewNormal, viewMatrix);

            vDirectionalShadowCoord[0] = directionalShadowMatrix[0] * worldPosition + vec4(v_worldNormal * directionalLightShadows[0].shadowNormalBias, 0. );
        #endif
    }
`
export const heroFragmentShader = `
    varying vec3 v_worldPosition;
    varying vec2 v_uv;
    varying vec3 v_instancePos;
    varying vec3 v_instanceRands;
    varying vec3 v_viewPosition;
    varying vec3 v_viewNormal;
    varying vec3 v_modelPosition;
    varying vec3 v_worldNormal;
    varying vec2 vHighPrecisionZW;   
    
    uniform vec3 u_lightPosition;
    uniform sampler2D u_noiseTexture;
    uniform vec2 u_noiseTexelSize;
    uniform vec2 u_noiseCoordOffset;
    uniform vec3 u_color;

    uniform sampler2D directionalShadowMap[ 1 ];
    varying vec4 vDirectionalShadowCoord[ 1 ];

    struct DirectionalLightShadow {
        float shadowBias;
        float shadowNormalBias;
        float shadowRadius;
        vec2 shadowMapSize;
    };
    uniform DirectionalLightShadow directionalLightShadows[ 1 ];

    #define saturate( a ) clamp( a, 0.0, 1.0 )

    float linearStep(float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
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
        shadow *= getShadow( directionalShadowMap[0], directionalLight.shadowMapSize, directionalLight.shadowBias - blueNoise.z * 0.002, directionalLight.shadowRadius, vDirectionalShadowCoord[0] + vec4(blueNoise.xy / directionalLight.shadowMapSize, 0.0, 0.0));
        return shadow;
    }

    void main() {
	    vec3 viewNormal = normalize(v_viewNormal);
        vec3 L = normalize(u_lightPosition - v_instancePos);
	    vec3 N = normalize(normalize(v_instancePos) + 0.2 * normalize(v_worldNormal));
        float NdL = max(0., dot(N, L));

        float distFromLight = length(u_lightPosition - v_worldPosition);
        float attenuation = 1.0 / (0.00025 * pow(distFromLight, 8.0));

        float ao = linearStep(-0.5, -3.0, v_modelPosition.y);

        float shadow = getShadowMask();
        shadow = 0.4 + 0.6 * shadow;
        
        vec3 color = u_color;
        color *= clamp(attenuation + smoothstep(-0.05, 1.0, NdL), 0.0, 1.0);
        color = pow(color, vec3(0.8));
        color *= ao * ao;
        color *= shadow;

        gl_FragColor = vec4(color, 1.0);
        gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1.0 / 2.2));
    }
`

export const heroDepthFragmentShader = `
    #include <common>
    #include <packing>
    varying vec2 vHighPrecisionZW;
    void main() {
        float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
        gl_FragColor = packDepthToRGBA( fragCoordZ );
    }
`