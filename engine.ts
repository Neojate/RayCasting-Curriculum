//var globals: Globals;
//var map: Map;
var player: Player;

window.onload = () => {
    let globals: Globals = new Globals();
    let map: Map = new Map(globals);
    player = new Player(globals, map, 300, 200);

    //controles
    let controls: Controls = new Controls();
    controls.init();

    //bucle del juego
    setInterval(() => {
        gameLoop(globals, map, player);
    }, 1000 / globals.fps);
}

function gameLoop(globals: Globals, map: Map, player: Player): void {
    deleteCanvas(globals);
    map.draw();
    player.draw();
    player.update();
}

// function que borra el canvas
function deleteCanvas(globals: Globals): void {
    globals.canvas.width = globals.width;
    globals.canvas.height = globals.height;
}

class Globals {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    fps: number = 60;

    width: number = 0;
    height: number = 0;

    constructor() {
        this.canvas = document.querySelector<HTMLCanvasElement>('#canvas');
        this.canvas.width = document.body.clientHeight;//document.body.clientWidth;
        this.canvas.height = document.body.clientHeight;
        this.ctx = this.canvas.getContext('2d');

        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    //método que recibe grados y devuelve radianes
    toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    //método que normaliza ángulos en radianes
    normalizeAngle(radians: number): number {
        radians = radians % (2 * Math.PI);
        if (radians < 0)
            radians += 2 * Math.PI;
        return radians;
    }

    //método que devuelve la distancia entre dos puntos
    distance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

}

class Controls {

    init(): void {
        this.initMovement();
        this.stopMovement();
    }

    initMovement() {
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            switch (event.keyCode) {
                case Key.w:
                    player.move(Direction.up);
                    break;
                case Key.d:
                    player.move(Direction.right);
                    break;
                case Key.s:
                    player.move(Direction.down);
                    break;
                case Key.a:
                    player.move(Direction.left);
                    break;
            }
        });
    }

    stopMovement() {
        document.addEventListener('keyup', (event: KeyboardEvent) => {
            switch (event.keyCode) {
                case Key.w:
                case Key.s:
                    player.stopMoving();
                    break;
                case Key.d:
                case Key.a:
                    player.stopSpining();
                    break;
            }
        });
    }
}


class Player implements IDrawable, IUpdatable, IMobible {

    //coordenadas del jugador
    x: number = 10;                             //coordenada X del jugador en píxeles
    y: number = 10;                             //coordenadas Y del jugador en píxeles
    alpha: number = 1;                          //angulo actual del jugador en radianes

    //atributos del jugador
    moveSpeed: number = 3;                      //velocidad de movimiento del jugador en píxeles 
    rotationSpeed: number = 3;                //velocidad de rotación del jugador en radianes

    //estados del jugador
    moving: Movement = Movement.none;
    spining: Spin = Spin.none;

    //ray
    ray: Ray;
    numRay: number = 0;

    private playerColor: string = '#ffffff';
    private playerSize: number = 3;

    private globals: Globals;
    private map: Map;

    constructor(globals: Globals, map: Map, startX: number, startY: number) {
        this.globals = globals;
        this.map = map;
        this.x = startX;
        this.y = startY;
        this.rotationSpeed = globals.toRadians(this.rotationSpeed);

        this.ray = new Ray(globals, map, this, 0);
        this.numRay = this.globals.width;
    }

    draw() {

        this.ray.draw();

        //personaje
        this.globals.ctx.fillStyle = this.playerColor;
        this.globals.ctx.fillRect(this.x - this.playerSize / 2, this.y - this.playerSize / 2, this.playerSize, this.playerSize);

        //linea de vision
        let lineFinalX = this.x + Math.cos(this.alpha) * 40;
        let lineFinalY = this.y + Math.sin(this.alpha) * 40;
        this.globals.ctx.beginPath();
        this.globals.ctx.moveTo(this.x, this.y);
        this.globals.ctx.lineTo(lineFinalX, lineFinalY);
        this.globals.ctx.strokeStyle = this.playerColor;
        this.globals.ctx.stroke();
    }

    update() {
        //avanzar
        let newX = this.x + Math.cos(this.alpha) * this.moveSpeed * this.moving;
        let newY = this.y + Math.sin(this.alpha) * this.moveSpeed * this.moving;

        if (!this.colision(newX, newY)) {
            this.x = newX;
            this.y = newY;
        }

        //girar
        this.alpha += this.spining * this.rotationSpeed;
        this.alpha = this.globals.normalizeAngle(this.alpha);
    }

