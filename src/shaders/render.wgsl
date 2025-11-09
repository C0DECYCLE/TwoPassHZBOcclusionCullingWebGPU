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

struct Mesh {
    position: vec3f,
    geometry: u32,
    visible: u32,
};

struct Vertex {
    position: vec3f,
};

struct Result {
    @builtin(position) clipspace: vec4f,
    @interpolate(flat) @location(0) color: vec4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> pending: array<u32>;
@group(0) @binding(2) var<storage, read> meshes: array<Mesh>;
@group(0) @binding(3) var<storage, read> vertices: array<Vertex>;

@vertex fn vs(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> Result {
    let camera: Camera = uniforms.camera;
    let mesh: Mesh = meshes[pending[instanceIndex]];
    let vertex: Vertex = vertices[vertexIndex];
    let worldspace: vec3f = mesh.position + vertex.position;
    let clipspace: vec4f = camera.viewProjection * vec4f(worldspace, 1);
    let color: vec4f = vec4f(random(f32(pending[instanceIndex])), 1);
    return Result(clipspace, color);
}

@fragment fn fs(vertex: Result) -> @location(0) vec4f {    
    return vertex.color;
}

fn random(value: f32) -> vec3f {
    return fract(vec3f(value * 0.1443, value * 0.6841, value * 0.7323)) * 0.75 + 0.25;
}