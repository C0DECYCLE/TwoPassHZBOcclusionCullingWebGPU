/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import {
    SPDPass,
    WebGPUSinglePassDownsampler,
} from "../node_modules/webgpu-spd/dist/index.js";
import { Camera } from "./components/Camera.js";
import { Controls } from "./components/Controls.js";
import { Geometry } from "./components/Geometry.js";
import { Mesh } from "./components/Mesh.js";
import { Statistics } from "./components/Statistics.js";
import { WORKGROUP_SIZE_1D, WORKGROUP_SIZE_2D } from "./definitions/helper.js";
import { BYTES32, IndexFormat, UniformLayout } from "./definitions/index.js";
import { float, int } from "./definitions/utils.js";
import {
    baseLevelTexture,
    beginDebugPass,
    beginDepthToHzbPass,
    beginFirstPass,
    beginRenderPass,
    beginSecondPass,
    beginSpdPass,
    createBinding,
    createCanvas,
    createColorTexture,
    createCommandEncoder,
    createContext,
    createDebugBindGroup,
    createDebugColorAttachment,
    createDebugDepthAttachment,
    createDebugPipeline,
    createDepthTexture,
    createDepthToHzbBindGroup,
    createDepthToHzbPipeline,
    createFirstPassBindGroup,
    createFirstPassColorAttachment,
    createFirstPassDepthAttachment,
    createFirstPassPipeline,
    createGeometryBuffer,
    createHzbTexture,
    createIndexBuffer,
    createIndirectBuffer,
    createMeshBuffer,
    createPendingBuffer,
    createRenderBindGroup,
    createRenderPipeline,
    createSecondPassBindGroup,
    createSecondPassColorAttachment,
    createSecondPassDepthAttachment,
    createSecondPassPipeline,
    createShader,
    createSpd,
    createSpdPipelinePass,
    createUniformBuffer,
    createVertexBuffer,
    multiDrawIndexedIndirect,
    processGeometries,
    processMeshes,
    requestDevice,
    resetIndirectBuffer,
    updateUniform,
} from "./helper.js";
import { assert } from "./utilities/utils.js";
import { Vec3 } from "./utilities/Vec3.js";

/* Initialize */

const device: GPUDevice = await requestDevice();
const canvas: HTMLCanvasElement = createCanvas();
const context: GPUCanvasContext = createContext(device, canvas);
const camera: Camera = new Camera(canvas);
const controls: Controls = new Controls(canvas, camera);
const statistics: Statistics = new Statistics(device);
const spd: WebGPUSinglePassDownsampler = createSpd(device);

/* Geometries */

//const cube: Geometry = await Geometry.FromPath("./resources/cube.obj");
//const torus: Geometry = await Geometry.FromPath("./resources/torus.obj");
const bunny: Geometry = await Geometry.FromPath("./resources/bunny.obj");
const suzanne: Geometry = await Geometry.FromPath("./resources/suzanne.obj");
const wallx: Geometry = await Geometry.FromPath("./resources/wallx.obj");
const wallz: Geometry = await Geometry.FromPath("./resources/wallz.obj");
const floor: Geometry = await Geometry.FromPath("./resources/floor.obj");

const _geometries: Geometry[] = [bunny, suzanne, wallx, wallz, floor];
const geometries: Geometry[] = processGeometries(_geometries);
const vertexBuffer: GPUBuffer = createVertexBuffer(geometries, device);
const indexBuffer: GPUBuffer = createIndexBuffer(geometries, device);
const geometryBuffer: GPUBuffer = createGeometryBuffer(geometries, device);

/* Meshes */

/*
const foo: Mesh = new Mesh(new Vec3(0, -1, -9), bunny);
const bar: Mesh = new Mesh(new Vec3(0, 0, -3), cube);
const meshes: Mesh[] = processMeshes([foo, bar]);
*/

/*
const foobar: Mesh[] = [];
for (let i: int = 0; i < 1000; i++) {
    const x: float = Math.floor(i / (10 * 10));
    const y: float = Math.floor(i / 10) % 10;
    const z: float = i % 10;
    foobar.push(new Mesh(new Vec3(x, y, z).sub(5).scale(3), cube));
}
const meshes: Mesh[] = processMeshes([...foobar]);
*/

const foobar: Mesh[] = [];
//foobar.push(new Mesh(new Vec3(0, 0, 0), floor));
for (let i: int = 0; i < 2000; i++) {
    const x: float = Math.random();
    const y: float = 0.5 + 0.01 + Math.random() * 0.02;
    const z: float = Math.random();
    const _geos: Geometry[] = [/*cube, torus,*/ suzanne, bunny];
    const geometry: Geometry = _geos[Math.floor(Math.random() * _geos.length)];
    foobar.push(new Mesh(new Vec3(x, y, z).sub(0.5).scale(160), geometry));
}
for (let i: int = 0; i < 100; i++) {
    const x: float = Math.random();
    const y: float = 0.5 + Math.random() * 0.01;
    const z: float = Math.random();
    const _geos: Geometry[] = [wallx, wallz];
    const geometry: Geometry = _geos[Math.floor(Math.random() * _geos.length)];
    foobar.push(new Mesh(new Vec3(x, y, z).sub(0.5).scale(180), geometry));
}