    move(dir: Direction) {
        switch (dir) {
            case Direction.up:
                this.moving = Movement.foward;
                break;

            case Direction.right:
                this.spining = Spin.right;
                break;

            case Direction.down:
                this.moving = Movement.back;
                break;

            case Direction.left:
                this.spining = Spin.left;
                break;
        }
    }

    stopMoving() {
        this.moving = Movement.none;
    }

    stopSpining() {
        this.spining = Spin.none;
    }

    colision(pxX: number, pxY: number): boolean {
        let tileX: number = ~~(pxX / this.map.tileWidth);
        let tileY: number = ~~(pxY / this.map.tileHeight);

        return this.map.scenario[tileY][tileX].isBlock;
    }

}

class Ray {



    //coordenadas de choque
    wallHit: Point = new Point(0, 0);
    /*wallHitHorX: number = 0;
    wallHitHorY: number = 0;
    wallHitVerX: number = 0;
    wallHitVerY: number = 0;*/

    private incrementAlpha: number = 0;

    private globals: Globals;
    private map: Map;
    private player: Player;

    constructor(globals: Globals, map: Map, player: Player, column: number) {
        this.globals = globals;
        this.map = map;
        this.player = player;

        this.cast();
    }

    cast() {
        let left: boolean = false;
        let down: boolean = false;

        let intercept: Point = new Point(0, 0);
        let step: Point = new Point(0, 0);

        let nextHorizontal: Point = new Point(0, 0);
        let nextVertical: Point = new Point(0, 0);

        let collisionH: boolean = false;
        let collisionV: boolean = false;

        let wallHitH: Point = new Point(0, 0);
        let wallHitV: Point = new Point(0, 0);

        //this.wallHit = new Point(0, 0);

        let beta: number = this.player.alpha;

        //obtenemos la dirección del rayo
        if (beta < Math.PI)
            down = true;
        if (beta > Math.PI / 2 && beta < 3 * Math.PI / 2)
            left = true;

        //choque horizontal
        //primera intersección
        intercept.y = Math.floor(this.player.y / this.map.tileHeight) * this.map.tileHeight;

        //si mira hacia abajo incrementamos un tile
        if (down)
            intercept.y += this.map.tileHeight;

        //cateto contiguo
        let neighbour: number = (intercept.y - this.player.y) / Math.tan(beta);
        intercept.x = this.player.x + neighbour;

        //calculamos la disancia de cada paso
        step.y = this.map.tileHeight;
        step.x = step.y / Math.tan(beta);

        //si miramos hacia arriba cambiamos el signo
        if (!down)
            step.y *= -1;

        //comprobamos que el paso es coherente
        if ((left && step.x > 0) || (!left && step.x < 0))
            step.x *= -1;

        nextHorizontal.x = intercept.x;
        nextHorizontal.y = intercept.y;

        //si apunta hacia abajo reducimos un pixel
        if (!down)
            nextHorizontal.y--;

        //bucle que busca la colision horizontal
        while (!collisionH &&
            nextHorizontal.x >= 0 && nextHorizontal.x < this.globals.width &&
            nextHorizontal.y >= 0 && nextHorizontal.y < this.globals.height) {

            let tileX: number = ~~(nextHorizontal.x / this.map.tileWidth);
            let tileY: number = ~~(nextHorizontal.y / this.map.tileHeight);

            if (this.map.scenario[tileY][tileX].isBlock) {
                collisionH = true;
                wallHitH.x = nextHorizontal.x;
                wallHitH.y = nextHorizontal.y;
            } else {
                nextHorizontal.x += step.x;
                nextHorizontal.y += step.y;
            }
        }

        //colision vertical
        //primera intersección
        intercept.x = Math.floor(this.player.x / this.map.tileWidth) * this.map.tileWidth;

        //si apunta a la derecha incrementamos un tile
        if (!left)
            intercept.x += this.map.tileWidth;

        //cateto opuesto
        let oposite: number = (intercept.x - this.player.x) * Math.tan(beta);
        intercept.y = this.player.y + oposite;

        //distancia de cada paso
        step.x = this.map.tileWidth;

        //si vamos a la izquierda invertimos
        if (left)
            step.x *= -1;

        step.y = this.map.tileWidth * Math.tan(beta);

        if ((!down && step.y > 0) || (down && step.y < 0))
            step.y *= -1;

        nextVertical.x = intercept.x;
        nextVertical.y = intercept.y;

        //le resto un pixel si voy a la izquierda
        if (left)
            nextVertical.x--;

        while (!collisionV &&
            nextVertical.x >= 0 && nextVertical.x < this.globals.width &&
            nextVertical.y >= 0 && nextVertical.y < this.globals.height) {

            let tileX: number = ~~(nextVertical.x / this.map.tileWidth);
            let tileY: number = ~~(nextVertical.y / this.map.tileHeight);

            if (this.map.scenario[tileY][tileX].isBlock) {
                collisionV = true;
                wallHitV.x = nextVertical.x;
                wallHitV.y = nextVertical.y;
            } else {
                nextVertical.x += step.x;
                nextVertical.y += step.y;
            }

        }

        let distH: number = 9999;
        let distV: number = 9999;

        if (collisionH)
            distH = this.globals.distance(this.player.x, this.player.y, wallHitH.x, wallHitH.y);

        if (collisionV)
            distV = this.globals.distance(this.player.x, this.player.y, wallHitV.x, wallHitV.y);

        console.log(`${distH}, ${distV}`)
        if (distH < distV) {
            this.wallHit.x = wallHitH.x;
            this.wallHit.y = wallHitH.y;
        } else {
            this.wallHit.x = wallHitV.x;
            this.wallHit.y = wallHitV.y;
        }

    }

