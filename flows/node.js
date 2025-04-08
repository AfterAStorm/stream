/* base */

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV2(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

function addV2(a, b) {
    return [a[0] + b[0], a[1] + b[1]]
}

function subV2(a, b) {
    return [a[0] - b[0], a[1] - b[1]]
}

function distV2(a) {
    return Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2))
}

class ConnectionPoint {
    node = null
    type
    side
    id
    tooltip
    value
    active

    position // point after rotation relative to 0, 0 of node's position
    staticPosition // point before rotation

    constructor(values) {
        Object.keys(values).forEach(k => {
            this[k] = values[k]
        })
    }

    isHovering(x, y) {
        if (this.position == null)
            return false
        const relative = this.node.getRelative(x, y)
        const range = this.node.editor != null ? (this.node.editor.inputType == 'touch' ? 12 : 8) : 0
        return distV2(subV2(relative, this.position)) <= range//7
    }
}

export class BaseNode {
    OFF_COLOR = '#000'
    ON_COLOR = '#ffd133'

    constructor() {
        // visual
        this.position = [0, 0]
        this.rotation = 0
        this.id = this.constructor.id
        this.size = this.constructor.size // [0, 0]
        this.display = this.constructor.display
        this.icon = this.constructor.icon
        this.category = this.constructor.category
        this.cached = false
        this.invalidated = true
        this.cacheScale = 1

        // logic
        this.connectionPoints = []
        this.connections = []

        this.scheduledTasks = []

        this.needsUpdate = false
        this.needsConnectionUpdate = false

        this._connections = [] // set in editor caching stuff

        // other
        this.editor = null // set before update
        this.ghost = false // is the node a ghost? (preview)
        this.index = -1 // set before serialize
        this.debug = {
            depth: 0,
            updated: false
        }
    }

    /* SAVING */

    serialize() {
        return {
            'position': this.position,
            'rotation': this.rotation,
            'id': this.id
        }
    }

    deserialize(data) {
        this.position = data.position
        this.rotation = data.rotation || 0
        this.needsConnectionUpdate = true // for copy/pasting mostly
    }

    /* CONNECTIONS */

    getPriority() {
        const hasAnyOutput = this.connectionPoints.some(p => p.type == 'output')
        const hasAnyInput = this.connectionPoints.some(p => p.type == 'input')

        // buttons/etc first
        // intermediate components
        // lcds/etc last

        return (hasAnyOutput && !hasAnyInput ? 2 : (!hasAnyOutput && hasAnyInput ? 0 : 1))
    }

    /**
     * 
     * @param {string} type 
     * @param {'top' | 'left' | 'bottom' | 'right'} side 
     * @param {string} id 
     * @param {string} tooltip 
     * @returns {Number} the index
     */
    addConnectionPoint(type, side, id, tooltip) {
        return this.connectionPoints.push(new ConnectionPoint({
            node: this, type, side, id, tooltip, value: 0, // should technically be null... but... whatever
            active: true // only false when they are "added" or "removed"
        }))
    }

    getConnectionPoint(indexOrId) {
        if (typeof(indexOrId) != Number)
            indexOrId = this.connectionPoints.findIndex(p => p.id == indexOrId)
        return this.connectionPoints[indexOrId]
    }

    setConnectionPointValue(indexOrId, value) {
        if (typeof(indexOrId) != Number)
            indexOrId = this.connectionPoints.findIndex(p => p.id == indexOrId)
        const point = this.connectionPoints[indexOrId]
        if (point.value == value)
            return // already the same... so do nothing
        point.value = value
        this.needsConnectionUpdate = true
    }

    getConnectionPointValue(indexOrId) {
        if (typeof(indexOrId) != Number)
            indexOrId = this.connectionPoints.findIndex(p => p.id == indexOrId)
        const point = this.connectionPoints[indexOrId]
        // get all connections
        const value = this.editor != null ? this._connections.filter(c => c.has(point)).reduce((p, v) => p + v.value, 0) : 0//this.editor.flow.connections.filter(c => c.has(point)).reduce((p, v) => p + v.value, 0) : 0
        if (point != null)
            point.value = value

        return value//point.value
    }

    getLocalConnectionPointValue(indexOrId) {
        if (typeof(indexOrId) != Number)
            indexOrId = this.connectionPoints.findIndex(p => p.id == indexOrId)
        const point = this.connectionPoints[indexOrId]
        return point.value
    }

    /**
     * Rotate a point around the center of the node
     * @param {number} x 
     * @param {number} y 
     */
    rotatePoint(x, y, rotationInDegrees) {
        const point = [x, y]
        const radians = (rotationInDegrees) * Math.PI / 180
        const sin = Math.sin(radians)
        const cos = Math.cos(radians)

        const size = this.getSize()
        const origin = [size[0] / 2, size[1] / 2]
        point[0] -= origin[0]
        point[1] -= origin[1]

        const newX = point[0] * cos - point[1] * sin
        const newY = point[0] * sin + point[1] * cos

        point[0] = newX + origin[0]
        point[1] = newY + origin[1]
        return point
    }

