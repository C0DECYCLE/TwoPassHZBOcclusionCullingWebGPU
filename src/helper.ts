/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import {
    maxMipLevelCount,
    SPDFilters,
    SPDPass,
    SPDPassConfig,
    SPDPrepareDeviceDescriptor,
    WebGPUSinglePassDownsampler,
} from "../node_modules/webgpu-spd/dist/index.js";
import { Camera } from "./components/Camera.js";
import { Geometry } from "./components/Geometry.js";
import { Mesh } from "./components/Mesh.js";
import { GPUPassTimestampWrites } from "./definitions/components.js";
import {
    BlendState,
    ClearColor,
    IndirectLayout,
    MSAACount,
    Requirements,
    TextureFormats,
    WORKGROUP_SIZE_1D,
    WORKGROUP_SIZE_2D,
} from "./definitions/helper.js";
import { BYTES32, UniformLayout } from "./definitions/index.js";
import { int, Nullable } from "./definitions/utils.js";
import { Frustum } from "./utilities/Frustum.js";
import { log } from "./utilities/logger.js";
import { Mat4 } from "./utilities/Mat4.js";
import { assert, dotit } from "./utilities/utils.js";

export async function requestDevice(): Promise<GPUDevice> {
    const adapter: Nullable<GPUAdapter> = await navigator.gpu.requestAdapter();
    assert(adapter);
    const device: Nullable<GPUDevice> = await adapter.requestDevice({
        label: "device",
        requiredFeatures: Requirements,
    } as GPUDeviceDescriptor);
    assert(device);
    return device;
}

export function createCanvas(): HTMLCanvasElement {
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = document.body.clientWidth * devicePixelRatio;
    canvas.height = document.body.clientHeight * devicePixelRatio;
    canvas.style.position = "absolute";
    canvas.style.top = "0px";
    canvas.style.left = "0px";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    document.body.appendChild(canvas);
    return canvas;
}

export function createContext(
    device: GPUDevice,
    canvas: HTMLCanvasElement,
): GPUCanvasContext {
    const context: Nullable<GPUCanvasContext> = canvas.getContext("webgpu");
    assert(context);
    context.configure({
        device: device,
        format: TextureFormats.canvas,
    } as GPUCanvasConfiguration);
    return context;
}

export function processGeometries(geometries: Geometry[]): Geometry[] {
    return geometries.sort((a: Geometry, b: Geometry) => a.id - b.id);
}

export function createVertexBuffer(
    geometries: Geometry[],
    device: GPUDevice,
): GPUBuffer {
    const data: Float32Array = new Float32Array(
        geometries.flatMap((geometry: Geometry) => [...geometry.vertices]),
    );
    const buffer: GPUBuffer = device.createBuffer({
        label: "vertexBuffer",
        size: data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    } as GPUBufferDescriptor);
    device.queue.writeBuffer(buffer, 0, data.buffer);
    return buffer;
}

export function createIndexBuffer(
    geometries: Geometry[],
    device: GPUDevice,
): GPUBuffer {
    const data: Uint32Array = new Uint32Array(
        geometries.flatMap((geometry: Geometry) => [...geometry.indices]),
    );
    const buffer: GPUBuffer = device.createBuffer({
        label: "indexBuffer",
        size: data.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    } as GPUBufferDescriptor);
    device.queue.writeBuffer(buffer, 0, data.buffer);
    return buffer;
}

export function createGeometryBuffer(
    geometries: Geometry[],
    device: GPUDevice,
): GPUBuffer {
    const data: Float32Array = new Float32Array(
        geometries.length * Geometry.Layout,
    );
    for (let i: int = 0; i < geometries.length; i++) {
        const geometry: Geometry = geometries[i];
        geometry.bounds.center.store(data, i * Geometry.Layout);
        data[i * Geometry.Layout + 3] = geometry.bounds.radius;
        geometry.bounds.min.store(data, i * Geometry.Layout + 3 + 1);
        geometry.bounds.max.store(data, i * Geometry.Layout + 3 + 1 + (3 + 1));
    }
    const buffer: GPUBuffer = device.createBuffer({
        label: "geometryBuffer",
        size: data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    } as GPUBufferDescriptor);
    device.queue.writeBuffer(buffer, 0, data.buffer);
    return buffer;
}