    draw() {
        this.cast();

        let destinyX = this.wallHit.x
        let destinyY = this.wallHit.y;

        this.globals.ctx.beginPath();
        this.globals.ctx.moveTo(this.player.x, this.player.y);
        this.globals.ctx.lineTo(destinyX, destinyY);
        this.globals.ctx.strokeStyle = 'red';
        this.globals.ctx.stroke();

    }
}

class Tile {
    color: string;
    isBlock: boolean;

    constructor(type: number) {
        if (type == 0) {
            this.color = '#888888';
            this.isBlock = false;
        } else {
            this.color = '#000000';
            this.isBlock = true;
        }
    }

}

class Map implements IDrawable {
    //array del mapa
    scenario: Tile[][];

    //alto y ancho del mapa
    sizeX: number = 0;
    sizeY: number = 0;

    //alto y ancho de los tiles
    tileWidth: number = 0;
    tileHeight: number = 0;

    private globals: Globals;

    constructor(globals: Globals) {
        this.globals = globals;

        this.scenario = this.generatelevel();

        this.sizeX = this.scenario[0].length;
        this.sizeY = this.scenario.length;

        this.tileWidth = Math.round(globals.width / this.sizeX);
        this.tileHeight = Math.round(globals.height / this.sizeY);
    }

    draw(): void {
        for (let y: number = 0; y < this.sizeY; y++) {
            for (let x: number = 0; x < this.sizeX; x++) {
                this.globals.ctx.fillStyle = this.scenario[y][x].color;
                this.globals.ctx.fillRect(x * this.tileWidth, y * this.tileHeight, this.tileWidth, this.tileHeight);
            }
        }
    }

    private generatelevel(): Tile[][] {
        return [
            [new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1)],
            [new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(1)],
            [new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(1)],
            [new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(1), new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(1)],
            [new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(1)],
            [new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(1)],
            [new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(0), new Tile(1)],
            [new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(1), new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(1)],
            [new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(1), new Tile(1), new Tile(0), new Tile(0), new Tile(0), new Tile(1)],
            [new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1), new Tile(1)],
        ];
    }
}


/********************************************************************************************************************************/
/* INTERTFACES                                                                                                                  */
/********************************************************************************************************************************/
interface IDrawable {
    draw(): void;
}

interface IUpdatable {
    update(): void;
}

interface IMobible {
    move(dir: Direction): void;
    stopMoving(): void;
    stopSpining(): void;
    colision(pxX: number, pxY: number): boolean;
}



/********************************************************************************************************************************/
/* ENUMERACIONES                                                                                                                */
/********************************************************************************************************************************/
enum Direction {
    up,
    right,
    down,
    left
}

enum Movement {
    back = -1,
    none = 0,
    foward = 1
}

enum Spin {
    left = -1,
    none = 0,
    right = 1
}

enum Key {
    w = 87,
    d = 68,
    s = 83,
    a = 65
}



/********************************************************************************************************************************/
/* TIPOS DE DEFINICION                                                                                                          */
/********************************************************************************************************************************/
class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}