    getConnectionPointPositions() {
        // calculate totals
        const totals = {}
        const indexes = {}
        for (const point of this.connectionPoints) {
            totals[point.side] = (totals[point.side] || 1) + 1
            indexes[point.side] = 1
        }

        // calculate sides
        const size = this.getSize()
        const connectionPointSides = {
            'top': [[0, 0], [size[0], 0]],
            'bottom': [[0, size[1]], [size[0], size[1]]],
            'left': [[0, 0], [0, size[1]]],
            'right': [[size[0], 0], [size[0], size[1]]],
        }

        // calculate positions
        const positions = []
        for (const point of this.connectionPoints) {
            const side = connectionPointSides[point.side]
            point.position = lerpV2(...side, indexes[point.side] / totals[point.side])
            point.staticPosition = [...point.position] // staticPosition is position before rotation
            if (this.rotation != 0) {
                point.position = this.rotatePoint(...point.position, this.rotation)
            }


            positions.push(point)
            indexes[point.side] += 1
        }

        return positions
    }

    /* VISUAL */

    getSize(scale=1) {
        return this.size.map(x => x * 100 * scale)
    }

    /* USER INTERACTION */

    getRectanglePoints(x, y, w, h) {
        return [
            this.rotatePoint(x, y, this.rotation),
            this.rotatePoint(x + w, y, this.rotation),
            this.rotatePoint(x, y + h, this.rotation),
            this.rotatePoint(x + w, y + h, this.rotation)
        ]
    }

    isHoveringRectangle(pos, x, y, w, h) {
        const points = this.getRectanglePoints(x, y, w, h)
        const minX = Math.min(...points.map(p => p[0]))
        const minY = Math.min(...points.map(p => p[1]))
        const maxX = Math.max(...points.map(p => p[0]))
        const maxY = Math.max(...points.map(p => p[1]))

        return pos[0] >= minX && pos[0] <= maxX && pos[1] >= minY && pos[1] <= maxY
    }

    isHovering(x, y) {
        const size = this.getSize()

        return this.isHoveringRectangle(this.getRelative(x, y), 0, 0, ...size)
        /*const points = this.getRectanglePoints(0, 0, ...size)/*[ // this is a mess, but... it works :D
            /*this.rotatePoint(0, 0, this.rotation),
            this.rotatePoint(size[0], 0, this.rotation),
            this.rotatePoint(0, size[1], this.rotation),
            this.rotatePoint(size[0], size[1], this.rotation)
        ]* /
        const minX = Math.min(...points.map(p => p[0]))
        const minY = Math.min(...points.map(p => p[1]))
        const maxX = Math.max(...points.map(p => p[0]))
        const maxY = Math.max(...points.map(p => p[1]))
        /*const topLeft = this.rotatePoint(0, 0, 0)
        const bottomRight = this.rotatePoint(size[0], size[1], this.rotation)
        console.log(topLeft)
        if (pos[0] >= topLeft[0] && pos[1] >= topLeft[1] && pos[0] <= bottomRight[0] && pos[1] <= bottomRight[1]) {
            return true
        }* /

        if (pos[0] >= minX && pos[0] <= maxX && pos[1] >= minY && pos[1] <= maxY) {
            return true
        }
        /*if (pos[0] >= 0 && pos[0] <= size[0] && pos[1] >= 0 && pos[1] <= size[1]) {
            return true
        }* /
        return false*/
    }

    async getUserTextInput(current) {
        const modal = document.getElementById('text-input')
        const modalValue = document.getElementById('text-input-value')
        modalValue.value = current
        setTimeout(() => {
            modal.showModal()
            modalValue.select() // inputs are great technological advancements
        }, 75)
        return new Promise(res => {
            modal.onclose = () => {
                res(modalValue.value)
            }
        })
    }

    async getUserSelectionInput(values, val=0) { // values is STRING: NUMBER
        const modal = document.getElementById('select-input')
        const modalValue = document.getElementById('select-input-value')
        modalValue.innerHTML = Object.entries(values).map((entry) => `<option value="${entry[1]}"${entry[1] == val ? ' selected' : ''}>${entry[0]}</option>`).join('')
        setTimeout(() => {
            modal.showModal()
        }, 75)
        return new Promise(res => {
            modal.onclose = () => {
                res(modalValue.value)
            }
        })
    }

    /**
     * Get the relative x and y based on the element's position
     * 
     * (convert from canvas element space to scaled/translated context space)
     * @param {CanvasRenderingContext2D} context 
     */
    getRelative(x, y) {
        const editor = this.editor
        if (editor == null) {
            // technically shouldn't happen, but can happen on page-load and a thing is already being hovered over
            return [0, 0]
        }

        const translation = editor.pan//.offset
        const scale = editor.scale
        const inverseScale = 1 / scale
        const pointerPos = [x, y]
        const elementPos = this.position

        return [
            pointerPos[0] * inverseScale - elementPos[0] - translation[0],
            pointerPos[1] * inverseScale - elementPos[1] - translation[1]
        ]
    }

