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
const statistics: Statistics = new Statistics();
const spd: WebGPUSinglePassDownsampler = createSpd(device);

/* Geometries */

const bunny: Geometry = await Geometry.FromPath("./resources/bunny.obj");
const cube: Geometry = await Geometry.FromPath("./resources/cube.obj");
const suzanne: Geometry = await Geometry.FromPath("./resources/suzanne.obj");
const torus: Geometry = await Geometry.FromPath("./resources/torus.obj");
const wallx: Geometry = await Geometry.FromPath("./resources/wallx.obj");
const wallz: Geometry = await Geometry.FromPath("./resources/wallz.obj");

const _geometries: Geometry[] = [bunny, cube, suzanne, torus, wallx, wallz];
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
for (let i: int = 0; i < 100; i++) {
    const x: float = Math.random();
    const y: float = Math.random() * 0.1 + 0.5;
    const z: float = Math.random();
    const _geos: Geometry[] = [cube, suzanne, torus, bunny];
    const geometry: Geometry = _geos[Math.floor(Math.random() * _geos.length)];
    foobar.push(new Mesh(new Vec3(x, y, z).sub(0.5).scale(30), geometry));
}
for (let i: int = 0; i < 10; i++) {
    const x: float = Math.random();
    const y: float = 0.5;
    const z: float = Math.random();
    const _geos: Geometry[] = [wallx, wallz];
    const geometry: Geometry = _geos[Math.floor(Math.random() * _geos.length)];
    foobar.push(new Mesh(new Vec3(x, y, z).sub(0.5).scale(30), geometry));
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

/* Uniform and Indirects */

const uniformDataBuffer: ArrayBuffer = new ArrayBuffer(UniformLayout * BYTES32);
const uniformBuffer: GPUBuffer = createUniformBuffer(device);

const indirectBuffer: GPUBuffer = createIndirectBuffer(
    geometries,
    meshes,
    device,
);

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

/* Run */

function frameRequestCallback(time: DOMHighResTimeStamp): void {
    assert(device && context);

    /* Update */

    statistics.update(time);
    controls.update();
    updateUniform(uniformDataBuffer, camera, device, uniformBuffer);
    secondPassColorAttachment.resolveTarget = context.getCurrentTexture();

    /* Encoder */

    const encoder: GPUCommandEncoder = createCommandEncoder(device);

    //if ((window as any).freeze !== true) {
    //if ((window as any).freeze === true) {
    //    firstPassColorAttachment.resolveTarget = context.getCurrentTexture();
    //}

    /* First Pass */

    resetIndirectBuffer(geometries, encoder, indirectBuffer);

    const firstPass: GPUComputePassEncoder = beginFirstPass(encoder);
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
    );
    firstRenderPass.setPipeline(renderPipeline);
    firstRenderPass.setBindGroup(0, renderBindGroup);
    firstRenderPass.setIndexBuffer(indexBuffer, IndexFormat);
    multiDrawIndexedIndirect(geometries, firstRenderPass, indirectBuffer);
    firstRenderPass.end();

    //if ((window as any).freeze !== true) {

    /* HZB Passes */

    const depthToHzbPass: GPUComputePassEncoder = beginDepthToHzbPass(encoder);
    depthToHzbPass.setPipeline(depthToHzbPipeline);
    depthToHzbPass.setBindGroup(0, depthToHzbBindGroup);
    depthToHzbPass.dispatchWorkgroups(
        Math.max(1, Math.ceil(hzbTexture.width / WORKGROUP_SIZE_2D)),
        Math.max(1, Math.ceil(hzbTexture.height / WORKGROUP_SIZE_2D)),
    );
    depthToHzbPass.end();

    const spdPass: GPUComputePassEncoder = beginSpdPass(encoder);
    spdPipelinePass.encode(spdPass);
    spdPass.end();

    /* Second Pass */

    resetIndirectBuffer(geometries, encoder, indirectBuffer);

    const secondPass: GPUComputePassEncoder = beginSecondPass(encoder);
    secondPass.setPipeline(secondPassPipeline);
    secondPass.setBindGroup(0, secondPassBindGroup);
    secondPass.dispatchWorkgroups(
        Math.max(1, Math.ceil(meshes.length / WORKGROUP_SIZE_1D)),
    );
    secondPass.end();

    //}
    //}

    const secondRenderPass: GPURenderPassEncoder = beginRenderPass(
        encoder,
        secondPassColorAttachment,
        secondPassDepthAttachment,
    );
    secondRenderPass.setPipeline(renderPipeline);
    secondRenderPass.setBindGroup(0, renderBindGroup);
    secondRenderPass.setIndexBuffer(indexBuffer, IndexFormat);
    multiDrawIndexedIndirect(geometries, secondRenderPass, indirectBuffer);
    secondRenderPass.end();

    /* Submit */

    device.queue.submit([encoder.finish()] as Iterable<GPUCommandBuffer>);

    /* Rerun */

    requestAnimationFrame(frameRequestCallback);
}

