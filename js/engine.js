//var globals: Globals;
//var map: Map;
var player;
window.onload = function () {
    var globals = new Globals();
    var map = new Map(globals);
    player = new Player(globals, map, 300, 200);
    //controles
    var controls = new Controls();
    controls.init();
    //bucle del juego
    setInterval(function () {
        gameLoop(globals, map, player);
    }, 1000 / globals.fps);
};
function gameLoop(globals, map, player) {
    deleteCanvas(globals);
    //map.draw();
    player.draw();
    player.update();
}
// function que borra el canvas
function deleteCanvas(globals) {
    globals.canvas.width = globals.width;
    globals.canvas.height = globals.height;
}
var Globals = /** @class */ (function () {
    function Globals() {
        this.fps = 60;
        this.width = 0;
        this.height = 0;
        this.canvas = document.querySelector('#canvas');
        this.canvas.width = document.body.clientWidth; //document.body.clientWidth;
        this.canvas.height = document.body.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }
    //metodo para cargar texturas
    Globals.prototype.loadAssets = function () {
        var wallTexture = new Image();
        wallTexture.src = 'img/walls.png';
    };
    //método que recibe grados y devuelve radianes
    Globals.prototype.toRadians = function (degrees) {
        return degrees * (Math.PI / 180);
    };
    //método que normaliza ángulos en radianes
    Globals.prototype.normalizeAngle = function (radians) {
        radians = radians % (2 * Math.PI);
        if (radians < 0)
            radians += 2 * Math.PI;
        return radians;
    };
    //método que devuelve la distancia entre dos puntos
    Globals.prototype.distance = function (x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };
    return Globals;
}());
var Controls = /** @class */ (function () {
    function Controls() {
    }
    Controls.prototype.init = function () {
        this.initMovement();
        this.stopMovement();
    };
    Controls.prototype.initMovement = function () {
        document.addEventListener('keydown', function (event) {
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
    };
    Controls.prototype.stopMovement = function () {
        document.addEventListener('keyup', function (event) {
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
    };
    return Controls;
}());
//pnj
var Player = /** @class */ (function () {
    function Player(globals, map, startX, startY) {
        //coordenadas del jugador
        this.pos = new Point(0, 0); //coordenadas del jugador en píxeles
        this.alpha = 0; //angulo actual del jugador en radianes
        //atributos del jugador
        this.moveSpeed = 3; //velocidad de movimiento del jugador en píxeles 
        this.rotationSpeed = 3; //velocidad de rotación del jugador en radianes
        //estados del jugador
        this.moving = Movement.none;
        this.spining = Spin.none;
        this.fov = 60; //campo de visión en grados
        this.halfFov = 0; //mitad del campo de vision en radianes
        this.incrementAngle = 0; //incremento del angulo por rayo en radianes       
        this.initAngle = 0; //angulo del primer rayo en radianes
        this.rays = new Array();
        this.numRay = 2000;
        this.maxDistanceProyection = 0;
        this.playerColor = '#ffffff';
        this.playerSize = 3;
        this.globals = globals;
        this.map = map;
        this.pos = new Point(startX, startY);
        this.rotationSpeed = globals.toRadians(this.rotationSpeed);
        this.ray = new Ray(globals, map, this.pos, this.alpha, 0, 0);
        this.halfFov = globals.toRadians(this.fov / 2);
        this.maxDistanceProyection = globals.height / 2 * Math.tan(this.halfFov);
        this.incrementAngle = globals.toRadians(this.fov / this.numRay);
        //creacion de rayos
        for (var i = 0; i < this.numRay; i++)
            this.rays[i] = new Ray(this.globals, this.map, this.pos, this.alpha, i, this.maxDistanceProyection);
    }
    Player.prototype.draw = function () {
        //this.ray.draw();
        //dibujado de los rayos
        for (var _i = 0, _a = this.rays; _i < _a.length; _i++) {
            var ray = _a[_i];
            //ray.draw();
            ray.render();
        }
        //personaje
        this.globals.ctx.fillStyle = this.playerColor;
        this.globals.ctx.fillRect(this.pos.x - this.playerSize / 2, this.pos.y - this.playerSize / 2, this.playerSize, this.playerSize);
        //linea de vision
        var lineFinalX = this.pos.x + Math.cos(this.alpha) * 40;
        var lineFinalY = this.pos.y + Math.sin(this.alpha) * 40;
        this.globals.ctx.beginPath();
        this.globals.ctx.moveTo(this.pos.x, this.pos.y);
        this.globals.ctx.lineTo(lineFinalX, lineFinalY);
        this.globals.ctx.strokeStyle = this.playerColor;
        this.globals.ctx.stroke();
    };
    Player.prototype.update = function () {
        //avanzar
        var newX = this.pos.x + Math.cos(this.alpha) * this.moveSpeed * this.moving;
        var newY = this.pos.y + Math.sin(this.alpha) * this.moveSpeed * this.moving;
        if (!this.colision(newX, newY)) {
            this.pos.x = newX;
            this.pos.y = newY;
        }
        //girar
        this.alpha += this.spining * this.rotationSpeed;
        this.alpha = this.globals.normalizeAngle(this.alpha);
        //actualizado de los rayos
        var beta = this.alpha - this.halfFov;
        for (var _i = 0, _a = this.rays; _i < _a.length; _i++) {
            var ray = _a[_i];
            beta = this.globals.normalizeAngle(beta + this.incrementAngle);
            ray.setPos(this.pos);
            ray.setAlpha(beta);
        }
        console.log(this.rays[0].distance);
    };
    Player.prototype.move = function (dir) {
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
    };
    Player.prototype.stopMoving = function () {
        this.moving = Movement.none;
    };
    Player.prototype.stopSpining = function () {
        this.spining = Spin.none;
    };
    Player.prototype.colision = function (pxX, pxY) {
        var tileX = ~~(pxX / this.map.tileWidth);
        var tileY = ~~(pxY / this.map.tileHeight);
        return this.map.scenario[tileY][tileX].isBlock;
    };
    return Player;
}());
var Ray = /** @class */ (function () {
    function Ray(globals, map, pos, alpha, column, maxDistanceProyection) {
        this.wallHit = new Point(0, 0); //punto en el que se choca el rayo
        this.distance = 0;
        this.wallHeight = 0; //alto del muro en pixeles
        this.incrementAlpha = 0;
        this.globals = globals;
        this.map = map;
        this.pos = pos;
        this.alpha = alpha;
        this.column = column;
        this.maxDistanceProyection = maxDistanceProyection;
        this.wallHeight = 500;
        this.cast();
    }
    Ray.prototype.cast = function () {
        var left = false;
        var down = false;
        var intercept = new Point(0, 0);
        var step = new Point(0, 0);
        var nextHorizontal = new Point(0, 0);
        var nextVertical = new Point(0, 0);
        var collisionH = false;
        var collisionV = false;
        var wallHitH = new Point(0, 0);
        var wallHitV = new Point(0, 0);
        //this.wallHit = new Point(0, 0);
        var beta = this.alpha;
        //obtenemos la dirección del rayo
        if (beta < Math.PI)
            down = true;
        if (beta > Math.PI / 2 && beta < 3 * Math.PI / 2)
            left = true;
        //choque horizontal
        //primera intersección
        intercept.y = Math.floor(this.pos.y / this.map.tileHeight) * this.map.tileHeight;
        //si mira hacia abajo incrementamos un tile
        if (down)
            intercept.y += this.map.tileHeight;
        //cateto contiguo
        var neighbour = (intercept.y - this.pos.y) / Math.tan(beta);
        intercept.x = this.pos.x + neighbour;
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
            var tileX = ~~(nextHorizontal.x / this.map.tileWidth);
            var tileY = ~~(nextHorizontal.y / this.map.tileHeight);
            if (this.map.scenario[tileY][tileX].isBlock) {
                collisionH = true;
                wallHitH.x = nextHorizontal.x;
                wallHitH.y = nextHorizontal.y;
            }
            else {
                nextHorizontal.x += step.x;
                nextHorizontal.y += step.y;
            }
        }
        //colision vertical
        //primera intersección
        intercept.x = Math.floor(this.pos.x / this.map.tileWidth) * this.map.tileWidth;
        //si apunta a la derecha incrementamos un tile
        if (!left)
            intercept.x += this.map.tileWidth;
        //cateto opuesto
        var oposite = (intercept.x - this.pos.x) * Math.tan(beta);
        intercept.y = this.pos.y + oposite;
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
            var tileX = ~~(nextVertical.x / this.map.tileWidth);
            var tileY = ~~(nextVertical.y / this.map.tileHeight);
            if (this.map.scenario[tileY][tileX].isBlock) {
                collisionV = true;
                wallHitV.x = nextVertical.x;
                wallHitV.y = nextVertical.y;
            }
            else {
                nextVertical.x += step.x;
                nextVertical.y += step.y;
            }
        }
        var distH = 9999;
        var distV = 9999;
        if (collisionH)
            distH = this.globals.distance(this.pos.x, this.pos.y, wallHitH.x, wallHitH.y);
        if (collisionV)
            distV = this.globals.distance(this.pos.x, this.pos.y, wallHitV.x, wallHitV.y);
        if (distH < distV) {
            this.wallHit.x = wallHitH.x;
            this.wallHit.y = wallHitH.y;
            this.distance = distH;
        }
        else {
            this.wallHit.x = wallHitV.x;
            this.wallHit.y = wallHitV.y;
            this.distance = distV;
        }
    };
    Ray.prototype.draw = function () {
        this.cast();
        var destinyX = this.wallHit.x;
        var destinyY = this.wallHit.y;
        this.globals.ctx.beginPath();
        this.globals.ctx.moveTo(this.pos.x, this.pos.y);
        this.globals.ctx.lineTo(destinyX, destinyY);
        this.globals.ctx.strokeStyle = 'red';
        this.globals.ctx.stroke();
    };
    Ray.prototype.render = function () {
        this.cast();
        //let realWallHeight = 500 / this.distance * (250 / 2); 
        var realWallHeight = this.globals.height / this.distance * (this.globals.height / 4);
        var y0 = ~~(this.globals.height / 2) - ~~(realWallHeight / 2);
        var y1 = y0 + realWallHeight;
        var x = this.column;
        var color = 255 - (this.distance / 5);
        if (color < 0)
            color = 0;
        //console.log(this.distance);
        this.globals.ctx.beginPath();
        this.globals.ctx.moveTo(x, y0);
        this.globals.ctx.lineTo(x, y1);
        this.globals.ctx.strokeStyle = "rgb(" + color + ", " + color + ", " + color + ")";
        this.globals.ctx.stroke();
    };
    Ray.prototype.setPos = function (pos) {
        this.pos = pos;
    };
    Ray.prototype.setAlpha = function (alpha) {
        this.alpha = alpha;
    };
    return Ray;
}());
var Column = /** @class */ (function () {
    function Column(globals, initPos, distance) {
        this.maxHeight = 0; //alto maximo del muro en pixeles
        this.start = new Point(0, 0);
        this.end = new Point(0, 0);
        this.maxHeight = globals.height;
    }
    return Column;
}());
var Tile = /** @class */ (function () {
    function Tile(type) {
        if (type == 0) {
            this.color = '#888888';
            this.isBlock = false;
        }
        else {
            this.color = '#000000';
            this.isBlock = true;
        }
    }
    return Tile;
}());
var Map = /** @class */ (function () {
    function Map(globals) {
        //alto y ancho del mapa
        this.sizeX = 0;
        this.sizeY = 0;
        //alto y ancho de los tiles
        this.tileWidth = 0;
        this.tileHeight = 0;
        this.globals = globals;
        this.scenario = this.generatelevel();
        this.sizeX = this.scenario[0].length;
        this.sizeY = this.scenario.length;
        this.tileWidth = Math.round(globals.width / this.sizeX);
        this.tileHeight = Math.round(globals.height / this.sizeY);
    }
    Map.prototype.draw = function () {
        for (var y = 0; y < this.sizeY; y++) {
            for (var x = 0; x < this.sizeX; x++) {
                this.globals.ctx.fillStyle = this.scenario[y][x].color;
                this.globals.ctx.fillRect(x * this.tileWidth, y * this.tileHeight, this.tileWidth, this.tileHeight);
            }
        }
    };
    Map.prototype.generatelevel = function () {
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
    };
    return Map;
}());
/********************************************************************************************************************************/
/* ENUMERACIONES                                                                                                                */
/********************************************************************************************************************************/
var Direction;
(function (Direction) {
    Direction[Direction["up"] = 0] = "up";
    Direction[Direction["right"] = 1] = "right";
    Direction[Direction["down"] = 2] = "down";
    Direction[Direction["left"] = 3] = "left";
})(Direction || (Direction = {}));
var Movement;
(function (Movement) {
    Movement[Movement["back"] = -1] = "back";
    Movement[Movement["none"] = 0] = "none";
    Movement[Movement["foward"] = 1] = "foward";
})(Movement || (Movement = {}));
var Spin;
(function (Spin) {
    Spin[Spin["left"] = -1] = "left";
    Spin[Spin["none"] = 0] = "none";
    Spin[Spin["right"] = 1] = "right";
})(Spin || (Spin = {}));
var Key;
(function (Key) {
    Key[Key["w"] = 87] = "w";
    Key[Key["d"] = 68] = "d";
    Key[Key["s"] = 83] = "s";
    Key[Key["a"] = 65] = "a";
})(Key || (Key = {}));
/********************************************************************************************************************************/
/* TIPOS DE DEFINICION                                                                                                          */
/********************************************************************************************************************************/
var Point = /** @class */ (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    return Point;
}());