export function processMeshes(meshes: Mesh[]): Mesh[] {
    return meshes.sort((a: Mesh, b: Mesh) => a.geometry.id - b.geometry.id);
}

export function createPendingBuffer(
    meshes: Mesh[],
    device: GPUDevice,
): GPUBuffer {
    return device.createBuffer({
        label: "pendingBuffer",
        size: meshes.length * BYTES32,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    } as GPUBufferDescriptor);
}

export function createMeshBuffer(meshes: Mesh[], device: GPUDevice): GPUBuffer {
    const dataBuffer: ArrayBuffer = new ArrayBuffer(
        meshes.length * Mesh.Layout * BYTES32,
    );
    const dataFloats: Float32Array = new Float32Array(dataBuffer);
    const dataInts: Uint32Array = new Uint32Array(dataBuffer);
    for (let i: int = 0; i < meshes.length; i++) {
        const mesh: Mesh = meshes[i];
        mesh.position.store(dataFloats, i * Mesh.Layout);
        dataInts[i * Mesh.Layout + 3] = mesh.geometry.id;
    }
    const buffer: GPUBuffer = device.createBuffer({
        label: "meshBuffer",
        size: dataBuffer.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    } as GPUBufferDescriptor);
    device.queue.writeBuffer(buffer, 0, dataBuffer);
    return buffer;
}

export async function createShader(
    device: GPUDevice,
    path: string,
): Promise<GPUShaderModule> {
    return device.createShaderModule({
        code: await (await fetch(path)).text(),
    } as GPUShaderModuleDescriptor);
}

export function createUniformBuffer(device: GPUDevice): GPUBuffer {
    return device.createBuffer({
        label: "uniformBuffer",
        size: UniformLayout * BYTES32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    } as GPUBufferDescriptor);
}

export function updateUniform(
    dataBuffer: ArrayBuffer,
    camera: Camera,
    device: GPUDevice,
    buffer: GPUBuffer,
): void {
    const dataFloats: Float32Array = new Float32Array(dataBuffer);
    const dataInts: Uint32Array = new Uint32Array(dataBuffer);
    const viewProjection: Mat4 = camera.getViewProjection();
    const frustum: Frustum = new Frustum(viewProjection);
    viewProjection.store(dataFloats, 0);
    const frustumOffset: int = 4 * 4;
    frustum.left.normal.store(dataFloats, frustumOffset + 4 * 0 + 0);
    frustum.right.normal.store(dataFloats, frustumOffset + 4 * 1 + 0);
    frustum.top.normal.store(dataFloats, frustumOffset + 4 * 2 + 0);
    frustum.bottom.normal.store(dataFloats, frustumOffset + 4 * 3 + 0);
    frustum.near.normal.store(dataFloats, frustumOffset + 4 * 4 + 0);
    frustum.far.normal.store(dataFloats, frustumOffset + 4 * 5 + 0);
    dataFloats[frustumOffset + 4 * 0 + 3] = frustum.left.distance;
    dataFloats[frustumOffset + 4 * 1 + 3] = frustum.right.distance;
    dataFloats[frustumOffset + 4 * 2 + 3] = frustum.top.distance;
    dataFloats[frustumOffset + 4 * 3 + 3] = frustum.bottom.distance;
    dataFloats[frustumOffset + 4 * 4 + 3] = frustum.near.distance;
    dataFloats[frustumOffset + 4 * 5 + 3] = frustum.far.distance;
    dataInts[Camera.Layout] = (window as any).disable === true ? 1 : 0;
    dataInts[Camera.Layout + 1] = (window as any).debug ?? -1;
    device.queue.writeBuffer(buffer, 0, dataBuffer);
}