    /**
     * Get the relative mouse/pointer x and y based on the element's position
     * @param {CanvasRenderingContext2D} context 
     */
    getRelativePointer() {
        return this.editor != null ? this.getRelative(...this.editor.position) : [-99, -99]
    }

    isPointerPressed() {
        return this.editor.primaryPressed && this.editor.canInteract()
    }

    /* TIMING */

    schedule(callback, seconds) {
        //console.log(seconds, 'is', this.getTicks(seconds))
        this.scheduledTasks.push([this.getTicks(seconds), callback])
    }

    getTicks(seconds) {
        return Math.floor(seconds * (1 / (this.editor?.flow?.updateSpeed || (1/60))))
    }

    /* METHODS */

    /**
     * Update method, ran every tick
     * 
     * **Should be used to update state ONLY**
     */
    update() {
        var remove = []
        for (const task of this.scheduledTasks) {
            task[0] -= 1
            if (task[0] <= 0) {
                task[1]()
                remove.push(task)
            }
        }

        remove.forEach(r => {
            this.scheduledTasks.splice(this.scheduledTasks.indexOf(r), 1)
        })
    }

    invalidate() {
        this.invalidated = true
    }

    drawPoints(context) {
        const size = this.getSize()
        // unrotate
        context.translate(size[0] / 2, size[1] / 2)
        context.rotate(-this.rotation * (Math.PI / 180))
        context.translate(-size[0] / 2, -size[1] / 2)

        // draw points
        context.fillStyle = '#ddd'
        context.strokeStyle = '#555'
        context.lineWidth = 2
        for (const point of this.getConnectionPointPositions()) {
            context.beginPath()
            context.arc(...point.position, 7, 0, Math.PI * 2)
            context.fill()
            context.stroke()
        }
        
        // re-rotate for sub drawings
        context.translate(size[0] / 2, size[1] / 2)
        context.rotate(this.rotation * (Math.PI / 180))
        context.translate(-size[0] / 2, -size[1] / 2)
    }

    /**
     * Draw the node
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        if (this.ghost)
            context.globalAlpha = .5

        const size = this.getSize()

        // draw node itself
        if (this.editor != null && this.editor.debug) {
            const depth = this.debug.depth * 3
            context.fillStyle = `rgb(${this.debug.updated ? 25 : 0},${Math.min(depth, 255)},${depth > 255 ? Math.min((depth - 255) / 5, 255) : 0})`
        }
        else
            context.fillStyle = '#fff'
        context.translate(this.position[0], this.position[1])

        // rotate
        context.translate(size[0] / 2, size[1] / 2)
        context.rotate(this.rotation * (Math.PI / 180))
        context.translate(-size[0] / 2, -size[1] / 2)

        context.beginPath()
        //context.fillRect(0, 0, this.size[0] * 100, this.size[1] * 100)
        context.roundRect(0, 0, ...size, 10)
        context.fill()

        if (this.cached) {
            const scaledSize = this.getSize(10)
            if (this.cache == null) {
                this.cache = new OffscreenCanvas(...scaledSize)
                //this.cache.width = scaledSize[0]
                this.cacheContext = this.cache.getContext('2d', {alpha: true})
            }
            if (this.cache.width != scaledSize[0]) {
                this.cache = new OffscreenCanvas(...scaledSize)
                this.cacheContext = this.cache.getContext('2d', {alpha: true})
            }


            if (!this.invalidated)
                return null
            this.invalidated = false
            this.cacheContext.reset()
            this.cacheContext.resetTransform()
            this.cacheScale = 2
            this.cacheContext.translate(scaledSize[0] / 4, scaledSize[1] / 4)
            //this.cacheContext.scale(1 / this.cacheScale * 5, 1 / this.cacheScale * 5)
            this.cacheContext.scale(1 / this.cacheScale * 5, 1 / this.cacheScale * 5)
            context = this.cacheContext
            /*context.globalAlpha = .5
            context.fillStyle = '#f00' // debug cubes
            context.fillRect(-5000, -5000, 999999999, 99999999)
            context.fillStyle = '#0f0'
            context.fillRect(0, 0, ...this.getSize())
            context.globalAlpha = .7*/
        }

        context.save()

            context.beginPath()
            context.rect(0, 0, ...size)
            context.clip()

            context.font = '15px monospace'
            context.fillStyle = '#ddd'
            context.textAlign = 'left'
            context.textBaseline = 'top'
            context.save()
            if (size[0] <= size[1]) {
                context.rotate(-Math.PI / 2)
                context.translate(-size[1], 0)
            }
            context.fillText(this.display, 5, 5)
            context.restore()

        context.restore()


        // draw connection points
        this.drawPoints(context)
        
        context.fillStyle = '#fff'
        return context
    }

    cacheDraw(context) {
        const size = this.getSize(this.cacheScale)
        context.drawImage(this.cache, -size[0] / 2, -size[1] / 2, ...this.getSize(2 * this.cacheScale))
    }
}