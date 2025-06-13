export class Player {
    x: number = 0;
    y: number = 0;

    constructor() {}

    update(input?: any): void {}

    render(ctx?: CanvasRenderingContext2D, cam?: { x: number; y: number }): void {}
}