/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import {
    CSVItem,
    GPUPassTimestampWrites,
    Timestamps,
} from "../definitions/components.js";
import { float, int, Nullable } from "../definitions/utils.js";
import { warn } from "../utilities/logger.js";
import { RollingAverage } from "../utilities/RollingAverage.js";
import {
    assert,
    dotit,
    left,
    msToFps,
    right,
    sum,
} from "../utilities/utils.js";
import { Vec2 } from "../utilities/Vec2.js";
import { IndirectReadback } from "./IndirectReadback.js";
import { TimingQuery } from "./TimingQuery.js";

export class Statistics {
    private static readonly FontSize: int = Math.min(
        Math.floor(document.body.clientHeight * 0.02),
        12,
    );

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private readonly cache: Map<string, float>;
    private readonly averages: Map<string, RollingAverage>;
    private readonly timingQuery: TimingQuery;
    private readonly indirectReadback: IndirectReadback;

    public constructor(device: GPUDevice, indirect: GPUBuffer) {
        this.canvas = this.createCanvas();
        this.context = this.createContext();
        this.cache = new Map<string, float>();
        this.averages = this.createAverages();
        this.timingQuery = new TimingQuery(device, 7);
        this.indirectReadback = new IndirectReadback(device, indirect, 2);
        document.body.appendChild(this.canvas);
    }

    private createCanvas(): HTMLCanvasElement {
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.style.position = "absolute";
        canvas.style.top = "env(safe-area-inset-top)";
        canvas.style.right = "env(safe-area-inset-left)";
        canvas.style.backgroundColor = "#000000";
        canvas.style.opacity = "0.75";
        return canvas;
    }

    private createContext(): CanvasRenderingContext2D {
        const context: Nullable<CanvasRenderingContext2D> =
            this.canvas.getContext("2d");
        assert(context);
        return context;
    }

    private createAverages(): Map<string, RollingAverage> {
        const averages: Map<string, RollingAverage> = new Map<
            string,
            RollingAverage
        >();
        averages.set("time", new RollingAverage());
        averages.set("gpu0", new RollingAverage());
        averages.set("gpu1", new RollingAverage());
        averages.set("gpu2", new RollingAverage());
        averages.set("gpu3", new RollingAverage());
        averages.set("gpu4", new RollingAverage());
        averages.set("gpu5", new RollingAverage());
        averages.set("gpu6", new RollingAverage());
        averages.set("total", new RollingAverage());
        averages.set("indirect0", new RollingAverage());
        averages.set("indirect1", new RollingAverage());
        averages.set("meshes", new RollingAverage());
        return averages;
    }

    private sampleAverage(key: string, value: float): float {
        assert(this.averages.has(key));
        const average: Nullable<RollingAverage> =
            this.averages.get(key) ?? null;
        assert(average);
        if (value < 0) {
            warn("Negative sample!");
            return value;
        }
        average.sample(value);
        return value;
    }

    private getAverage(key: string): float {
        assert(this.averages.has(key));
        const average: Nullable<RollingAverage> =
            this.averages.get(key) ?? null;
        assert(average);
        return average.compute();
    }

    public getTimestampWrites(index: int): GPUPassTimestampWrites {
        return this.timingQuery.getTimestampWrites(index);
    }

    public encodeMid(encoder: GPUCommandEncoder): void {
        this.indirectReadback.resolve(encoder, 0);
    }

    public encodeEnd(encoder: GPUCommandEncoder): void {
        this.indirectReadback.resolve(encoder, 1);
        this.timingQuery.resolve(encoder);
    }

