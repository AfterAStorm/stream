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

function dotV2(a, b) {
    return Math.acos(
        ( a[0] * b[0] + a[1] * b[1] )
        /
        (distV2(a) * distV2(b))
    )
}

function getPointPos(point) {
    if (point.node)
        return [point.node.position[0] + point.position?.[0] ?? 0, point.node.position[1] + point.position?.[1] ?? 0]
    return point.position
}

export class Connection {
    static id = 'wire'
    static display = "Wire"
    static max = (1e+15 - 1)
    
    constructor(connectionA, connectionB) {
        this.id = this.constructor.id
        this.display = this.constructor.display
        this.max = this.constructor.max
        this.a = connectionA
        this.b = connectionB
        this.value = 0
        this.nextValue = 0
        this.points = connectionA ? [connectionA] : []
        this.edges = []
        this.fakeEdge = null // [index, point]
        if (connectionB)
            this.points.push(connectionB)
        //this.visualPoints = []
        this.color = '#ff0000'
    }

    serialize() {
        return {
            'points': this.points.map(p => (p.node ? {
                'node': p.node.index,
                'id': p.id
            } : {
                'position': p.position
            })),
            'edges': this.edges,
            //'visualPoints': this.visualPoints,
            'color': this.color,
            'id': this.id
        }
    }

    deserialize(data, flow) {
        if (data.visualPoints != null) {
            // parse "old format"
            const points = data.points.map(p => flow.nodes[p.node].getConnectionPoint(p.id))

            this.points = [points[0], ...data.visualPoints.map(vp => ({'position': vp})), points[1]]
            this.edges = []
            for (let i = 0; i < this.points.length - 1; i++) {
                this.edges.push([i, i + 1])
            }

            this.color = data.color ?? '#ea3030'
            this.a = points[0]
            this.b = points[1]
            return
        }
        //this.points = data.points.map(p => flow.nodes[p.node].getConnectionPoint(p.id))
        this.points = data.points.map(p => {
            if (p.node != null) // if it has a node, get it!
                return flow.nodes[p.node].getConnectionPoint(p.id)
            return p
        })
        this.edges = data.edges
        //this.visualPoints = data.visualPoints
        this.color = data.color ?? '#ea3030'
        this.a = this.points[0]
        this.b = this.points[1]
    }

    isValid() {
        // a wire is valid if it has at least 1 node point
        return this.points.some(p => p.node != null)
    }

    addEdge(a, b) {
        this.edges.push([a, b])
    }

    addPoint(x, y) {
        if (y == null) { // ConnectionPoint
            const index = x.node != null ? this.points.findIndex(p => p.node == x.node && p.id == x.id) : -1
            if (index > -1)
                return index
            else {
                this.points.push(x)
            }
        }
        else // x, y
            this.points.push({position: [x, y]}) //this.visualPoints.push([x, y])
        return this.points.length - 1
    }

    getEdge(index) {
        return this.edges[index]
    }

    /**
     * Shift all edges with an index >= x (used when deleting points)
     * @param {Number} indexThreshold 
     */
    shiftEdges(indexThreshold) {
        this.edges.forEach(e => e.forEach((p, i) => e[i] = p >= indexThreshold ? p - 1 : p))
    }

    deletePoint(index) {
        this.points.splice(index, 1)
        this.shiftEdges(index)
    }

    dissolvePoint(index, onlyOrphaned) {
        const pointEdges = this.getPointEdgeIndexes(index).reverse() // find all edges with this point
        if (pointEdges.length == 0) {
            // point is orphaned, kill it!
            this.deletePoint(index)
        }
        else if (pointEdges.length == 1 && !onlyOrphaned) {
            // point is a leaf, murder it!
            pointEdges.forEach(e => this.deleteEdge(e))
            this.deletePoint(index)
        }
        else if (pointEdges.length == 2 && !onlyOrphaned) {
            // remove in-between point!
            const neighbors = pointEdges.map(e => this.getEdge(e)).map(e => e[0] == index ? e[1] : e[0])
            pointEdges.forEach(e => this.deleteEdge(e))
            this.addEdge(neighbors[0], neighbors[1])
            this.deletePoint(index)
        }
        else
            return false
        return true
    }

    getPointEdges(pointIndex) {
        return this.edges.filter(e => e.some(p => p == pointIndex))
    }

    getPointEdgeIndexes(pointIndex) {
        return this.edges.map((e, i) => [i, e]).filter(ei => ei[1].some(p => p == pointIndex)).map(ei => ei[0])
    }