const meshes: Mesh[] = processMeshes([...foobar]);
const meshBuffer: GPUBuffer = createMeshBuffer(meshes, device);
const pendingBuffer: GPUBuffer = createPendingBuffer(meshes, device);

/* Shaders */

const firstPassShader: GPUShaderModule = await createShader(
    device,
    "./src/shaders/firstPass.wgsl",
);
const secondPassShader: GPUShaderModule = await createShader(
    device,
    "./src/shaders/secondPass.wgsl",
);
const renderShader: GPUShaderModule = await createShader(
    device,
    "./src/shaders/render.wgsl",
);
const depthToHzbShader: GPUShaderModule = await createShader(
    device,
    "./src/shaders/depthToHzb.wgsl",
);
const debugShader: GPUShaderModule = await createShader(
    device,
    "./src/shaders/debug.wgsl",
);

/* Uniform and Indirects */

const uniformDataBuffer: ArrayBuffer = new ArrayBuffer(UniformLayout * BYTES32);
const uniformBuffer: GPUBuffer = createUniformBuffer(device);
const indirectBuffer: GPUBuffer = createIndirectBuffer(
    geometries,
    meshes,
    device,
);
/*
const debugs0Buffer: GPUBuffer = createDebugsBuffer(device, 0);
const debugs1Buffer: GPUBuffer = createDebugsBuffer(device, 1);
const debugs2Buffer: GPUBuffer = createDebugsBuffer(device, 2);
*/

/* Textures and Attachments */

const colorTexture: GPUTexture = createColorTexture(device, canvas);
const depthTexture: GPUTexture = createDepthTexture(device, canvas);
const hzbTexture: GPUTexture = createHzbTexture(device, canvas);

const firstPassColorAttachment: GPURenderPassColorAttachment =
    createFirstPassColorAttachment(colorTexture);
const firstPassDepthAttachment: GPURenderPassDepthStencilAttachment =
    createFirstPassDepthAttachment(depthTexture);
const secondPassColorAttachment: GPURenderPassColorAttachment =
    createSecondPassColorAttachment(colorTexture);
const secondPassDepthAttachment: GPURenderPassDepthStencilAttachment =
    createSecondPassDepthAttachment(depthTexture);
const debugColorAttachment: GPURenderPassColorAttachment =
    createDebugColorAttachment(colorTexture);
const debugDepthAttachment: GPURenderPassDepthStencilAttachment =
    createDebugDepthAttachment(depthTexture);

/* Pipelines, Passes and BindGroups */

const firstPassPipeline: GPUComputePipeline = await createFirstPassPipeline(
    device,
    firstPassShader,
);
const secondPassPipeline: GPUComputePipeline = await createSecondPassPipeline(
    device,
    secondPassShader,
);
const renderPipeline: GPURenderPipeline = await createRenderPipeline(
    device,
    renderShader,
);
const depthToHzbPipeline: GPUComputePipeline = await createDepthToHzbPipeline(
    device,
    depthToHzbShader,
);
const debugPipeline: GPURenderPipeline = await createDebugPipeline(
    device,
    debugShader,
    canvas,
);

const spdPipelinePass: SPDPass = createSpdPipelinePass(spd, device, hzbTexture);

const firstPassBindGroup: GPUBindGroup = createFirstPassBindGroup(
    device,
    firstPassPipeline,
    [
        createBinding(0, uniformBuffer),
        createBinding(1, geometryBuffer),
        createBinding(2, meshBuffer),
        createBinding(3, pendingBuffer),
        createBinding(4, indirectBuffer),
    ],
);
const secondPassBindGroup: GPUBindGroup = createSecondPassBindGroup(
    device,
    secondPassPipeline,
    [
        createBinding(0, uniformBuffer),
        createBinding(1, geometryBuffer),
        createBinding(2, meshBuffer),
        createBinding(3, pendingBuffer),
        createBinding(4, indirectBuffer),
        createBinding(5, hzbTexture),
    ],
);
const renderBindGroup: GPUBindGroup = createRenderBindGroup(
    device,
    renderPipeline,
    [
        createBinding(0, uniformBuffer),
        createBinding(1, pendingBuffer),
        createBinding(2, meshBuffer),
        createBinding(3, vertexBuffer),
    ],
);
const depthToHzbBindGroup: GPUBindGroup = createDepthToHzbBindGroup(
    device,
    depthToHzbPipeline,
    [
        createBinding(0, depthTexture),
        createBinding(1, baseLevelTexture(hzbTexture)),
    ],
);
const debugBindGroup: GPUBindGroup = createDebugBindGroup(
    device,
    debugPipeline,
    [createBinding(0, uniformBuffer), createBinding(1, hzbTexture)],
);
/*
const debugs0BindGroup: GPUBindGroup = createDebugsBindGroup(
    device,
    renderPipeline,
    [createBinding(0, debugs0Buffer)],
);
const debugs1BindGroup: GPUBindGroup = createDebugsBindGroup(
    device,
    renderPipeline,
    [createBinding(0, debugs1Buffer)],
);
const debugs2BindGroup: GPUBindGroup = createDebugsBindGroup(
    device,
    renderPipeline,
    [createBinding(0, debugs2Buffer)],
);
*/

