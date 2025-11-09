/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { float } from "../definitions/utils.js";
import { Mat4 } from "../utilities/Mat4.js";
import { toRadian, transform, clamp } from "../utilities/utils.js";
import { Vec2 } from "../utilities/Vec2.js";
import { Vec3 } from "../utilities/Vec3.js";
import { Camera } from "./Camera.js";

export class Controls {
    private static readonly MinVelocity: float = 0.01;
    private static readonly DefaultVelocity: float = 0.1;
    private static readonly MaxVelocity: float = 5;
    private static readonly MouseVelocity: float = 0.35;

    private readonly canvas: HTMLCanvasElement;
    private readonly camera: Camera;
    private readonly keys: Map<string, boolean>;
    private isLocked: boolean;

    private readonly direction: Vec3;
    private readonly right: Vec3;
    private readonly globalUp: Vec3;
    private readonly localUp: Vec3;
    private readonly transform: Mat4;
    private velocity: float;

    private readonly onClick: (event: MouseEvent) => void;
    private readonly onPointerLockChange: (event: Event) => void;
    private readonly onKeyDown: (event: KeyboardEvent) => void;
    private readonly onKeyUp: (event: KeyboardEvent) => void;
    private readonly onMouseMove: (event: MouseEvent) => void;
    private readonly onWheel: (event: WheelEvent) => void;

    public constructor(canvas: HTMLCanvasElement, camera: Camera) {
        this.canvas = canvas;
        this.camera = camera;
        this.keys = new Map<string, boolean>();
        this.isLocked = false;
        this.direction = new Vec3();
        this.right = new Vec3();
        this.globalUp = new Vec3(0, 1, 0);
        this.localUp = new Vec3();
        this.transform = new Mat4();
        this.velocity = 0;
        this.onClick = (event: MouseEvent) => this.click(event);
        this.onPointerLockChange = (event: Event) =>
            this.pointerLockChange(event);
        this.onKeyDown = (event: KeyboardEvent) => this.keyDown(event);
        this.onKeyUp = (event: KeyboardEvent) => this.keyUp(event);
        this.onMouseMove = (event: MouseEvent) => this.mouseMove(event);
        this.onWheel = (event: WheelEvent) => this.wheel(event);
        this.addDocumentListeners();
        this.reset();
    }

    private addDocumentListeners(): void {
        document.addEventListener("click", this.onClick);
        document.addEventListener(
            "pointerlockchange",
            this.onPointerLockChange,
        );
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("keyup", this.onKeyUp);
        document.addEventListener("mousemove", this.onMouseMove);
        document.addEventListener("wheel", this.onWheel);
    }

    private click(event: MouseEvent): void {
        event.preventDefault();
        this.lock(true);
    }

    private pointerLockChange(event: Event): void {
        event.preventDefault();
        if (document.pointerLockElement === this.canvas) {
            this.lock();
            return;
        }
        this.unlock();
    }

    private keyDown(event: KeyboardEvent): void {
        event.preventDefault();
        if (!this.isLocked) {
            return;
        }
        this.keys.set(event.key.toLowerCase(), true);
    }

    private keyUp(event: KeyboardEvent): void {
        event.preventDefault();
        if (!this.isLocked) {
            return;
        }
        this.keys.set(event.key.toLowerCase(), false);
    }

    private mouseMove(event: MouseEvent): void {
        event.preventDefault();
        if (!this.isLocked) {
            return;
        }
        this.updateDirection(new Vec2(event.movementX, event.movementY));
    }

    private wheel(event: WheelEvent): void {
        if (!this.isLocked) {
            return;
        }
        this.updateVelocity(event.deltaY);
    }

    public update(): void {
        if (!this.isLocked) {
            return;
        }
        this.updatePosition();
    }

    private lock(force: boolean = false): void {
        if (this.isLocked && !force) {
            return;
        }
        this.isLocked = true;
        this.canvas.requestPointerLock();
        this.reset();
    }

    private unlock(): void {
        if (!this.isLocked) {
            return;
        }
        this.isLocked = false;
        document.exitPointerLock();
        this.reset();
    }

    private updatePosition(): void {
        this.direction.set(0, 0, 0);
        this.right.copy(this.camera.direction).cross(this.globalUp);
        this.localUp.copy(this.right).cross(this.camera.direction);
        if (this.keys.get("w")) {
            this.direction.add(this.camera.direction);
        } else if (this.keys.get("s")) {
            this.direction.sub(this.camera.direction);
        }
        if (this.keys.get("a")) {
            this.direction.sub(this.right);
        } else if (this.keys.get("d")) {
            this.direction.add(this.right);
        }
        if (this.keys.get(" ")) {
            this.direction.add(this.localUp);
        } else if (this.keys.get("control")) {
            this.direction.sub(this.localUp);
        }
        if (!this.direction.x && !this.direction.y && !this.direction.z) {
            return;
        }
        this.direction.normalize().scale(this.velocity);
        this.camera.position.add(this.direction);
    }

    private updateDirection(delta: Vec2): void {
        this.transform.reset();
        this.transform.rotateY(-delta.x * Controls.MouseVelocity * toRadian);
        transform(this.camera.direction, this.transform);
        this.right.copy(this.camera.direction).cross(this.globalUp);
        this.transform.reset();
        this.transform.rotateAxis(
            this.right.normalize(),
            -delta.y * Controls.MouseVelocity * toRadian,
        );
        transform(this.camera.direction, this.transform).normalize();
    }

    private updateVelocity(delta: float): void {
        this.velocity += delta * 0.001;
        this.velocity = clamp(
            this.velocity,
            Controls.MinVelocity,
            Controls.MaxVelocity,
        );
    }

    private reset(): void {
        this.velocity = Controls.DefaultVelocity;
    }
}
