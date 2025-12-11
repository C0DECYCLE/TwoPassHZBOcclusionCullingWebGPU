/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { Box, float, int, Nullable, UUID } from "../definitions/utils.js";
import { Mat4 } from "./Mat4.js";
import { Vec2 } from "./Vec2.js";
import { Vec3 } from "./Vec3.js";

export const PHI: float = (1 + 5 ** 0.5) / 2;

export const toAngle: float = 180 / Math.PI;
export const toRadian: float = Math.PI / 180;

export function normalizeRadian(value: float): float {
    value = value % (2 * Math.PI);
    if (value < 0) {
        value += 2 * Math.PI;
    }
    return value;
}

export function UUIDv4(): UUID {
    return `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, (c: any) =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16),
    );
}

export function between(
    value: int | float,
    lower: int | float,
    upper: int | float,
): boolean {
    return value > Math.min(lower, upper) && value < Math.max(lower, upper);
}

export function dotit(value: int | float | string): string {
    value = typeof value === "string" ? value : value.toFixed(0);
    return value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1'");
}

export function clamp<T extends int | float>(value: T, min: T, max: T): T {
    return Math.min(Math.max(value, min), max) as T;
}

export function firstLetterUppercase(value: string): string {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function replaceAt(
    value: string,
    index: int,
    replacement: string,
): string {
    return `${value.substring(0, index)}${replacement}${value.substring(
        index + replacement.length,
    )}`;
}

export function rgbToHex(value: Vec3): string {
    let r: string = Math.floor(value.x * 256).toString(16);
    let g: string = Math.floor(value.y * 256).toString(16);
    let b: string = Math.floor(value.z * 256).toString(16);
    r = r.length === 1 ? `0${r}` : r;
    g = g.length === 1 ? `0${g}` : g;
    b = b.length === 1 ? `0${b}` : b;
    return `#${r}${g}${b}`;
}

export function hexToRgb(value: string): Vec3 {
    const decimal: int = parseInt(value.split("#")[1], 16);
    return new Vec3(
        (decimal & 0xff0000) >> 16,
        (decimal & 0x00ff00) >> 8,
        decimal & 0x0000ff,
    ).divide(256);
}

export function rgbToHsv(value: Vec3): Vec3 {
    const r: float = value.x;
    const g: float = value.y;
    const b: float = value.z;
    const v: float = Math.max(r, g, b);
    const c: float = v - Math.min(r, g, b);
    const h: float =
        c &&
        (v == r ? (g - b) / c : v == g ? 2 + (b - r) / c : 4 + (r - g) / c);
    return new Vec3(60 * (h < 0 ? h + 6 : h), v && c / v, v);
}

export function hsvToRgb(value: Vec3): Vec3 {
    const h: float = value.x;
    const s: float = value.y;
    const v: float = value.z;
    const f = (n: float, k: float = (n + h / 60) % 6) =>
        v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return new Vec3(f(5), f(3), f(1));
}

export function count<T>(value: T[], target: T): int {
    return value.filter((x: T): boolean => x === target).length;
}

export function swapRemove<T>(value: T[], at: int): T[] {
    value[at] = value[value.length - 1];
    value.pop();
    return value;
}

export function clear<T>(value: T[]): T[] {
    value.length = 0;
    return value;
}

export function assert(
    condition: any,
    msg: Nullable<string> = null,
): asserts condition {
    if (!condition) {
        throw new Error(msg || "Assertion");
    }
}

export async function fileExists(path: string): Promise<boolean> {
    return (await fetch(path, { method: "HEAD" } as RequestInit)).ok;
}

export function msToFps(ms: float): string {
    return dotit(1_000 / ms);
}

export function romanize(value: int): string {
    const digits: string[] = String(+value).split("");
    // prettier-ignore
    const key: string[] = [
        "", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
        "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
        "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"
    ];
    let roman: string = "";
    let i: int = 3;
    while (i--) {
        // @ts-ignore
        roman = (key[+digits.pop() + i * 10] || "") + roman;
    }
    return Array(+digits.join("") + 1).join("M") + roman;
}

export function deepImmutable<T extends object>(root: T): T {
    for (const key of Object.keys(root)) {
        const value: any = root[key as keyof T];
        if (typeof value === "object") {
            deepImmutable(value);
        }
    }
    return Object.freeze(root);
}

export function transform(vector: Vec3, matrix: Mat4): Vec3 {
    const w =
        1 /
        (matrix.values[3] * vector.x +
            matrix.values[7] * vector.y +
            matrix.values[11] * vector.z +
            matrix.values[15]);
    vector.x =
        (matrix.values[0] * vector.x +
            matrix.values[4] * vector.y +
            matrix.values[8] * vector.z +
            matrix.values[12]) *
        w;
    vector.y =
        (matrix.values[1] * vector.x +
            matrix.values[5] * vector.y +
            matrix.values[9] * vector.z +
            matrix.values[13]) *
        w;
    vector.z =
        (matrix.values[2] * vector.x +
            matrix.values[6] * vector.y +
            matrix.values[10] * vector.z +
            matrix.values[14]) *
        w;
    return vector;
}

export function lerp(a: float, b: float, alpha: float): float {
    return a + (b - a) * alpha;
}

export function shuffle<T>(value: T[]): T[] {
    for (let i: int = value.length - 1; i > 0; i--) {
        const j: int = Math.floor(Math.random() * (i + 1));
        const temp: T = value[i];
        value[i] = value[j];
        value[j] = temp;
    }
    return value;
}

export function intersect(a: Box, b: Box): boolean {
    const aLeftTop: Vec2 = a.position;
    const aRightBottom: Vec2 = a.position.clone().add(a.size);
    const bLeftTop: Vec2 = b.position;
    const bRightBottom: Vec2 = b.position.clone().add(b.size);
    return (
        aLeftTop.x <= bRightBottom.x &&
        aRightBottom.x >= bLeftTop.x &&
        aLeftTop.y <= bRightBottom.y &&
        aRightBottom.y >= bLeftTop.y
    );
}

export function linearToSRgb(linear: Vec3): Vec3 {
    const p: float = 1 / 2.2;
    return new Vec3(
        Math.pow(linear.x, p),
        Math.pow(linear.y, p),
        Math.pow(linear.z, p),
    );
}

export function sRgbToLinear(sRgb: Vec3): Vec3 {
    const p: float = 2.2;
    return new Vec3(
        Math.pow(sRgb.x, p),
        Math.pow(sRgb.y, p),
        Math.pow(sRgb.z, p),
    );
}

export function applyHsv(rgb: Vec3, hsv: Vec3): Vec3 {
    let value: Vec3 = rgbToHsv(rgb);
    value.x = (value.x + hsv.x) % 360;
    value.y *= hsv.y;
    value.z *= hsv.z;
    return hsvToRgb(value);
}

function align(value: string, width: int, fill: string): string {
    return fill.repeat(Math.max(0, width - value.length));
}

export function left(value: string, width: int, fill: string = " "): string {
    return `${value}${align(value, width, fill)}`;
}

export function right(value: string, width: int, fill: string = " "): string {
    return `${align(value, width, fill)}${value}`;
}