    edgeExistsBetween(indexA, indexB) {
        return this.getPointEdges(indexA).some(edge => edge.includes(indexB))
    }

    deleteEdge(index) {
        this.edges.splice(index, 1)
    }

    dissolveEdge(index) {
        const edge = this.getEdge(index)
        if (!edge.some(p => this.isPointNode(p) || this.getPointEdges(p).length == 1))
            return false // can't dissolve an edge that branches off!
        this.deleteEdge(index)
        edge.sort((a, b) => b - a) // last to first, don't have to shift indexes
        edge.forEach(p => {
            this.dissolvePoint(p, true)
        })
        this.invalidatePoints()
        return true
    }

    cleanupPoints() {
        const COMBINE_ANGLE = Math.PI / 180
        let droppedPoints
        do {
            droppedPoints = []
            for (let i = 0; i < this.points.length; i++) {
                if (this.points[i].node != null)
                    continue // ignore node points
                const pos = this.getPointPosition(i)
                const edges = this.getPointEdges(i)
                const neighbors = edges.map(e => e[0] == i ? e[1] : e[0])
                if (neighbors.length == 2) {
                    const dirA = subV2(pos, this.getPointPosition(neighbors[0]))
                    const dirB = subV2(pos, this.getPointPosition(neighbors[1]))
                    const angleBetween = dotV2(dirA, dirB) % Math.PI // 0 - 180
                    if (Math.PI - COMBINE_ANGLE < angleBetween || angleBetween < COMBINE_ANGLE) {
                        // combine
                        droppedPoints.push(i)
                    }
                }
            }

            droppedPoints.reverse().forEach(index => {
                const edges = this.getPointEdgeIndexes(index).reverse()
                
                // get the neighbors
                const neighbors = edges.map(e => this.getEdge(e)).map(e => e[0] == index ? e[1] : e[0])
                
                // delete them
                edges.forEach(e => this.deleteEdge(e)) // very inefficient, but whatever
                
                // combine the neighbors
                if (neighbors.length == 2) {
                    this.addEdge(neighbors[0], neighbors[1])
                }
                else {
                    throw Error('cannot drop point with multiple edges')
                }
                this.deletePoint(index)
            })
        } while(droppedPoints.length > 0)
    }

    searchForNodePoint(startingIndex) { // find "nearest" node index; breadth first(?) search
        let searchedIndexes = []
        let openIndexes = [startingIndex]

        while (openIndexes.length > 0) {
            // get neighbors
            const index = openIndexes.pop()
            searchedIndexes.push(index)
            
            const neighbors = this.getPointEdges(index).flat().filter(n => !searchedIndexes.includes(n) && !openIndexes.includes(n))
            const nodeNeighbors = []
            for (const neighbor of neighbors) {
                if (this.points[neighbor].node != null) {
                    nodeNeighbors.push(neighbor)
                    continue
                }
                openIndexes.push(neighbor)
            }
            if (nodeNeighbors.length > 0) {
                const basis = this.getPointPosition(index)
                nodeNeighbors.sort((a, b) => distV2(subV2(basis, this.getPointPosition(a))) - distV2(subV2(basis, this.getPointPosition(b))))
                return nodeNeighbors[0]
            }
        }
    }

    getPoint(index) {
        return this.points[index]
    }

    getPointIndex(point) {
        return this.points.findIndex(p => (point.node != null && p.node == point.node && p.id == point.id) || (p.position == point.position))
    }

    getPointPosition(index) {
        return getPointPos(this.points[index]) // FLOW position, not SCREEN position!
    }

    invalidatePoints() {
        this.points.forEach(p => {
            if (p.node != null)
                p.node.invalidatePoint(p.id)
        })
        this.update()
    }

    /**
     * Check if a point is a node point
     * @param {Number} index 
     * @returns {boolean}
     */
    isPointNode(index) {
        return this.points[index].node != null
    }

    hasPoint(point) {
        return this.has(point)
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
        return this.getHoveringSegment(x, y) != null || this.getHoveringSubPoint(x, y) != null
    }

    getHoveringSegment(x, y) {
        /*const plotPoints = [...this.visualPoints]
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
            if (Math.abs(approxDist - lineDist) < range)
                return i - 1
        }
        return null*/
        const range = this.editor != null ? (this.editor.inputType == 'touch' ? .35 : .35) : .35
        for (let i = 0; i < this.edges.length; i++) {
            const e = this.edges[i]
            const a = getPointPos(this.points[e[0]])
            const b = getPointPos(this.points[e[1]])
            
            const approxDist = distV2(this.getRelative(...a, x, y)) + distV2(this.getRelative(...b, x, y))
            const lineDist = distV2(subV2(a, b))

            if (Math.abs(approxDist - lineDist) < range)
                return i
        }
    }

