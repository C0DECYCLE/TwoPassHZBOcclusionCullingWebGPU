/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

@group(0) @binding(0) var srcTexture: texture_depth_multisampled_2d;
@group(0) @binding(1) var dstTexture: texture_storage_2d<r32float, write>;

override WORKGROUP_SIZE_2D: u32;

@compute @workgroup_size(WORKGROUP_SIZE_2D, WORKGROUP_SIZE_2D) fn cs(@builtin(global_invocation_id) globalInvocationId: vec3u) {
    let index: vec2u = globalInvocationId.xy;
    let dstSize: vec2u = textureDimensions(dstTexture);
    if (index.x >= dstSize.x || index.y >= dstSize.y) {
        return;
    }
    let srcSize: vec2u = textureDimensions(srcTexture);
    let scale: vec2f = vec2f(srcSize) / vec2f(dstSize);
    let srcMin: vec2u = vec2u(vec2f(index) * scale);
    let srcMax: vec2u = min(vec2u(vec2f(index + vec2u(1, 1)) * scale), srcSize);
    var depthMax: f32 = 0;
    for (var y: u32 = srcMin.y; y < srcMax.y; y++) {
        for (var x: u32 = srcMin.x; x < srcMax.x; x++) {
            let sample0: f32 = textureLoad(srcTexture, vec2u(x, y), 0);
            let sample1: f32 = textureLoad(srcTexture, vec2u(x, y), 1);
            let sample2: f32 = textureLoad(srcTexture, vec2u(x, y), 2);
            let sample3: f32 = textureLoad(srcTexture, vec2u(x, y), 3);
            let depth: f32 = max(max(sample0, sample1), max(sample2, sample3));
            depthMax = max(depthMax, depth);
        }
    }
    textureStore(dstTexture, index, vec4f(depthMax, 0, 0, 1));
}