export function createIndirectBuffer(
    geometries: Geometry[],
    meshes: Mesh[],
    device: GPUDevice,
): GPUBuffer {
    const data: Uint32Array = new Uint32Array(
        geometries.length * IndirectLayout,
    );
    const meshCounts: int[] = [];
    for (let i: int = 0; i < geometries.length; i++) {
        meshCounts[i] = 0;
    }
    for (const mesh of meshes) {
        meshCounts[mesh.geometry.id]++;
    }
    let indexOffset: int = 0;
    let vertexOffset: int = 0;
    let instanceOffset: int = 0;
    /* Debug */
    let totalVertexCount: int = 0;
    let totalPolygonCount: int = 0;
    let totalMeshCount: int = 0;
    for (let i: int = 0; i < geometries.length; i++) {
        const geometry: Geometry = geometries[i];
        const indexCount: int = geometry.indices.length;
        const polygonCount: int = indexCount / 3;
        const vertexCount: int =
            geometry.vertices.length / Geometry.VertexLayout;
        const meshCount: int = meshCounts[i];
        data[i * IndirectLayout + 0] = indexCount;
        data[i * IndirectLayout + 1] = 0; // instanceCount
        data[i * IndirectLayout + 2] = indexOffset;
        data[i * IndirectLayout + 3] = vertexOffset;
        data[i * IndirectLayout + 4] = instanceOffset;
        indexOffset += indexCount;
        vertexOffset += vertexCount;
        instanceOffset += meshCount;
        /* Debug */
        log(
            "Geometry: " + geometry.id + ",",
            "Vertices: " + dotit(vertexCount) + ",",
            "Polygons: " + dotit(polygonCount) + ",",
            "Meshes: " + dotit(meshCount),
        );
        totalVertexCount += vertexCount * meshCount;
        totalPolygonCount += polygonCount * meshCount;
        totalMeshCount += meshCount;
    }
    /* Debug */
    log("---------------------------------------------------------");
    log(
        "Vertices: " + dotit(totalVertexCount) + ",",
        "Polygons: " + dotit(totalPolygonCount) + ",",
        "Meshes: " + dotit(totalMeshCount),
    );
    const buffer: GPUBuffer = device.createBuffer({
        label: "indirectBuffer",
        size: data.byteLength,
        usage:
            GPUBufferUsage.INDIRECT |
            GPUBufferUsage.STORAGE |
            GPUBufferUsage.COPY_SRC |
            GPUBufferUsage.COPY_DST,
    } as GPUBufferDescriptor);
    device.queue.writeBuffer(buffer, 0, data.buffer);
    return buffer;
}

/*
export function createDebugsBuffer(device: GPUDevice, tint: int): GPUBuffer {
    const data: Uint32Array = new Uint32Array([tint]);
    const buffer: GPUBuffer = device.createBuffer({
        label: "debugsBuffer",
        size: (1 + 3) * BYTES32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    } as GPUBufferDescriptor);
    device.queue.writeBuffer(buffer, 0, data.buffer);
    return buffer;
}
*/

export function resetIndirectBuffer(
    geometries: Geometry[],
    encoder: GPUCommandEncoder,
    buffer: GPUBuffer,
): void {
    for (let i: int = 0; i < geometries.length; i++) {
        const offset: int = (i * IndirectLayout + 1) * BYTES32;
        encoder.clearBuffer(buffer, offset, BYTES32);
    }
}

export async function createFirstPassPipeline(
    device: GPUDevice,
    shader: GPUShaderModule,
): Promise<GPUComputePipeline> {
    return await device.createComputePipelineAsync({
        label: "firstPassPipeline",
        layout: "auto",
        compute: {
            module: shader,
            entryPoint: "cs",
            constants: {
                WORKGROUP_SIZE_1D: WORKGROUP_SIZE_1D,
            } as Record<string, number>,
        } as GPUProgrammableStage,
    } as GPUComputePipelineDescriptor);
}

export async function createSecondPassPipeline(
    device: GPUDevice,
    shader: GPUShaderModule,
): Promise<GPUComputePipeline> {
    return await device.createComputePipelineAsync({
        label: "secondPassPipeline",
        layout: "auto",
        compute: {
            module: shader,
            entryPoint: "cs",
            constants: {
                WORKGROUP_SIZE_1D: WORKGROUP_SIZE_1D,
            } as Record<string, number>,
        } as GPUProgrammableStage,
    } as GPUComputePipelineDescriptor);
}

