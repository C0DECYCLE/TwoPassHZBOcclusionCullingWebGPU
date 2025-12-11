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

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var hzbTexture: texture_2d<f32>;

override SCREEN_WIDTH: f32;
override SCREEN_HEIGHT: f32;

@vertex fn vs(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
    let positions: array<vec2f, 3> = array<vec2f, 3>(
        vec2f(-1, -3),
        vec2f(3, 1),
        vec2f(-1, 1)
    );
    return vec4f(positions[vertexIndex], 0, 1);
}

@fragment fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f {    
    let screenSize: vec2f = vec2f(SCREEN_WIDTH, SCREEN_HEIGHT);
    let uv: vec2f = position.xy / screenSize;
    let level: u32 = uniforms.debug;
    let levelSize: vec2u = textureDimensions(hzbTexture, level);
    let coord: vec2u = vec2u(
        clamp(u32(uv.x * f32(levelSize.x)), 0, levelSize.x - 1),
        clamp(u32(uv.y * f32(levelSize.y)), 0, levelSize.y - 1),
    );
    let depth: f32 = textureLoad(hzbTexture, coord, level).r;
    let cut: bool = depth < 0.999;
    let r: f32 = select(0.0, 1.0, cut);
    let a: f32 = select(0.0, 0.5, cut);
    return vec4f(r, 0, 0, a);
    //let v: f32 = pow(depth, 10);
    //return vec4f(v, v, v, 1);
}