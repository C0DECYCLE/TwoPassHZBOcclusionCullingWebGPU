/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

enable primitive_index;

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

struct Mesh {
    position: vec3f,
    geometry: u32,
    visible: u32,
};

struct Vertex {
    position: vec3f,
};

/*
struct Debugs {
    tint: u32,
};
*/

struct Result {
    @builtin(position) clipspace: vec4f,
    @interpolate(flat) @location(0) color: vec3f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> pending: array<u32>;
@group(0) @binding(2) var<storage, read> meshes: array<Mesh>;
@group(0) @binding(3) var<storage, read> vertices: array<Vertex>;
//@group(1) @binding(0) var<uniform> debugs: Debugs;

@vertex fn vs(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Result {
    let camera: Camera = uniforms.camera;
    let mesh: Mesh = meshes[pending[instanceIndex]];
    let vertex: Vertex = vertices[vertexIndex];
    let worldspace: vec3f = mesh.position + vertex.position;
    let clipspace: vec4f = camera.viewProjection * vec4f(worldspace, 1);
    let color: vec3f = random(f32(pending[instanceIndex]));
    return Result(clipspace, color);
}

@fragment fn fs(@builtin(primitive_index) primitiveIndex: u32, vertex: Result) -> @location(0) vec4f {    
    return vec4f(mix(vertex.color, random(f32(primitiveIndex)), 0.25), 1);
    /*
    switch debugs.tint {
        case 0: { return vec4f(mix(vertex.color, random(f32(primitiveIndex)), 0.25), 1); }
        case 1: { return vec4f(0, 0, 1, 1); }
        case 2: { return vec4f(1, 1, 0, 1); }
        default: { return vec4f(0, 0, 0, 1); }
    }
    */
}

fn random(value: f32) -> vec3f {
    return fract(vec3f(value * 0.1443, value * 0.6841, value * 0.7323)) * 0.75 + 0.25;
}