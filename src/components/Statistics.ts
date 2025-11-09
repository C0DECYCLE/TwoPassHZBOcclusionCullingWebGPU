/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { int, float, Nullable } from "../definitions/utils.js";
import { RollingAverage } from "../utilities/RollingAverage.js";
import { assert, dotit, msToFps } from "../utilities/utils.js";
import { Vec2 } from "../utilities/Vec2.js";

export class Statistics {
    private static readonly FontSize: int = Math.min(
        Math.floor(document.body.clientHeight * 0.02),
        10,
    );

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private readonly cache: Map<string, float>;
    private readonly averages: Map<string, RollingAverage>;

    public constructor() {
        this.canvas = this.createCanvas();
        this.context = this.createContext();
        this.cache = new Map<string, float>();
        this.averages = this.createAverages();
        document.body.appendChild(this.canvas);
    }

    private createCanvas(): HTMLCanvasElement {
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.style.position = "absolute";
        canvas.style.top = "env(safe-area-inset-top)";
        canvas.style.left = "env(safe-area-inset-left)";
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
        return averages;
    }

    private sampleAverage(key: string, value: float): float {
        assert(this.averages.has(key));
        const average: Nullable<RollingAverage> =
            this.averages.get(key) ?? null;
        assert(average);
        average.sample(value);
        return value;
    }

    private computeAverage(key: string): float {
        assert(this.averages.has(key));
        const average: Nullable<RollingAverage> =
            this.averages.get(key) ?? null;
        assert(average);
        return average.compute();
    }

    public update(time: DOMHighResTimeStamp): void {
        this.sampleAverage("time", time - (this.cache.get("time") || 0));
        this.cache.set("time", time);
        const delta: float = this.computeAverage("time");
        this.draw(`
            ${msToFps(delta)} fps (${dotit(delta.toFixed(2))} ms)
        `);
    }

    private draw(text: string): void {
        const fontSize: float = Statistics.FontSize * devicePixelRatio;
        const lines: string[] = text.split("\n");
        const lineHeight: float = fontSize * 0.7;
        const size: Vec2 = new Vec2(
            (18 + 4) * lineHeight,
            (lines.length + 2) * lineHeight,
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
            this.context.font = `${bold}${fontSize}px system-ui`;
            this.context.fillText(line, 2 * lineHeight, (2 + i) * lineHeight);
        }
    }
}