    getHoveringSubPoint(x, y) {
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i]
            if (point.node != null)
                continue

            const offset = this.getRelative(...getPointPos(point), x, y)
            const dist = distV2(offset)

            if (Math.abs(dist) < 7) // it has to be on line for this to check anyway
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
        //console.warn('update!')
        //if (this.ghost) // since connections get selected after clone, this will prevent them from updating... for now it's fine to leave it without
        //    return // don't handle logic... it's kind of funny to see it update live... but no.
        // TODO: cache output nodes
        let a = this.points.filter(p => p.type == 'output').reduce((ac, v) => ac + v.value, 0) //this.a.type == 'input' ? this.b : this.a
        a = Math.max(Math.min(a, this.max), 0)
        
        //console.log(`a: ${a}`)
        //const b = this.a.type == 'input' ? this.a : this.b
        if (a != null)
            this.nextValue = Math.max(a || 0, 0)
        //if (b != null)
        //    b.value += this.value
    }

    ccw(x1, y1, x2, y2, x3, y3) {
        return (y3 - y1) * (x2 - x1) > (y2 - y1) * (x3 - x1)
    }

    intersects(a, b, a2, b2) {
        return this.ccw(...a, ...a2, ...b2) != this.ccw(...b, ...a2, ...b2) && this.ccw(...a, ...b, ...b2) != this.ccw(...a, ...b, ...b2)
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        /*var draw = false
        const spots = [...addV2(this.a.node.position, this.a.position)]
        this.visualPoints.forEach(p => spots.push(...p))
        if (this.b)
            spots.push(...addV2(this.b.node.position, this.b.position))
        for (let i = 0; i < spots.length; i += 2) {
            const rel = this.getRelative(spots[i], spots[i + 1], 0, 0)
            const scale = this.editor?.scale ?? 1
            const inverseScale = 1 / scale
            if (rel[0] < 0 && rel[0] > -this.editor.canvas.width * inverseScale && rel[1] < 0 && rel[1] > -this.editor.canvas.height * inverseScale) {
                draw = true
                break
            }
        }
        if (!draw)
            return
*/
        profiler.group('draw connection')
        profiler.group('ghost check')
        //this.ghost = this.points.some(p => p.node.ghost)
        if (this.ghost)
            context.globalAlpha = .5
        profiler.swap('alpha check')
        if (
            (this.editor != null && this != this.editor.creatingConnection) && (
                (this.editor.hoveredPoint != null && !this.points.includes(this.editor.hoveredPoint)) ||
                (this.editor.hoveredConnectionColor != null && this.editor.hoveredConnectionColor != this.color) ||
                (this.editor.hoveredConnection != null && this.editor.hoveredConnection != this)
            )) {
            context.globalAlpha = .2
        }

        profiler.swap('draw')
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.lineWidth = 5
        context.strokeStyle = this.value <= 0 ? '#000' : '#ffd133'
        context.beginPath()
        /*context.moveTo(this.a.node.position[0] + this.a.position[0], this.a.node.position[1] + this.a.position[1])
        this.visualPoints.forEach(p => 
            context.lineTo(...p)
        )
        if (this.b != null)
            context.lineTo(this.b.node.position[0] + this.b.position[0], this.b.node.position[1] + this.b.position[1])*/
        this.points.forEach(p => {
            if (p.node != null) // faster than a .filter().forEach since it's only one iteration?
                return
            context.moveTo(...getPointPos(p))
            context.arc(...getPointPos(p), context.lineWidth / 2, 0, 2 * Math.PI)
        })
        this.edges.forEach(e => {
            const a = this.points[e[0]]
            const b = this.points[e[1]]
            context.moveTo(...getPointPos(a))
            context.lineTo(...getPointPos(b))
        })
        if (this.fakeEdge != null) {
            //context.arc(...getPointPos(this.points[this.fakeEdge[0]]), context.lineWidth / 2, 0, 2 * Math.PI)
            context.moveTo(...getPointPos(this.points[this.fakeEdge[0]]))
            context.lineTo(...getPointPos(this.fakeEdge[1]))
        }
        context.stroke()
        context.lineWidth = 3
        context.strokeStyle = this.color
        context.stroke()
        profiler.close()
        profiler.close()
    }
}