    public async update(
        elapsed: float,
        time: DOMHighResTimeStamp,
    ): Promise<CSVItem> {
        this.sampleTime(time);
        const item0: CSVItem = await this.sampleGPU();
        const item1: CSVItem = await this.sampleIndirect();
        this.draw(`
            \bTotal     ${right(msToFps(this.getAverage("time")), 8)} fps
            CPU       ${right(dotit(this.getAverage("time").toFixed(2)), 9)} ms
            GPU       ${right(dotit(this.getAverage("total").toFixed(2)), 9)} ms
            Meshes    ${right(dotit(this.getAverage("meshes")), 12)}

            \b${left("First", 22, "-")}
            Cull      ${right(dotit(this.getAverage("gpu0").toFixed(2)), 9)} ms
            Rasterize ${right(dotit(this.getAverage("gpu1").toFixed(2)), 9)} ms
            Meshes    ${right(dotit(this.getAverage("indirect0")), 12)}

            \b${left("HZB", 22, "-")}
            Convert   ${right(dotit(this.getAverage("gpu2").toFixed(2)), 9)} ms
            SPD       ${right(dotit(this.getAverage("gpu3").toFixed(2)), 9)} ms

            \b${left("Second", 22, "-")}
            Cull      ${right(dotit(this.getAverage("gpu4").toFixed(2)), 9)} ms
            Rasterize ${right(dotit(this.getAverage("gpu5").toFixed(2)), 9)} ms
            Meshes    ${right(dotit(this.getAverage("indirect1")), 12)}

            \b${left("Debug", 22, "-")}
            Rasterize ${right(dotit(this.getAverage("gpu6").toFixed(2)), 9)} ms
        `);
        const csvItem: CSVItem = {
            frameNumber: Math.floor(elapsed / 50),
            gpuTime: item0.gpuTime,
            meshes: item1.meshes,
            first: item1.first,
            second: item1.second,
        } as CSVItem;
        return csvItem;
    }

    private sampleTime(time: DOMHighResTimeStamp): void {
        this.sampleAverage("time", time - (this.cache.get("time") || 0));
        this.cache.set("time", time);
    }

    private async sampleGPU(): Promise<CSVItem> {
        const timestamps: Nullable<Timestamps[]> =
            await this.timingQuery.readback();
        if (!timestamps) {
            return {
                frameNumber: 0,
                gpuTime: 0,
                meshes: 0,
                first: 0,
                second: 0,
            } as CSVItem;
        }
        let min: float = Infinity;
        let max: float = -Infinity;
        for (let i: int = 0; i < timestamps.length; i++) {
            const timestamp: Timestamps = timestamps[i];
            assert(timestamp.start && timestamp.end);
            this.sampleAverage(`gpu${i}`, timestamp.end - timestamp.start);
            min = Math.min(min, timestamp.start);
            max = Math.max(max, timestamp.end);
        }
        this.sampleAverage("total", max - min);
        return {
            frameNumber: 0,
            gpuTime: max - min,
            meshes: 0,
            first: 0,
            second: 0,
        } as CSVItem;
    }

    private async sampleIndirect(): Promise<CSVItem> {
        const instanceCounts: Nullable<int[][]> =
            await this.indirectReadback.readback();
        if (!instanceCounts) {
            return {
                frameNumber: 0,
                gpuTime: 0,
                meshes: 0,
                first: 0,
                second: 0,
            } as CSVItem;
        }
        let meshes: int = 0;
        for (let i: int = 0; i < instanceCounts.length; i++) {
            const counts: int[] = instanceCounts[i];
            const count: int = sum(counts);
            this.sampleAverage(`indirect${i}`, count + 0);
            meshes += count;
        }
        this.sampleAverage("meshes", meshes + 0);
        return {
            frameNumber: 0,
            gpuTime: 0,
            meshes: meshes,
            first: sum(instanceCounts[0]),
            second: sum(instanceCounts[1]),
        } as CSVItem;
    }

    private draw(text: string): void {
        const fontSize: float = Statistics.FontSize * devicePixelRatio;
        const lines: string[] = text.split("\n");
        const lineHeight: float = fontSize * 1.2;
        const size: Vec2 = new Vec2(
            (12 + 2) * lineHeight,
            (lines.length + 1) * lineHeight,
        );
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = size.x;
        this.canvas.height = size.y;
        this.canvas.style.width = `${size.x / devicePixelRatio}px`;
        this.canvas.style.height = `${size.y / devicePixelRatio}px`;
        this.context.fillStyle = "white";
        for (let i: int = 0; i < lines.length; i++) {
            let line: string = lines[i].trim();
            const bold: string = line[0] === "\b" ? "bold " : "";
            line = line.split("\b").at(-1)!;
            this.context.font = `${bold}${fontSize}px monospace`;
            this.context.fillText(line, 1.5 * lineHeight, (1 + i) * lineHeight);
        }
    }
}