requestAnimationFrame(frameRequestCallback);

/*
async function saveR32FloatTextureMipAsPNG(
    device: GPUDevice,
    texture: GPUTexture,
    mipLevel: int,
    baseWidth: float,
    baseHeight: float,
) {
    const bytesPerPixel = 4; // r32float = 4 bytes per pixel
    const width = Math.max(1, baseWidth >> mipLevel);
    const height = Math.max(1, baseHeight >> mipLevel);
    const unpaddedBytesPerRow = width * bytesPerPixel;
    const align = 256;
    const paddedBytesPerRow = Math.ceil(unpaddedBytesPerRow / align) * align;
    const bufferSize = paddedBytesPerRow * height;
    const readBuffer = device.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
        {
            texture,
            mipLevel,
        },
        {
            buffer: readBuffer,
            bytesPerRow: paddedBytesPerRow,
        },
        { width, height, depthOrArrayLayers: 1 },
    );
    device.queue.submit([encoder.finish()]);
    await readBuffer.mapAsync(GPUMapMode.READ);
    const mapped = readBuffer.getMappedRange();
    const data = new Float32Array(mapped);
    const floatData = new Float32Array(width * height);
    const elementsPerRow = unpaddedBytesPerRow / bytesPerPixel;
    const paddedElementsPerRow = paddedBytesPerRow / bytesPerPixel;
    for (let y = 0; y < height; y++) {
        const srcStart = y * paddedElementsPerRow;
        const dstStart = y * elementsPerRow;
        floatData.set(
            data.subarray(srcStart, srcStart + elementsPerRow),
            dstStart,
        );
    }
    readBuffer.unmap();
    const imageData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < floatData.length; i++) {
        const v = Math.min(Math.max(floatData[i], 0), 1);
        const byte = Math.round(v * 255);
        imageData[i * 4 + 0] = byte;
        imageData[i * 4 + 1] = byte;
        imageData[i * 4 + 2] = byte;
        imageData[i * 4 + 3] = 255;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    assert(ctx);
    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
    const blob: Blob | null = await new Promise((res: BlobCallback) =>
        canvas.toBlob(res, "image/png"),
    );
    assert(blob);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `texture_mip${mipLevel}.png`;
    a.click();
    URL.revokeObjectURL(url);
}

(window as any).saveHzb = (mipLevel: int) =>
    saveR32FloatTextureMipAsPNG(
        device,
        hzbTexture,
        mipLevel,
        hzbTexture.width,
        hzbTexture.height,
    );

function isOccluded(worldMin: Vec3, worldMax: Vec3): void {
    const cnv: HTMLCanvasElement = document.createElement("canvas");
    cnv.width = document.body.clientWidth * devicePixelRatio;
    cnv.height = document.body.clientHeight * devicePixelRatio;
    cnv.style.position = "absolute";
    cnv.style.top = "0px";
    cnv.style.left = "0px";
    cnv.style.width = "100%";
    cnv.style.height = "100%";
    document.body.appendChild(cnv);
    const ctx: Nullable<CanvasRenderingContext2D> = cnv.getContext("2d");
    assert(ctx);

    const viewProjection: Mat4 = camera.getViewProjection().clone().transpose();
    const corners: Vec3[] = [
        new Vec3(worldMin.x, worldMin.y, worldMin.z),
        new Vec3(worldMax.x, worldMin.y, worldMin.z),
        new Vec3(worldMin.x, worldMax.y, worldMin.z),
        new Vec3(worldMax.x, worldMax.y, worldMin.z),
        new Vec3(worldMin.x, worldMin.y, worldMax.z),
        new Vec3(worldMax.x, worldMin.y, worldMax.z),
        new Vec3(worldMin.x, worldMax.y, worldMax.z),
        new Vec3(worldMax.x, worldMax.y, worldMax.z),
    ];
    const screenMin: Vec2 = new Vec2(1, 1);
    const screenMax: Vec2 = new Vec2(0, 0);
    let depthMin: float = 1;
    for (let i: int = 0; i < 8; i++) {
        const corner: Vec3 = corners[i];
        const clip: Vec4 = new Vec4(corner.x, corner.y, corner.z, 1);
        clip.multiply(viewProjection);
        const ndc: Vec3 = Vec3.From(clip).divide(clip.w);
        const screen: Vec2 = Vec2.From(ndc).scale(0.5, -0.5).add(0.5, 0.5);
        screen.x = clamp(screen.x, 0, 1);
        screen.y = clamp(screen.y, 0, 1);
        screenMin.x = Math.min(screenMin.x, screen.x);
        screenMin.y = Math.min(screenMin.y, screen.y);
        screenMax.x = Math.max(screenMax.x, screen.x);
        screenMax.y = Math.max(screenMax.y, screen.y);
        depthMin = Math.min(depthMin, ndc.z);

        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(
            screen.x * cnv.width - 5,
            screen.y * cnv.height - 5,
            10,
            10,
        );
    }
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fillRect(
        screenMin.x * cnv.width,
        screenMin.y * cnv.height,
        (screenMax.x - screenMin.x) * cnv.width,
        (screenMax.y - screenMin.y) * cnv.height,
    );

    log(depthMin);
    const size: Vec2 = screenMax
        .clone()
        .sub(screenMin)
        .scale(hzbTexture.width, hzbTexture.height);
    const level: int = Math.ceil(Math.log2(Math.max(size.x, size.y)));
    log(Math.max(size.x, size.y), Math.log2(Math.max(size.x, size.y)), level);

    const levelLower: int = level - 1;
    const lowerScale: float = Math.pow(2, -levelLower);
    const lowerSize: Vec2 = new Vec2(
        Math.ceil(screenMax.x * lowerScale) -
            Math.floor(screenMin.x * lowerScale),
        Math.ceil(screenMax.y * lowerScale) -
            Math.floor(screenMin.y * lowerScale),
    );
    const finalLevel: int =
        lowerSize.x <= 2 && lowerSize.y <= 2 ? levelLower : level;
    log(levelLower, lowerScale, lowerSize, finalLevel);

    const approx: float = 1024 / Math.pow(2, finalLevel);
    log(approx);
    const dimensions: Vec3 = new Vec3(approx, approx);
    log(
        new Vec3(screenMin.x, screenMin.y).scale(dimensions),
        new Vec3(screenMin.x, screenMax.y).scale(dimensions),
        new Vec3(screenMax.x, screenMin.y).scale(dimensions),
        new Vec3(screenMax.x, screenMax.y).scale(dimensions),
    );
}

(window as any).cpuOcclusion = () =>
    isOccluded(
        bunny.bounds.min.clone().add(foo.position),
        bunny.bounds.max.clone().add(foo.position),
    );
*/
