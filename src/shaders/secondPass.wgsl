/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

struct Plane {
    normal: vec3f,
    distance: f32,
};

struct Frustum {
    left: Plane,
    right: Plane,
    top: Plane,
    bottom: Plane,
    near: Plane,
    far: Plane,
};

struct Camera {
    viewProjection: mat4x4f,
    frustum: Frustum,
};

struct Uniforms {
    camera: Camera,
};

struct Geometry {
    center: vec3f,
    radius: f32,
    min: vec3f,
    max: vec3f,
};

struct Mesh {
    position: vec3f,
    geometry: u32,
    visible: u32,
};

struct Indirect {
    indexCount: u32,
    instanceCount: atomic<u32>,
    firstIndex: u32,
    baseVertex: u32,
    firstInstance: u32
};

override WORKGROUP_SIZE_1D: u32;

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> geometries: array<Geometry>;
@group(0) @binding(2) var<storage, read_write> meshes: array<Mesh>;
@group(0) @binding(3) var<storage, read_write> pending: array<u32>;
@group(0) @binding(4) var<storage, read_write> indirects: array<Indirect>;
@group(0) @binding(5) var hzbTexture: texture_2d<f32>;

@compute @workgroup_size(WORKGROUP_SIZE_1D) fn cs(@builtin(global_invocation_id) globalInvocationId: vec3u) {
    let index: u32 = globalInvocationId.x;
    if (index >= arrayLength(&meshes)) {
        return;
    }
    let camera: Camera = uniforms.camera;
    let mesh: Mesh = meshes[index];
    let geometry: Geometry = geometries[mesh.geometry];
    let center: vec3f = geometry.center + mesh.position;
    let radius: f32 = geometry.radius;
    if (insideFrustum(camera.frustum, center, radius) == false) {
        meshes[index].visible = 0; //
        return;
    }
    let min: vec3f = geometry.min + mesh.position;
    let max: vec3f = geometry.max + mesh.position;
    if (isOccluded(min, max) == true) {
        meshes[index].visible = 0; //
        return;
    }
    ///*
    if (mesh.visible == 1) {
        return;
    }
    //*/
    let offset: u32 = atomicAdd(&indirects[mesh.geometry].instanceCount, 1);
    pending[indirects[mesh.geometry].firstInstance + offset] = index;
    meshes[index].visible = 1; //
}

fn insideFrustum(frustum: Frustum, center: vec3f, radius: f32) -> bool {
	var visible: bool = true;
	visible = visible && dot(frustum.left.normal, center) + frustum.left.distance > -radius;
	visible = visible && dot(frustum.right.normal, center) + frustum.right.distance > -radius;
	visible = visible && dot(frustum.top.normal, center) + frustum.top.distance > -radius;
	visible = visible && dot(frustum.bottom.normal, center) + frustum.bottom.distance > -radius;
	visible = visible && dot(frustum.near.normal, center) + frustum.near.distance > -radius;
	visible = visible && dot(frustum.far.normal, center) + frustum.far.distance > -radius;
    return visible;
}

fn isOccluded(boundsMin: vec3f, boundsMax: vec3f) -> bool {
    let camera: Camera = uniforms.camera;
    let bounds: array<vec3f, 8> = array<vec3f, 8>(
        vec3f(boundsMin.x, boundsMin.y, boundsMin.z),
        vec3f(boundsMax.x, boundsMin.y, boundsMin.z),
        vec3f(boundsMin.x, boundsMax.y, boundsMin.z),
        vec3f(boundsMax.x, boundsMax.y, boundsMin.z),
        vec3f(boundsMin.x, boundsMin.y, boundsMax.z),
        vec3f(boundsMax.x, boundsMin.y, boundsMax.z),
        vec3f(boundsMin.x, boundsMax.y, boundsMax.z),
        vec3f(boundsMax.x, boundsMax.y, boundsMax.z),
    );
    var screenMin: vec2f = vec2f(1, 1);
    var screenMax: vec2f = vec2f(0, 0);
    var depthMin: f32 = 1;
    for (var i: u32 = 0; i < 8; i++) {
        let clipspace: vec4f = camera.viewProjection * vec4f(bounds[i], 1);
        let ndcspace: vec3f = clipspace.xyz / clipspace.w;
        let screenspace: vec2f = clamp(ndcspace.xy * vec2f(0.5, -0.5) + vec2f(0.5, 0.5), vec2f(0, 0), vec2f(1, 1));
        screenMin = min(screenMin, screenspace);
        screenMax = max(screenMax, screenspace);
        depthMin = min(depthMin, ndcspace.z);
    }
    let baseSize: vec2u = textureDimensions(hzbTexture, 0);
    let size: vec2f = (screenMax - screenMin) * vec2f(baseSize);
    let levelMax: u32 = textureNumLevels(hzbTexture) - 1;
    let level: u32 = clamp(u32(ceil(log2(max(size.x, size.y)))), 0, levelMax);
    let levelLower: u32 = max(0, level - 1);
    let lowerScale: vec2f = vec2f(exp2(-f32(levelLower)), exp2(-f32(levelLower)));
    let lowerSize: vec2f = ceil(screenMax * lowerScale) - floor(screenMin * lowerScale);
    let finalLevel = select(level, levelLower, lowerSize.x <= 2 && lowerSize.y <= 2);
    let levelSize: vec2u = textureDimensions(hzbTexture, finalLevel);
    let minX: u32 = clamp(u32(screenMin.x * f32(levelSize.x)), 0, levelSize.x - 1);
    let minY: u32 = clamp(u32(screenMin.y * f32(levelSize.y)), 0, levelSize.y - 1);
    let maxX: u32 = clamp(u32(screenMax.x * f32(levelSize.x)), 0, levelSize.x - 1);
    let maxY: u32 = clamp(u32(screenMax.y * f32(levelSize.y)), 0, levelSize.y - 1);
    let depthLT: f32 = textureLoad(hzbTexture, vec2u(minX, minY), finalLevel).r;
    let depthRT: f32 = textureLoad(hzbTexture, vec2u(maxX, minY), finalLevel).r;
    let depthLB: f32 = textureLoad(hzbTexture, vec2u(minX, maxY), finalLevel).r;
    let depthRB: f32 = textureLoad(hzbTexture, vec2u(maxX, maxY), finalLevel).r;
    let depthMax: f32 = max(max(depthLT, depthRT), max(depthLB, depthRB));
    return depthMin > depthMax;
}