export async function createRenderPipeline(
    device: GPUDevice,
    shader: GPUShaderModule,
): Promise<GPURenderPipeline> {
    const target: GPUColorTargetState = {
        format: TextureFormats.canvas,
        blend: BlendState,
    } as GPUColorTargetState;
    return await device.createRenderPipelineAsync({
        label: "renderPipeline",
        layout: "auto",
        vertex: {
            module: shader,
            entryPoint: "vs",
        } as GPUVertexState,
        fragment: {
            module: shader,
            entryPoint: "fs",
            targets: [target],
        } as GPUFragmentState,
        primitive: {
            topology: "triangle-list",
            cullMode: "back",
        } as GPUPrimitiveState,
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: TextureFormats.depth,
        } as GPUDepthStencilState,
        multisample: {
            count: MSAACount,
            alphaToCoverageEnabled: false,
        } as GPUMultisampleState,
    } as GPURenderPipelineDescriptor);
}

export async function createDepthToHzbPipeline(
    device: GPUDevice,
    shader: GPUShaderModule,
): Promise<GPUComputePipeline> {
    return await device.createComputePipelineAsync({
        label: "depthToHzbPipeline",
        layout: "auto",
        compute: {
            module: shader,
            entryPoint: "cs",
            constants: {
                WORKGROUP_SIZE_2D: WORKGROUP_SIZE_2D,
            } as Record<string, number>,
        } as GPUProgrammableStage,
    } as GPUComputePipelineDescriptor);
}

export async function createDebugPipeline(
    device: GPUDevice,
    shader: GPUShaderModule,
    canvas: HTMLCanvasElement,
): Promise<GPURenderPipeline> {
    const target: GPUColorTargetState = {
        format: TextureFormats.canvas,
        blend: BlendState,
    } as GPUColorTargetState;
    return await device.createRenderPipelineAsync({
        label: "debugPipeline",
        layout: "auto",
        vertex: {
            module: shader,
            entryPoint: "vs",
        } as GPUVertexState,
        fragment: {
            module: shader,
            entryPoint: "fs",
            constants: {
                SCREEN_WIDTH: canvas.width,
                SCREEN_HEIGHT: canvas.height,
            } as Record<string, number>,
            targets: [target],
        } as GPUFragmentState,
        primitive: {
            topology: "triangle-list",
            cullMode: "back",
        } as GPUPrimitiveState,
        depthStencil: {
            depthWriteEnabled: false,
            depthCompare: "less",
            format: TextureFormats.depth,
        } as GPUDepthStencilState,
        multisample: {
            count: MSAACount,
            alphaToCoverageEnabled: false,
        } as GPUMultisampleState,
    } as GPURenderPipelineDescriptor);
}

export function createFirstPassBindGroup(
    device: GPUDevice,
    pipeline: GPUComputePipeline,
    bindings: Iterable<GPUBindGroupEntry>,
) {
    return device.createBindGroup({
        label: "firstPassBindGroup",
        layout: pipeline.getBindGroupLayout(0),
        entries: bindings,
    } as GPUBindGroupDescriptor);
}

export function createSecondPassBindGroup(
    device: GPUDevice,
    pipeline: GPUComputePipeline,
    bindings: Iterable<GPUBindGroupEntry>,
) {
    return device.createBindGroup({
        label: "secondPassBindGroup",
        layout: pipeline.getBindGroupLayout(0),
        entries: bindings,
    } as GPUBindGroupDescriptor);
}

export function createRenderBindGroup(
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    bindings: Iterable<GPUBindGroupEntry>,
) {
    return device.createBindGroup({
        label: "renderBindGroup",
        layout: pipeline.getBindGroupLayout(0),
        entries: bindings,
    } as GPUBindGroupDescriptor);
}

export function createDepthToHzbBindGroup(
    device: GPUDevice,
    pipeline: GPUComputePipeline,
    bindings: Iterable<GPUBindGroupEntry>,
) {
    return device.createBindGroup({
        label: "depthToHzbBindGroup",
        layout: pipeline.getBindGroupLayout(0),
        entries: bindings,
    } as GPUBindGroupDescriptor);
}

