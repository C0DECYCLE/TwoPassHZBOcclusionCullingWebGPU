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
    disable: u32,
    debug: u32,
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
@group(0) @binding(2) var<storage, read> meshes: array<Mesh>;
@group(0) @binding(3) var<storage, read_write> pending: array<u32>;
@group(0) @binding(4) var<storage, read_write> indirects: array<Indirect>;

@compute @workgroup_size(WORKGROUP_SIZE_1D) fn cs(@builtin(global_invocation_id) globalInvocationId: vec3u) {
    let index: u32 = globalInvocationId.x;
    if (index >= arrayLength(&meshes)) {
        return;
    }
    let camera: Camera = uniforms.camera;
    let mesh: Mesh = meshes[index];
    if (mesh.visible == 0) {
        return;
    }
    let geometry: Geometry = geometries[mesh.geometry];
    let center: vec3f = geometry.center + mesh.position;
    let radius: f32 = geometry.radius;
    if (insideFrustum(camera.frustum, center, radius) == false) {
        return;
    }
    let offset: u32 = atomicAdd(&indirects[mesh.geometry].instanceCount, 1);
    pending[indirects[mesh.geometry].firstInstance + offset] = index;
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