(window as any).disable = false;
(window as any).freeze = false;
(window as any).debug = -1;

/* Run */

function frameRequestCallback(time: DOMHighResTimeStamp): void {
    assert(device && context);

    /* Update */

    controls.update();
    updateUniform(uniformDataBuffer, camera, device, uniformBuffer);

    //secondPassColorAttachment.resolveTarget = context.getCurrentTexture();
    debugColorAttachment.resolveTarget = context.getCurrentTexture();

    /* Encoder */

    const encoder: GPUCommandEncoder = createCommandEncoder(device);

    /* First Pass */

    resetIndirectBuffer(geometries, encoder, indirectBuffer);

    const firstPass: GPUComputePassEncoder = beginFirstPass(
        encoder,
        statistics.getTimestampWrites(0),
    );
    firstPass.setPipeline(firstPassPipeline);
    firstPass.setBindGroup(0, firstPassBindGroup);
    firstPass.dispatchWorkgroups(
        Math.max(1, Math.ceil(meshes.length / WORKGROUP_SIZE_1D)),
    );
    firstPass.end();

    const firstRenderPass: GPURenderPassEncoder = beginRenderPass(
        encoder,
        firstPassColorAttachment,
        firstPassDepthAttachment,
        statistics.getTimestampWrites(1),
    );
    firstRenderPass.setPipeline(renderPipeline);
    firstRenderPass.setBindGroup(0, renderBindGroup);
    //firstRenderPass.setBindGroup(1, debugs1BindGroup);
    firstRenderPass.setIndexBuffer(indexBuffer, IndexFormat);
    multiDrawIndexedIndirect(geometries, firstRenderPass, indirectBuffer);
    firstRenderPass.end();

    /* HZB Passes */

    const depthToHzbPass: GPUComputePassEncoder = beginDepthToHzbPass(
        encoder,
        statistics.getTimestampWrites(2),
    );
    depthToHzbPass.setPipeline(depthToHzbPipeline);
    depthToHzbPass.setBindGroup(0, depthToHzbBindGroup);
    depthToHzbPass.dispatchWorkgroups(
        Math.max(1, Math.ceil(hzbTexture.width / WORKGROUP_SIZE_2D)),
        Math.max(1, Math.ceil(hzbTexture.height / WORKGROUP_SIZE_2D)),
    );
    depthToHzbPass.end();

    const spdPass: GPUComputePassEncoder = beginSpdPass(
        encoder,
        statistics.getTimestampWrites(3),
    );
    spdPipelinePass.encode(spdPass);
    spdPass.end();

    /* Second Pass */

    if ((window as any).freeze !== true) {
        resetIndirectBuffer(geometries, encoder, indirectBuffer);

        const secondPass: GPUComputePassEncoder = beginSecondPass(
            encoder,
            statistics.getTimestampWrites(4),
        );
        secondPass.setPipeline(secondPassPipeline);
        secondPass.setBindGroup(0, secondPassBindGroup);
        secondPass.dispatchWorkgroups(
            Math.max(1, Math.ceil(meshes.length / WORKGROUP_SIZE_1D)),
        );
        secondPass.end();
    } else {
        const dummy: GPURenderPassEncoder = beginRenderPass(
            encoder,
            secondPassColorAttachment,
            secondPassDepthAttachment,
            statistics.getTimestampWrites(4),
        );
        dummy.end();
    }

    const secondRenderPass: GPURenderPassEncoder = beginRenderPass(
        encoder,
        secondPassColorAttachment,
        secondPassDepthAttachment,
        statistics.getTimestampWrites(5),
    );
    if ((window as any).freeze !== true) {
        secondRenderPass.setPipeline(renderPipeline);
        secondRenderPass.setBindGroup(0, renderBindGroup);
        //secondRenderPass.setBindGroup(1, debugs2BindGroup);
        secondRenderPass.setIndexBuffer(indexBuffer, IndexFormat);
        multiDrawIndexedIndirect(geometries, secondRenderPass, indirectBuffer);
    }
    secondRenderPass.end();

    /* Debug Pass */

    const debugPass: GPURenderPassEncoder = beginDebugPass(
        encoder,
        debugColorAttachment,
        debugDepthAttachment,
        statistics.getTimestampWrites(6),
    );
    if ((window as any).debug !== -1 && (window as any).freeze !== true) {
        debugPass.setPipeline(debugPipeline);
        debugPass.setBindGroup(0, debugBindGroup);
        debugPass.draw(3, 1, 0, 0);
    }
    debugPass.end();

    /* Statistics */

    statistics.encode(encoder);

    /* Submit */

    device.queue.submit([encoder.finish()] as Iterable<GPUCommandBuffer>);

    /* Statistics */

    statistics.update(time);

    /* Rerun */

    requestAnimationFrame(frameRequestCallback);
}

requestAnimationFrame(frameRequestCallback);

// readback mesh counts