export function createDebugBindGroup(
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    bindings: Iterable<GPUBindGroupEntry>,
) {
    return device.createBindGroup({
        label: "debugBindGroup",
        layout: pipeline.getBindGroupLayout(0),
        entries: bindings,
    } as GPUBindGroupDescriptor);
}

/*
export function createDebugsBindGroup(
    device: GPUDevice,
    pipeline: GPURenderPipeline,
    bindings: Iterable<GPUBindGroupEntry>,
) {
    return device.createBindGroup({
        label: "debugsBindGroup",
        layout: pipeline.getBindGroupLayout(1),
        entries: bindings,
    } as GPUBindGroupDescriptor);
}
*/

export function baseLevelTexture(texture: GPUTexture): GPUTextureView {
    return texture.createView({
        baseMipLevel: 0,
        mipLevelCount: 1,
    } as GPUTextureViewDescriptor);
}

export function createBinding(
    index: int,
    resource: GPUBuffer | GPUTexture | GPUTextureView | GPUSampler,
): GPUBindGroupEntry {
    return {
        binding: index,
        resource: resource,
    } as GPUBindGroupEntry;
}

export function createColorTexture(
    device: GPUDevice,
    canvas: HTMLCanvasElement,
): GPUTexture {
    return device.createTexture({
        label: "colorTexture",
        size: [canvas.width, canvas.height],
        format: TextureFormats.canvas,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: MSAACount,
    } as GPUTextureDescriptor);
}

export function createDepthTexture(
    device: GPUDevice,
    canvas: HTMLCanvasElement,
): GPUTexture {
    return device.createTexture({
        label: "depthTexture",
        size: [canvas.width, canvas.height],
        format: TextureFormats.depth,
        usage:
            GPUTextureUsage.RENDER_ATTACHMENT |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_SRC,
        sampleCount: MSAACount,
    } as GPUTextureDescriptor);
}

export function floorPOT(value: int): int {
    return Math.pow(2, Math.floor(Math.log2(value)));
}

export function createHzbTexture(
    device: GPUDevice,
    canvas: HTMLCanvasElement,
): GPUTexture {
    let width: int = floorPOT(canvas.width);
    let height: int = floorPOT(canvas.height);
    return device.createTexture({
        label: "hzbTexture",
        size: [width, height],
        format: TextureFormats.hzb,
        usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.STORAGE_BINDING |
            GPUTextureUsage.COPY_SRC |
            GPUTextureUsage.COPY_DST,
        mipLevelCount: maxMipLevelCount(width, height),
    } as GPUTextureDescriptor);
}

export function createFirstPassColorAttachment(
    texture: GPUTexture,
): GPURenderPassColorAttachment {
    return {
        label: "firstPassColorAttachment",
        view: texture,
        clearValue: [...ClearColor.toArray(), 1],
        loadOp: "clear",
        storeOp: "store",
        //resolveTarget: Unnecessary,
    } as GPURenderPassColorAttachment;
}

export function createFirstPassDepthAttachment(
    texture: GPUTexture,
): GPURenderPassDepthStencilAttachment {
    return {
        label: "firstPassDepthAttachment",
        view: texture,
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
    } as GPURenderPassDepthStencilAttachment;
}

export function createSecondPassColorAttachment(
    texture: GPUTexture,
): GPURenderPassColorAttachment {
    return {
        label: "secondPassColorAttachment",
        view: texture,
        //clearValue: Unnecessary, //clearValue: [...ClearColor.toArray(), 1],
        loadOp: "load", //loadOp: "clear",
        storeOp: "store",
        //resolveTarget: Legacy later
    } as GPURenderPassColorAttachment;
}

export function createSecondPassDepthAttachment(
    texture: GPUTexture,
): GPURenderPassDepthStencilAttachment {
    return {
        label: "secondPassDepthAttachment",
        view: texture,
        //depthClearValue: Unnecessary, //depthClearValue: 1,
        depthLoadOp: "load", //depthLoadOp: "clear",
        depthStoreOp: "store",
    } as GPURenderPassDepthStencilAttachment;
}

