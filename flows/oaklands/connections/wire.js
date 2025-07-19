/* connection */

function addV2(a, b) {
    return [a[0] + b[0], a[1] + b[1]]
}

function subV2(a, b) {
    return [a[0] - b[0], a[1] - b[1]]
}

function distV2(a) {
    return Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2))
}

export class Connection {
    static id = 'wire'
    static display = "Wire"
    
    constructor(connectionA, connectionB) {
        this.id = this.constructor.id
        this.display = this.constructor.display
        this.a = connectionA
        this.b = connectionB
        this.value = 0
        this.points = [connectionA]
        if (connectionB)
            this.points.push(connectionB)
        this.visualPoints = []
        this.color = '#ff0000'
    }

    serialize() {
        return {
            'points': this.points.map(p => ({
                'node': p.node.index,
                'id': p.id
            })),
            'visualPoints': this.visualPoints,
            'color': this.color,
            'id': this.id
        }
    }

    deserialize(data, flow) {
        this.points = data.points.map(p => flow.nodes[p.node].getConnectionPoint(p.id))
        this.visualPoints = data.visualPoints
        this.color = data.color || '#ff0000'
        this.a = this.points[0]
        this.b = this.points[1]
    }

    addPoint(x, y) {
        this.visualPoints.push([x, y])
    }

    has(connectionPoint) {
        if (connectionPoint == null)
            return false
        return this.points.some(p => p.node == connectionPoint.node && p.id == connectionPoint.id)
    }

    getRelative(x, y, tx, ty) {
        const editor = this.editor
        if (editor == null)
            return [0, 0] // ffs

        const translation = editor.pan//.offset
        const scale = editor.scale
        const inverseScale = 1 / scale

        return [
            tx * inverseScale - x - translation[0],
            ty * inverseScale - y - translation[1]
        ]
    }

    isHovering(x, y) {
        return this.getHoveringSegment(x, y) != null
    }

    getHoveringSegment(x, y) {
        const plotPoints = [...this.visualPoints]
        if (this.a && this.a.position)
            plotPoints.splice(0, 0, addV2(this.a.position, this.a.node.position))
        if (this.b && this.b.position)
            plotPoints.push(addV2(this.b.position, this.b.node.position))

        const range = this.editor != null ? (this.editor.inputType == 'touch' ? .35 : .25) : .25
        for (let i = 1; i < plotPoints.length; i++) {
            const from = plotPoints[i - 1]
            const to = plotPoints[i]

            const fromOffset = this.getRelative(...from, x, y)
            const toOffset = this.getRelative(...to, x, y)
            const fromDist = distV2(fromOffset)
            const toDist = distV2(toOffset)

            const approxDist = fromDist + toDist
            const lineDist = distV2(subV2(from, to))
            if (Math.abs(approxDist - lineDist) < .25)
                return i - 1
        }
        return null
    }

    getHoveringSubPoint(x, y) {
        for (let i = 0; i < this.visualPoints.length; i++) {
            const point = this.visualPoints[i]

            const offset = this.getRelative(...point, x, y)
            const dist = distV2(offset)

            if (Math.abs(dist) < 10) // it has to be on line for this to check anyway
                return i
        }
        return null
    }

    reset() {
        const b = this.a.type == 'input' ? this.a : this.b
        if (b != null)
            b.value = 0
    }

    update() {
        //if (this.ghost) // since connections get selected after clone, this will prevent them from updating... for now it's fine to leave it without
        //    return // don't handle logic... it's kind of funny to see it update live... but no.
        const a = this.a.type == 'input' ? this.b : this.a
        //const b = this.a.type == 'input' ? this.a : this.b
        if (a != null)
            this.value = Math.max(a.value || 0, 0)
        //if (b != null)
        //    b.value += this.value
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        this.ghost = this.points.some(p => p.node.ghost)
        if (this.ghost)
            context.globalAlpha = .5
        if (
            (this.editor != null) && (
                (this.editor.hoveredPoint != null && !this.points.includes(this.editor.hoveredPoint)) ||
                (this.editor.hoveredConnectionColor != null && this.editor.hoveredConnectionColor != this.color) ||
                (this.editor.hoveredConnection != null && this.editor.hoveredConnection != this)
            )) {
            context.globalAlpha = .2
        }

        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.lineWidth = 5
        context.strokeStyle = this.value <= 0 ? '#000' : '#ffd133'
        context.beginPath()
        context.moveTo(this.a.node.position[0] + this.a.position[0], this.a.node.position[1] + this.a.position[1])
        this.visualPoints.forEach(p => 
            context.lineTo(...p)
        )
        if (this.b != null)
            context.lineTo(this.b.node.position[0] + this.b.position[0], this.b.node.position[1] + this.b.position[1])
        context.stroke()
        context.lineWidth = 3
        context.strokeStyle = this.color
        context.stroke()
    }
}