export function createDebugColorAttachment(
    texture: GPUTexture,
): GPURenderPassColorAttachment {
    return {
        label: "debugColorAttachment",
        view: texture,
        loadOp: "load",
        storeOp: "store",
        //resolveTarget: Later
    } as GPURenderPassColorAttachment;
}

export function createDebugDepthAttachment(
    texture: GPUTexture,
): GPURenderPassDepthStencilAttachment {
    return {
        label: "debugDepthAttachment",
        view: texture,
        depthLoadOp: "load",
        depthStoreOp: "store",
    } as GPURenderPassDepthStencilAttachment;
}

export function createCommandEncoder(device: GPUDevice): GPUCommandEncoder {
    return device.createCommandEncoder({
        label: "commandEncoder",
    } as GPUObjectDescriptorBase);
}

export function beginFirstPass(
    encoder: GPUCommandEncoder,
    timestampWrites: GPUPassTimestampWrites,
): GPUComputePassEncoder {
    return encoder.beginComputePass({
        label: "firstPass",
        timestampWrites: timestampWrites,
    } as GPUComputePassDescriptor);
}

export function beginSecondPass(
    encoder: GPUCommandEncoder,
    timestampWrites: GPUPassTimestampWrites,
): GPUComputePassEncoder {
    return encoder.beginComputePass({
        label: "secondPass",
        timestampWrites: timestampWrites,
    } as GPUComputePassDescriptor);
}

export function beginRenderPass(
    encoder: GPUCommandEncoder,
    color: GPURenderPassColorAttachment,
    depth: GPURenderPassDepthStencilAttachment,
    timestampWrites: GPUPassTimestampWrites,
): GPURenderPassEncoder {
    return encoder.beginRenderPass({
        label: "renderPass",
        colorAttachments: [color],
        depthStencilAttachment: depth,
        timestampWrites: timestampWrites,
    } as GPURenderPassDescriptor);
}

export function beginDepthToHzbPass(
    encoder: GPUCommandEncoder,
    timestampWrites: GPUPassTimestampWrites,
): GPUComputePassEncoder {
    return encoder.beginComputePass({
        label: "depthToHzbPass",
        timestampWrites: timestampWrites,
    } as GPUComputePassDescriptor);
}

export function multiDrawIndexedIndirect(
    geometries: Geometry[],
    pass: GPURenderPassEncoder,
    buffer: GPUBuffer,
): void {
    for (let i: int = 0; i < geometries.length; i++) {
        const offset: int = i * IndirectLayout * BYTES32;
        pass.drawIndexedIndirect(buffer, offset);
    }
}

export function createSpd(device: GPUDevice): WebGPUSinglePassDownsampler {
    return new WebGPUSinglePassDownsampler({
        device: device,
    } as SPDPrepareDeviceDescriptor);
}

export function createSpdPipelinePass(
    spd: WebGPUSinglePassDownsampler,
    device: GPUDevice,
    texture: GPUTexture,
): SPDPass {
    const pass: Nullable<SPDPass> =
        spd.preparePass(device, texture, {
            filter: SPDFilters.Max,
        } as SPDPassConfig) ?? null;
    assert(pass);
    return pass;
}

export function beginSpdPass(
    encoder: GPUCommandEncoder,
    timestampWrites: GPUPassTimestampWrites,
): GPUComputePassEncoder {
    return encoder.beginComputePass({
        label: "spdPass",
        timestampWrites: timestampWrites,
    } as GPUComputePassDescriptor);
}

export function beginDebugPass(
    encoder: GPUCommandEncoder,
    color: GPURenderPassColorAttachment,
    depth: GPURenderPassDepthStencilAttachment,
    timestampWrites: GPUPassTimestampWrites,
): GPURenderPassEncoder {
    return encoder.beginRenderPass({
        label: "debugPass",
        colorAttachments: [color],
        depthStencilAttachment: depth,
        timestampWrites: timestampWrites,
    } as GPURenderPassDescriptor);
}
