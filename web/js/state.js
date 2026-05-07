/* web */

import { KeybindManager, Keybind, SettingManager, BoolSetting, CycleSetting } from "./settings.js"
import { showInfoModal } from "./modal.js"

function addV2(a, b) {
    return [a[0] + b[0], a[1] + b[1]]
}

function subV2(a, b) {
    return [a[0] - b[0], a[1] - b[1]]
}

function mulV2s(a, b) { // s for scalar
    return [a[0] * b, a[1] * b]
}

function distV2(a) {
    return Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2))
}

function absV2(a) { // ref
    a[0] = Math.abs(a[0])
    a[1] = Math.abs(a[1])
    return a
}

export class EditorState {
    constructor() {
        // editor //

        this.pan = [0, 0]
        this.scale = 1
        this.gridSize = 25

        // input //

        this.position = [0, 0]
        this.positionDelta = [0, 0]
        this.primaryPressed = false
        this.secondaryPressed = false
        this.isDragging = false
        this.heldKeys = []

        this.hoveredConnectionColor = null
        this.connectionColor = null

        this.keybinds = new KeybindManager({
            'select':       new Keybind('interact, select, and create connections with nodes', 1),
            'pan':          new Keybind('pan the camera', 2),

            'move':         new Keybind('move nodes and connections', 1),
            'delete':       new Keybind('delete nodes and connections', 2),
            'rotate':       new Keybind('rotate nodes', 'keyr'),
            'clone':        new Keybind('clone nodes and/or connections', 'keye'),

            'persist':      new Keybind('keep selecting nodes or placing connections', 'shiftleft'),
            'snap':         new Keybind('snap nodes & connections to the grid', 'shiftleft'),

            'lasso':        new Keybind('select multiple nodes all at once', 'controlleft')
        })
        this.settings = new SettingManager({
            'grid snapped connections': new BoolSetting('should snap connections to "grid"', true),
            'point snapped connections': new BoolSetting('should snap to connection points on nodes on axises', true),
            'subpoint snapped connections': new BoolSetting('should snap to "intermediate" points on connections', true),
            'segment snapped connections': new BoolSetting('should snap to lines on connections', true),
            'local snapped connections': new BoolSetting('should snap connections relative to last point', true),
            'grid snapped nodes': new BoolSetting('should snap nodes to "grid"', true),
            'grid increment': new CycleSetting('cycle grid size increments', [['1 / 4', 1/4], ['1 / 2', 1/2], ['1', 1]])
        })

        this.inputType = 'mouse'
        this.lastPinchDistance = null

        // history //

        this.history = [] // history stack

        // creating //

        this.selectedNodes = []
        this.selectedPoints = []
        this.selectedConnections = []
        this.selectedSubPoints = []

        this.hoverTime = null // fade time, Date.now() (wait 1000, then fade)
        this.hoveredNodeType = null // for node highlighting, set in onFlowLoad
        this.hoveredNode = null
        this.hoveredPoint = null
        this.hoveredConnection = null
        this.snappingLines = [] // what we are snapping to, [[axisx, axiy], [x, y]]

        this.creatingNode = null
        this.creatingConnection = null

        this.selectionStart = null

        // etc //

        this.debug = false
    }

    serialize() {
        return {
            pan: this.pan,
            scale: this.scale
        }
    }

    deserialize(data) {
        this.pan = data.pan || this.pan
        this.scale = data.scale || this.scale
    }
    
    canSelect() {
        //if (this.interactionModeCheckbox && this.interactionModeCheckbox.checked)
        return ['all', 'organize'].includes(this.mode.value)
    }
    
    canConnect() {
        return ['all', 'connect'].includes(this.mode.value)
    }
    
    canInteract() {
        return ['all', 'interact'].includes(this.mode.value)
    }

    isKeyHeld(key) {
        return this.heldKeys.includes(key)
    }

    updateCursor() {
        document.body.style.cursor = this.isKeybindHeld('pan') ? 'move' : null
    }

    isKeybindHeld(name) {
        return this.keybinds.get(name).isPressed()
    }

    wasKeybindPressed(name) {
        return this.keybinds.get(name).wasPressed()
    }

    addHistory(event, objects) {
        this.history.push({
            event,
            objects
        })
        while (this.history.length > 5) {
            this.history.splice(0, 1)
        }
    }

    handleUndo() {
        const mostRecent = this.history.splice(-1, 1)[0]
        if (!mostRecent)
            return // nothing to undo
        // console.log('UNDO', mostRecent.event, mostRecent)
        try {
            switch (mostRecent.event) {
                case 'delete':
                    mostRecent.objects.nodes.forEach(obj => this.editor.flow.nodes.push(obj))
                    mostRecent.objects.connections.forEach(obj => this.editor.flow.connections.push(obj))
                    mostRecent.objects.subpoints.forEach(obj => {
                        obj[0].visualPoints.splice(obj[1], 0, obj[2])
                    })
                    break
                case 'move':
                    mostRecent.objects.nodes.forEach(obj => obj[0].position = obj[1])
                    mostRecent.objects.connections.forEach(obj => obj[1].forEach((point, index) => obj[0].visualPoints[index] = point))
                    mostRecent.objects.subpoints.forEach(obj => {
                        obj[0].visualPoints[obj[1]] = obj[2]
                    })
                    break
                case 'connect':
                    mostRecent.objects.forEach(connection => this.editor.flow.cutConnection(connection))
                    break
            }
        }
        catch (err) {
            console.warn('failed to undo action')
            console.error(err)
        }
    }

    handlePan() {
        this.pan[0] += this.positionDelta[0] * (1 / this.scale)
        this.pan[1] += this.positionDelta[1] * (1 / this.scale)
    }

    update(delta) {
        this.handlePanKeyboard(delta)
    }

    handlePanKeyboard(delta) {
        if (document.activeElement != document.body && document.activeElement != null)
            return
        const dir = [
            (this.heldKeys.includes('keyd') ? -1 : 0) + (this.heldKeys.includes('keya') ? 1 : 0),
            (this.heldKeys.includes('keys') ? -1 : 0) + (this.heldKeys.includes('keyw') ? 1 : 0)
        ]
        const speed = .75 + (this.heldKeys.includes('Shift') ? .75 : 0) - (this.heldKeys.includes('Control') ? .5 : 0)
        this.pan[0] += speed * delta * dir[0]// * (1 / this.scale)
        this.pan[1] += speed * delta * dir[1]// * (1 / this.scale)ik
        if (this.isDragging) {
            this.positionDelta[0] = -speed * delta * dir[0] * (this.scale)
            this.positionDelta[1] = -speed * delta * dir[1] * (this.scale)
            this.handleDrag()
            this.handleMove() // pretend the mouse moved for everything that requires that
        }
    }

    handleDrag() {
        if (this.creatingNode != null) {
            const size = this.creatingNode.getSize()
            this.creatingNode.position = subV2(this.screenToFlow(this.position), mulV2s(size, .5))
            this.selectNodes([this.creatingNode]) // force an update in the _drag_offset department
            this.creatingNode = null
        }
        else {
            const flowPos = this.screenToFlow(this.position)
            if (!this.isDragging) {
                this.isDragging = true
                this.addHistory('move', {
                    nodes: this.selectedNodes.map(node => [node, [...node.position]]),
                    connections: this.editor.flow.connections
                        .filter(connection => connection.points.every(point => this.selectedNodes.includes(point.node)))
                        .map(connection => [connection, connection.points.map(point => [...point.position])]),
                    //subpoints: this.selectedSubPoints.map(subpoint => [subpoint[0], subpoint[1], [...subpoint[0].visualPoints[subpoint[1]]]])
                })
            }
            this.selectedSubPoints.forEach(subpoint => {
                subpoint[0].points[subpoint[1]].position = this.getSnapFor(this.screenToFlow(...this.position), null, true)
            })
            const isGridSnapping = this.isKeybindHeld('snap') && this.settings.getValue('grid snapped nodes')
            this.selectedNodes.forEach(node => {
                //node.position[0] += this.positionDelta[0] * (1 / this.scale)
                //node.position[1] += this.positionDelta[1] * (1 / this.scale)
                node.position = addV2(flowPos, node._drag_offset)

                if (isGridSnapping) {
                    const increment = this.settings.getValue('grid increment')
                    node.position[0] = Math.round(node.position[0] / (this.gridSize * increment)) * (this.gridSize * increment)
                    node.position[1] = Math.round(node.position[1] / (this.gridSize * increment)) * (this.gridSize * increment)
                }
            })
            this.editor.flow.connections.forEach(connection => {
                if (connection.points.every(point => point.node != null ? this.selectedNodes.includes(point.node) : true)) {
                    /*connection.visualPoints.forEach(subpoint => {
                        subpoint[0] += this.positionDelta[0] * (1 / this.scale)
                        subpoint[1] += this.positionDelta[1] * (1 / this.scale)
                    })*/
                    connection.points.forEach(point => {
                        if (point.node)
                            return // ignore node points
                        point.position = addV2(point._relative_to.position, point._drag_offset)
                        /*if (isGridSnapping) {
                            const increment = this.settings.getValue('grid increment')
                            point.position[0] = Math.round(point.position[0] / (this.gridSize * increment)) * (this.gridSize * increment)
                            point.position[1] = Math.round(point.position[1] / (this.gridSize * increment)) * (this.gridSize * increment)
                        }*/
                    })
                }
                /*else if (connection.visualPoints.length > 0 && connection.points.some(point => this.selectedNodes.includes(point.node))) {
                    if (this.selectedNodes.includes(connection.points[0].node)) {
                        connection.visualPoints[0][0] += this.positionDelta[0] * (1 / this.scale) 
                        connection.visualPoints[0][1] += this.positionDelta[1] * (1 / this.scale) 
                    }
                    else {
                        connection.visualPoints[connection.visualPoints.length - 1][0] += this.positionDelta[0] * (1 / this.scale) 
                        connection.visualPoints[connection.visualPoints.length - 1][1] += this.positionDelta[1] * (1 / this.scale) 
                    }
                }*/
            })
        }
    }

    selectNodes(nodes) {
        if (this.selectedNodes != null)
            this.selectedNodes.forEach(node => {
                node._drag_offset = null
                node.ghost = false
            })
        const flowPos = this.screenToFlow(this.position)
        this.selectedNodes = nodes
        if (this.selectedNodes != null)
            this.selectedNodes.forEach(node => {
                node._drag_offset = subV2(node.position, flowPos)
                node.ghost = true
            })
        this.editor.flow.connections.forEach(con => {
            if (con.points.some(p => this.selectedNodes.includes(p.node))) {
                con.points.forEach((p, i) => {
                    if (p.node)
                        return // node points get assigned a position differently, and are relative to the node already
                    let closestNode = con.searchForNodePoint(i)
                    if (closestNode == null) { // this should never happen in a correctly layed out connection
                        closestNode = 0
                    }
                    p._relative_to = con.getPoint(closestNode).node
                    p._drag_offset = subV2(p.position, /*flowPos*/p._relative_to.position)
                })
            }
        })
    }

    deselectAll() {
        this.selectNodes([])
        if (this.creatingConnection != null) {
            this.creatingConnection.fakeEdge = null
            this.creatingConnection.cleanupPoints()
            this.creatingConnection = null
        }
        this.snappingLines = []
        this.selectedConnections = []
        this.selectedPoints = []
        this.selectedSubPoints = []
        this.hoveredConnection = null
        this.hoveredNode = null
        this.hoveredPoint = null
        this.hoveredSubPoint = null
    }

    handleSelect() {
        const nodes = this.editor.flow.getNodesAt(...this.position)
        const points = this.editor.flow.getConnectionPointsAt(...this.position)
        const connections = this.editor.flow.getConnectionsAt(...this.position)//.filter(connection => connection != this.creatingConnection)
        // priority:
        // connection point
        // node
        // connection

        if (this.isKeybindHeld('lasso')) { // multi-drag/select
            this.selectionStart = [...this.position]
            this.primaryPressed = false
        }
        else if (points.length > 0 && this.selectedNodes.length == 0 && this.canConnect()) {
            if (this.creatingConnection == null) {
                this.deselectAll()
                this.selectedPoints = [points[0]]
                this.creatingConnection = new (this.editor.flow.getConnectionFor(points[0]))(points[0], null)
                this.creatingConnection.color = this.connectionColor
                this.creatingConnectionPointIndex = 0
                this.editor.flow.connections.push(this.creatingConnection)
                points[0].node.invalidatePoint(points[0].id)
            }
            else {
                this.creatingConnection.addEdge(this.creatingConnectionPointIndex, this.creatingConnection.addPoint(points[0]))
                this.creatingConnection.invalidatePoints()

                if (!this.isKeybindHeld('persist')) {
                    this.deselectAll()
                }
            }
        }
        else if (connections.length > 0) {
            if (!this.canConnect())
                return
            // indexes!
            const connection = connections[0]
            const subpoint = connection.getHoveringSubPoint(...this.position)
            const segment = connection.getHoveringSegment(...this.position)
            if (this.creatingConnection == null) { // start new connection
                if (subpoint != null) {
                    // from existing point
                    if (this.isKeyHeld('Alt')) {
                        // new connection from
                        this.deselectAll()
                        this.creatingConnection = connection
                        this.creatingConnectionPointIndex = subpoint
                    }
                    else {
                        // drag
                        // we have to tell the getSnapFor that we are using this connection so it doesn't snap to itself
                        this.creatingConnection = connection
                        this.creatingConnectionPointIndex = null
                        this.selectedSubPoints = [[connection, subpoint]]
                    }
                }
                else if (segment != null) {
                    // split at point
                    this.deselectAll()
                    // project onto line
                    const edge = connection.getEdge(segment)
                    const a = connection.getPointPosition(edge[0])
                    const b = connection.getPointPosition(edge[1])
                    const pos = this.projectOntoLine(a, b, this.getSnapFor(this.screenToFlow(this.position), null, false))

                    connection.deleteEdge(segment)
                    const pointIndex = connection.addPoint(...pos)
                    connection.addEdge(edge[0], pointIndex)
                    connection.addEdge(pointIndex, edge[1])
                    this.creatingConnection = connection
                    this.creatingConnectionPointIndex = null
                    this.selectedSubPoints = [[connection, pointIndex]]
                }
            }
            else if (this.creatingConnectionPointIndex != null) { // merge connection
                // try to merge
                const merging = connections[0]
                if (subpoint != null) {
                    if (merging == this.creatingConnection) {
                        if (this.creatingConnection.getPointEdges(this.creatingConnectionPointIndex).flat().includes(subpoint))
                            return // cannot connect to subpoint we are right next to!
                    }
                    // merge to subpoint
                    console.warn('MERGE TO SUBPOINT!')
                    if (merging == this.creatingConnection) {
                        // connect to same connection
                        this.creatingConnection.addEdge(this.creatingConnectionPointIndex, subpoint)
                    }
                    else {
                        // connect & merge
                        const mergeMap = {}
                        this.creatingConnection.invalidatePoints() // when merge, tell points to update!
                        this.creatingConnection.points.forEach((p, idx) => {
                            mergeMap[idx] = merging.addPoint(p)
                        })
                        this.creatingConnection.edges.forEach(e => merging.edges.push([mergeMap[e[0]], mergeMap[e[1]]]))
                        this.creatingConnectionPointIndex = mergeMap[this.creatingConnectionPointIndex]
                        merging.addEdge(this.creatingConnectionPointIndex, subpoint)
                        this.flow.cutConnection(this.creatingConnection)

                    }
                    this.deselectAll()
                }
                else if (segment != null) { // we don't care about neighbor segments, since it will just split it anyway
                    console.warn('MERGE TO SEGMENT!')
                    const pos = this.getSnapFor(this.screenToFlow(this.position), this.creatingConnection.getPointPosition(this.creatingConnectionPointIndex))
                    const edge = merging.getEdge(segment)
                    const pointIndex = merging.addPoint(...pos)
                    merging.deleteEdge(segment)
                    merging.addEdge(edge[0], pointIndex)
                    merging.addEdge(pointIndex, edge[1])
                    if (merging == this.creatingConnection) {
                        //console.log('merge to self')
                        // connect to same connection
                        // conveniently it already kinda does it :D
                    }
                    else {
                        const mergeMap = {}
                        this.creatingConnection.invalidatePoints() // when merge, tell points to update!
                        this.creatingConnection.points.forEach((p, idx) => {
                            mergeMap[idx] = merging.addPoint(p)
                        })
                        this.creatingConnection.edges.forEach(e => merging.edges.push([mergeMap[e[0]], mergeMap[e[1]]]))
                        this.creatingConnectionPointIndex = mergeMap[this.creatingConnectionPointIndex]
                        this.flow.cutConnection(this.creatingConnection)
                    }
                    merging.addEdge(this.creatingConnectionPointIndex, pointIndex)
                    this.deselectAll()
                }
            }
        }
        else if (this.creatingConnection != null && this.creatingConnectionPointIndex != null) {
            if (!this.canConnect())
                return
            // add intermediate point
            const pos = this.getSnapFor(this.screenToFlow(this.position), this.creatingConnection.getPointPosition(this.creatingConnectionPointIndex))
            this.creatingConnection.addPoint(...pos)
            this.creatingConnection.addEdge(this.creatingConnectionPointIndex, this.creatingConnection.points.length - 1)
            console.log(this.creatingConnection)
            this.creatingConnectionPointIndex = this.creatingConnection.points.length - 1
        }
        else if (nodes.length > 0 && this.canSelect()) {
            if (!this.canSelect())
                return
            const multiSelectEnabled = this.inputType == 'touch' || this.isKeyHeld('Shift')

            if (!multiSelectEnabled) {
                if (this.selectedNodes.length > 1)
                    return this.selectNodes(this.selectedNodes) // ignore, drag multiselected and update offsets
                const firstNode = nodes[nodes.length - 1]
                this.selectNodes([firstNode])
            }
            else {
                const unselected = nodes.filter(n => !this.selectedNodes.includes(n))
                if (unselected.length > 0)
                    this.selectNodes([...this.selectedNodes, unselected[unselected.length - 1]])
                else {
                    this.selectNodes(this.selectedNodes.filter(n => n != nodes[nodes.length - 1])) // remove node
                }
            }
        }
        else {
            this.selectNodes([])
        }

        /*if (this.creatingNode != null && this.inputType == 'touch') {
            // special behavior for mobile
            this.selectNodes([this.creatingNode])
            this.handleDrag()
            return
        }
        if (this.selectedSubPoints.length > 0 && this.inputType == 'touch') {
            this.selectedSubPoints = []
            this.selectedConnections = []
        }
        if (this.isKeybindHeld('lasso')) { // multi-drag/select
            this.selectionStart = [...this.position]
            this.primaryPressed = false
        }
        else if (points.length > 0 && this.selectedNodes.length == 0 && this.canConnect()) {
            if (this.isKeyHeld('Alt') && this.creatingConnection == null) {
                points.forEach(point => {
                    if (!this.selectedPoints.includes(point))
                        this.selectedPoints.push(point)
                })
            }
            else {
                if (this.selectedPoints.length == 1 && this.creatingConnection != null) {
                    // point is already selected, try to connect
                    const point = points[0]
                    if (this.editor.flow.canConnectTo(this.selectedPoints[0], point)) {
                        this.creatingConnection.b = point
                        this.creatingConnection.points.push(point)
                        this.creatingConnection.update()

                        this.creatingConnection.a.node.needsConnectionUpdate = true
                        this.creatingConnection.b.node.needsConnectionUpdate = true

                        const lastConnection = this.creatingConnection
                        this.creatingConnection = null

                        this.addHistory('connect', [this.creatingConnection])

                        if (this.isKeybindHeld('persist')) {
                            // continue creating a wire
                            this.creatingConnection = new lastConnection.constructor(this.selectedPoints[0], null)
                            this.creatingConnection.color = lastConnection.color
                            lastConnection.visualPoints.forEach(point => this.creatingConnection.visualPoints.push(point))
                            this.editor.flow.connections.push(this.creatingConnection)
                        }
                        else
                            this.selectedPoints = []
                    }
                }
                else if (this.selectedPoints.length > 0) {
                    // multi-connect
                    const target = points[0]
                    const targetIndex = target.node.connectionPoints.indexOf(target)

                    let selectedIndex = 0
                    const created = []
                    for (let i = targetIndex; i <= Math.min(targetIndex + this.selectedPoints.length - 1, target.node.connectionPoints.length); i++) {
                        const from = this.selectedPoints[selectedIndex]
                        const to = target.node.connectionPoints[i]

                        const connection = new this.editor.flow.connectionDefinitions[this.editor.flow.connectionPointTypes[from.type].connection](from, to)
                        connection.color = this.connectionColor
                        this.editor.flow.connections.push(connection)
                        created.push(connection)

                        selectedIndex++
                    }
                    this.addHistory('connect', created)
                    this.selectedPoints = []
                    return
                }
                else {
                    // select the point and create a dummy wire
                    this.selectedPoints = [points[0]]
                    this.creatingConnection = new (this.editor.flow.getConnectionFor(points[0]))(points[0], null)
                    this.creatingConnection.color = this.connectionColor
                    this.editor.flow.connections.push(this.creatingConnection)
                }
            }
        }
        else if (this.creatingConnection != null) {
            this.creatingConnection.visualPoints.push([
                this.position[0] * (1 / this.scale) - this.pan[0],
                this.position[1] * (1 / this.scale) - this.pan[1]
            ]) // add a point
        }
        else if (connections.length > 0 && this.selectedNodes.length == 0 && this.canConnect()) {
            const connection = connections[0]
            const subpointIndex = connection.getHoveringSubPoint(...this.position)
            if (subpointIndex != null) {
                // drag a subpoint
                this.selectedConnections = [connection]
                this.selectedSubPoints = [[connection, subpointIndex]]
            }
            else {
                // create a subpoint
                const segment = connection.getHoveringSegment(...this.position)
                this.selectedConnections = [connection]
                connection.visualPoints.splice(segment, 0, connection.getRelative(0, 0, ...this.position))
                this.selectedSubPoints = [[connection, segment]]
            }
            if (this.deleteMode.checked) {
                this.selectedConnections.forEach(c => {
                    this.editor.flow.cutConnection(c)
                })
                this.selectedConnections = []
                this.selectedSubPoints = []
            }
        }
        else if (nodes.length > 0 && this.canSelect()) { // try to select nodes
            // copy list/create new one
            let currentlySelectedNodes = [...this.selectedNodes]
            // go through each node and perform some checks depending on keys pressed
            const multiSelectEnabled = this.inputType == 'touch' || this.isKeyHeld('Shift') // always multi-select with touch
            if (!multiSelectEnabled && currentlySelectedNodes.some((node, i, a) => currentlySelectedNodes.includes(node)))
                return // nothing changed
            nodes.forEach(node => {
                const includes = currentlySelectedNodes.includes(node)
                if (includes && multiSelectEnabled) {
                    // remove
                    currentlySelectedNodes.splice(currentlySelectedNodes.indexOf(node), 1)
                }
                else if (!includes) {
                    if (multiSelectEnabled)
                        currentlySelectedNodes.push(node)
                    else
                        currentlySelectedNodes = [node]
                }
            })
            // select them
            if (!this.canSelect())
                this.selectNodes([])
            else
                this.selectNodes(currentlySelectedNodes)
            if (this.deleteMode.checked)
                this.handleDelete()
        }
        else {
            this.selectNodes([])
        }*/
    }

    handleDelete() {
        const nodes = this.editor.flow.getNodesAt(...this.position)
        const points = this.editor.flow.getConnectionPointsAt(...this.position)
        const connections = this.editor.flow.getConnectionsAt(...this.position)

        if (this.creatingConnection != null) {
            this.deselectAll()
        }
        else if (this.selectedNodes.length > 0) {
            if (!this.canSelect())
                return
            if (this.selectedNodes.some(node => nodes.includes(node))) {
                // hovering over a selected node --> delete
                const connections = this.selectedNodes
                    .flatMap(node => this.editor.flow.getConnectionsTo(node))
                    .filter((node, index, array) => array.indexOf(node) == index)
                // try to dissolve edges first
                this.selectedNodes.forEach(node => {
                    this.editor.flow.getConnectionsTo(node).forEach(con => {
                        const points = new Array(...con.points.entries().filter(p => p[1].node == node))
                        points.reverse().forEach(pi => {
                            con.getPointEdgeIndexes(pi[0]).reverse().forEach(e => con.dissolveEdge(e))
                        })
                        if (!con.isValid())
                            this.editor.flow.cutConnection(con)
                        else
                            con.cleanupPoints()
                    })
                })

                this.selectedNodes.forEach(node => this.editor.flow.removeNode(node))
                this.addHistory('delete', {nodes: this.selectedNodes, connections: connections, subpoints: []})
                this.selectNodes([])
            }
        }
        else if (connections.length > 0) {
            if (!this.canConnect())
                return
            const removedSubpoints = []
            const removedConnections = []
            connections.filter(c => c != this.creatingConnection).forEach(connection => {
                const subpoint = connection.getHoveringSubPoint(...this.position)
                const segment = connection.getHoveringSegment(...this.position)

                if (subpoint != null) {
                    // TODO: needs to check "graph connectivity"-- when point is removed, check if it splits or not
                    // if it doesn't split, it can be safely dissolved!
                    if (!connection.dissolvePoint(subpoint) || !connection.isValid()) {
                        this.editor.flow.cutConnection(connection)
                    }
                    connection.cleanupPoints()
                }
                else if (segment != null) {
                    // if a segment has 1 node point, we can just delete it and it's assosciated edges
                    // if we can't dissolve it (invalid disconnect edge), just delete it all anyway!
                    if (!connection.dissolveEdge(segment) || !connection.isValid()) {
                        this.editor.flow.cutConnection(connection)
                    }
                    connection.cleanupPoints()
                }
                this.deselectAll()
                /*if (subpoint != null) {
                    const deleted = connection.visualPoints.splice(subpoint, 1)[0]
                    removedSubpoints.push([connection, subpoint, deleted]) // conn, index, pos
                }
                else {
                    connection.points.filter(p => p.type == "input").forEach(p => {
                        p.node.invalidatePoint(p.id)
                    })
                    this.editor.flow.cutConnection(connection)
                    removedConnections.push(connection)
                }*/
            })
            this.addHistory('delete', {
                nodes: [],
                connections: removedConnections,
                subpoints: removedSubpoints
            })
            this.selectedSubPoints = []
            this.selectedConnections = []
            this.selectNodes([])
        }
        this.handleSubflowDelete()
    }

    handleRotate() {
        const nodes = this.selectedNodes
        // find center
        var center = [0, 0]
        nodes.forEach(node => {
            const size = node.getSize()
            node._offset = [ // calculate translation to center
                (node.rotation % 180 == 0 ? (size[0] / 2) : (size[1] / 2)),
                (node.rotation % 180 == 0 ? (size[1] / 2) : (size[0] / 2))
            ]
            center = [
                center[0] + node.position[0] + node._offset[0],
                center[1] + node.position[1] + node._offset[1]
            ]
        })
        center = [center[0] / nodes.length, center[1] / nodes.length]

        // move around center
        const rad = Math.PI / 2
        nodes.forEach(node => {
            const cx = node.position[0] + node._offset[0] - center[0]
            const cy = node.position[1] + node._offset[1] - center[1]
            const nx = cx * Math.cos(rad) - cy * Math.sin(rad)
            const ny = cx * Math.sin(rad) + cy * Math.cos(rad)
            node.position[0] = nx + center[0] - node._offset[0]
            node.position[1] = ny + center[1] - node._offset[1]
        })

        // "rotate"
        nodes.forEach(node => {
            node._offset = null // we don't need it anymore
            node.rotation = (node.rotation + 90) % 360
            node.invalidate()
        })
    }

    handleClone() {
        const nodes = this.editor.flow.getNodesAt(...this.position)
        const points = this.editor.flow.getConnectionPointsAt(...this.position)
        const connections = this.editor.flow.getConnectionsAt(...this.position)

        const OFFSET = [25, 25]

        if (this.selectedNodes.length > 0) { // clone nodes
            if (!this.canSelect())
                return
            const duplicates = []

            for (var node of this.selectedNodes) {
                const dupe = new this.editor.flow.nodeDefinitions[node.id]()
                dupe.flow = this.editor.main_flow
                dupe.subflow = this.editor.flow
                dupe.deserialize(JSON.parse(JSON.stringify(node.serialize())))
                dupe.position = addV2(dupe.position, OFFSET)
                dupe.needsConnectionUpdate = true // fix bug attempt
                this.editor.flow.nodes.push(dupe)
                duplicates.push([dupe, node])
            }

            const connections = this.selectedNodes
                .flatMap(node => this.editor.flow.getConnectionsTo(node))
                .filter((node, index, array) => array.indexOf(node) == index)
            console.log(connections)
            connections.forEach(connection => {
                const duplicate = new this.editor.flow.connectionDefinitions[connection.id]()

                duplicate.edges = connection.edges.map(e => [e[0], e[1]]) // make new refs
                
                duplicate.points = connection.points.map((p, i) => {
                    if (p.node != null) {
                        // node ref
                        return duplicates.find(nodes => (nodes[1] == p.node))?.[0].getConnectionPoint(p.id) ?? p.node.getConnectionPoint(p.id)
                    }
                    else {
                        // vp ref
                        return {
                            'position': addV2(p.position, OFFSET)
                        }
                    }
                })
                duplicate.color = connection.color
                this.editor.flow.connections.push(duplicate)

                /*const nodeA = duplicates.find(nodes => (nodes[1] == connection.points[0].node)) ?? [connection.points[0].node]
                const nodeB = duplicates.find(nodes => (nodes[1] == connection.points[1].node)) ?? [connection.points[1].node]
                const dupec = new this.editor.flow.connectionDefinitions[connection.id](
                    nodeA[0].getConnectionPoint(connection.points[0].id),
                    nodeB[0].getConnectionPoint(connection.points[1].id),
                )
                dupec.color = connection.color
                for (let i = 0; i < connection.visualPoints.length; i++) {
                    dupec.addPoint(connection.visualPoints[i][0] + 25, connection.visualPoints[i][1] + 25)
                }
                this.editor.flow.connections.push(dupec)*/
            })
            this.selectNodes(duplicates.map(d => d[0]))
        }
        else if (connections.length > 0 && this.creatingConnection == null) {
            if (!this.canConnect())
                return
            const connection = connections[0]
            const subpoint = connection.getHoveringSubPoint(...this.position)
            const segment = connection.getHoveringSegment(...this.position)
            if (subpoint != null) {
                this.deselectAll()
                this.creatingConnection = connection
                this.creatingConnectionPointIndex = subpoint
            }
            else if (segment != null) {
                this.deselectAll()
                // project onto line
                const edge = connection.getEdge(segment)
                const a = connection.getPointPosition(edge[0])
                const b = connection.getPointPosition(edge[1])
                const pos = this.projectOntoLine(a, b, this.getSnapFor(this.screenToFlow(this.position), null, false))

                connection.deleteEdge(segment)
                const pointIndex = connection.addPoint(...pos)
                connection.addEdge(edge[0], pointIndex)
                connection.addEdge(pointIndex, edge[1])
                this.creatingConnection = connection
                this.creatingConnectionPointIndex = pointIndex
            }
            /*this.addHistory('', {
                
            })*/
        }
    }

    handleHover() {
        const nodes = this.editor.flow.getNodesAt(...this.position)
        const points = this.editor.flow.getConnectionPointsAt(...this.position)
        const connections = this.editor.flow.getConnectionsAt(...this.position)//.filter(c => c != this.creatingConnection)

        this.hoveredNode = nodes[0]
        this.hoveredPoint = points[0]
        this.hoveredConnection = connections[0]
        this.hoveredSubPoint = this.hoveredConnection?.getHoveringSubPoint(...this.position)
        if (this.creatingConnection && this.hoveredSubPoint == this.creatingConnectionPointIndex) {
            this.hoveredConnection = null // prevent snapping/connecting inf to yourself
        }
    }

    projectOntoLine(a, b, pos) { // project point pos onto a->b
        const dir = subV2(b, a)
        // well this is fun
        let dist = Math.pow(dir[0], 2) + Math.pow(dir[1], 2)
        if (dist === 0)
            dist = 1
        const t = ((pos[0] - a[0]) * (dir[0]) + (pos[1] - a[1]) * (dir[1])) / dist
        return [a[0] + t * dir[0], a[1] + t * dir[1]]
    }

    getSnapFor(pos, lastPos, pushSnappingLines) {
        let snaps = [] // [snap axis, target point, dif (sorting), source point]
        const snapSubpoints = this.settings.getValue('subpoint snapped connections')
        const snapSegments = this.settings.getValue('segment snapped connections')
        const snapPoints = this.settings.getValue('point snapped connections')
        const snapLocal = this.settings.getValue('local snapped connections')
        const isSnapping = this.isKeybindHeld('snap')
        if (isSnapping) {
            if (snapPoints) {
                this.editor.flow.nodes.forEach(node => {
                    node.connectionPoints.forEach(cp => {
                        const cp_pos = addV2(node.position, cp.position)
                        const dif = absV2(subV2(cp_pos, pos))
                        if (dif[0] < 10 || dif[1] < 10) {
                            // this.selectedPoints.push(cp)
                            if (dif[0] < dif[1]) {
                                snaps.push([[1, 0], cp_pos, dif, cp_pos])
                            }
                            else {
                                snaps.push([[0, 1], cp_pos, dif, cp_pos])
                            }
                        }
                    })
                })
            }
            if (snapSubpoints || snapSegments) {
                this.editor.flow.connections.forEach(con => {
                    if (snapSubpoints)
                        con.points.forEach((p, i) => {
                            if (p.node)
                                return // ignore nodes, we already do those above! (and they shouldn't require a connection to pre-exist)
                            if (con == this.creatingConnection && (this.creatingConnectionPointIndex == null || con == this.creatingConnectionPointIndex))
                                return // ignore self since we check that later! (local snapped connections)
                            const cp_pos = con.getPointPosition(i)
                            const dif = absV2(subV2(cp_pos, pos))
                            if (dif[0] < 5 || dif[1] < 5) {
                                // this.selectedPoints.push(cp)
                                if (dif[0] < dif[1]) {
                                    snaps.push([[1, 0], cp_pos, dif, cp_pos])
                                }
                                else {
                                    snaps.push([[0, 1], cp_pos, dif, cp_pos])
                                }
                            }
                        })
                    if (snapSegments) {
                        const segment = con.getHoveringSegment(...this.flowToScreen(...pos))
                        if (segment != null && this.creatingConnection != null && this.creatingConnectionPointIndex != null) {
                            const edge = con.getEdge(segment) // [index, index]
                            if (con == this.creatingConnection && edge.includes(this.creatingConnectionPointIndex))
                                return // ignore segment if the point is already on it-- it would be parallel uselessness

                            const a = con.getPointPosition(edge[0]) // [x, y]
                            const b = con.getPointPosition(edge[1])
                            const p = this.projectOntoLine(a, b, pos)
                            snaps.push([[1, 1], p, [0, 0], a]) // axis is [1, 1] because it influences both x and y
                        }
                    }
                })
            }
        }
        if (snapPoints && isSnapping) {
            // this.selectedPoints = [] // this visualization is very fun to mess with
            
            snaps.sort((a, b) => (a[0][0]) * (a[2][0] - b[2][0]) + (a[0][1]) * (a[2][1] - b[2][1]) )//distV2(subV2(a[1], pos)) - distV2(subV2(b[1], pos)))
        }

        const snapped_pos = [pos[0], pos[1]]
        const DIST = Math.PI / 32 // Math.PI / 36 // 5 deg

        if (lastPos != null && snapLocal && isSnapping) {
            // snap from last pos
            const sub = subV2(snapped_pos, lastPos)
            let angleOffset = Math.atan2(sub[1], sub[0])
            if (angleOffset < 0)
                angleOffset += Math.PI * 2
            //console.clear()
            const ang = Math.abs(angleOffset % (Math.PI / 2))
            if (Math.PI / 2 - DIST < ang || ang < DIST) {
                const dif = absV2(subV2(snapped_pos, lastPos))
                if (dif[0] < dif[1]) {
                    snaps.push([[1, 0], lastPos, dif, lastPos])
                }
                else {
                    snaps.push([[0, 1], lastPos, dif, lastPos])
                }
            }
        }

        // sort snaps
        if (snaps.length > 0) {
            const axis = [0, 0]
            snaps = snaps.filter(snap => {
                // check if axis has been added yet
                if (snap[0].some((v, i) => v > 0 && axis[i] > 0))
                    return false
                snap[0].forEach((v, i) => axis[i] = v > 0 ? v : axis[i])
                return true
            })
        }
        
        // snap to grid
        if (this.settings.getValue('grid snapped connections') && isSnapping) {
            const increment = this.settings.getValue('grid increment')
            snapped_pos[0] = Math.round(snapped_pos[0] / (this.gridSize * increment)) * (this.gridSize * increment)
            snapped_pos[1] = Math.round(snapped_pos[1] / (this.gridSize * increment)) * (this.gridSize * increment)
        }

        // snap to point
        if (pushSnappingLines)
            this.snappingLines = []
        if (snaps.length > 0) { // assignment already checks keybind & setting!
            snaps.forEach(snap => {
                snapped_pos[0] = /*snap[1][0]*/snapped_pos[0] * (1 - Math.floor(snap[0][0])) + Math.ceil(snap[0][0]) * snap[1][0]
                snapped_pos[1] = /*snap[1][1]*/snapped_pos[1] * (1 - Math.floor(snap[0][1])) + Math.ceil(snap[0][1]) * snap[1][1]
                if (pushSnappingLines)
                    this.snappingLines.push([snap[3], snapped_pos]) // from, to
            })
        }
        return snapped_pos
    }

    handleCreating() {
        if (this.creatingConnection == null || this.creatingConnectionPointIndex == null)
            return
        const current = this.screenToFlow(...this.position)
        const snapped = this.getSnapFor(
            current,
            this.creatingConnection.getPointPosition(this.creatingConnectionPointIndex),
            true
        )

        if (this.hoveredPoint != null /* && this.editor.flow.canConnectTo(this.creatingConnection.a, this.hoveredPoint)*/)
            this.creatingConnection.fakeEdge = [this.creatingConnectionPointIndex, this.hoveredPoint]//this.creatingConnection.b = this.hoveredPoint
        else if (this.hoveredSubPoint != null && this.hoveredConnection) { // TODO: check canConnectTo
            this.creatingConnection.fakeEdge = [this.creatingConnectionPointIndex, {
                'position': [
                    this.hoveredConnection.points[this.hoveredSubPoint].position[0],//this.position[0] * (1 / this.scale) - this.pan[0],
                    this.hoveredConnection.points[this.hoveredSubPoint].position[1]//this.position[1] * (1 / this.scale) - this.pan[1]
                ]
            }]
        }
        else {
            this.creatingConnection.fakeEdge = [this.creatingConnectionPointIndex, {
                'position': snapped
            }]
        }
    }

    screenToFlow(x, y) {
        if (y == null) {
            y = x[1]
            x = x[0]
        }
        return [
            x * (1 / this.scale) - this.pan[0],
            y * (1 / this.scale) - this.pan[1],
        ]
    }

    flowToScreen(x, y) {
        if (y == null) {
            y = x[1]
            x = x[0]
        }
        return [
            (x + this.pan[0]) * this.scale,
            (y + this.pan[1]) * this.scale,
        ]
    }

    handleLasso() {
        if (!this.canSelect()) {
            this.selectionStart = null
            return
        }
        const minX = Math.min(this.selectionStart[0], this.position[0]) * (1 / this.scale)
        const maxX = Math.max(this.selectionStart[0], this.position[0]) * (1 / this.scale)
        const minY = Math.min(this.selectionStart[1], this.position[1]) * (1 / this.scale)
        const maxY = Math.max(this.selectionStart[1], this.position[1]) * (1 / this.scale)

        const nodes = this.editor.flow.nodes.filter(node => {
            //const a = node.getRelative(minX, minY)
            //const b = node.getRelative(maxX, maxY)
            const pos = node.getRelative(0, 0)
            pos[0] *= -1
            pos[1] *= -1
            const nodeSize = node.getSize()
            const size = node.rotation % 180 == 0 ? nodeSize : [nodeSize[1], nodeSize[0]]
            const pos2 = [pos[0] + size[0], pos[1] + size[1]]
            //console.log(a, b)
            return pos[0] < maxX && pos2[0] > minX && pos[1] < maxY && pos2[1] > minY
            //a[0] <= 0 && a[1] <= 0 && b[0] >= 0 && b[1] >= 0
        })
        if (this.isKeyHeld('Shift')) {
            const newNodes = [...this.selectedNodes]
            nodes.forEach(node => {
                if (newNodes.includes(node))
                    newNodes.splice(newNodes.indexOf(node), 1)
                else
                    newNodes.push(node)
            })
            this.selectNodes(newNodes)
        }
        else {
            this.selectNodes(nodes)
        }

        this.selectionStart = null
    }

    handleNodeInputs() {
        for (const node of this.editor.flow.nodes) {
            if (!this.selectedNodes.includes(node) && node.sinkInput())
                return true
        }
        return false
    }

    updateInputs() {
        if (this.selectionStart == null && this.wasKeybindPressed('select')) {
            if (this.handleNodeInputs())
                return // sink
            this.handleSelect()
        }
        if (this.isKeybindHeld('delete')) {
            this.handleDelete()
        }
        if (this.isKeybindHeld('rotate')) {
            this.handleRotate()
        }
        if (this.isKeybindHeld('clone') || this.connectMode.checked) {
            this.handleClone()
        }
        if (this.selectionStart != null && (!this.isKeybindHeld('lasso') || !this.isKeybindHeld('select'))) {
            this.handleLasso()
        }

        if (this.creatingNode != null && !this.isKeybindHeld('move') && this.inputType != 'touch') {
            this.selectNodes([])
            this.editor.flow.removeNode(this.creatingNode)
            this.creatingNode = null
        }
        this.handleCreating()
    }

    /**
     * @param {PointerEvent} event 
     */
    onPointerDown = (event) => {
        this.inputType = event.pointerType
        this.position = [event.offsetX, event.offsetY]

        this.primaryPressed = (event.buttons & 1) != 0
        this.secondaryPressed = (event.buttons & 2) != 0

        this.keybinds.onPointerDown(event)
        this.updateCursor()
        this.updateInputs()
    }

    /**
     * @param {PointerEvent} event 
     */
    onGlobalPointerDown = (event) => {
        this.keybinds.onPointerDown(event)
        this.updateCursor()
    }

    handleMove() {
        this.handleHover()
        if (this.isKeybindHeld('pan') || (this.selectedNodes.length == 0 && this.inputType == 'touch')) {
            this.handlePan()
        }
        if (this.isKeybindHeld('move') && this.selectionStart == null) {
            this.handleDrag()
        }
        else {
            this.isDragging = false
            if (this.selectedSubPoints.length > 0 && this.creatingConnection != null) {
                this.creatingConnection.cleanupPoints()
                this.creatingConnection = null
            }
            this.selectedConnections = []
            this.selectedSubPoints = []
            this.snappingLines = []
        }
        this.handleCreating()
    }

    /**
     * @param {PointerEvent} event 
     */
    onPointerMove = (event) => {
        if (event.pointerType == 'touch')
            return
        this.positionDelta = [event.offsetX - this.position[0], event.offsetY - this.position[1]]
        this.position = [event.offsetX, event.offsetY]
        this.handleMove()
    }

    onTouchStart = (event) => {
        this.onTouchMove(event)
    }

    onTouchMove = (event) => {
        const touches = event.touches
        this.positionDelta = [touches.item(0).clientX - (this.canSelect() ? 200 : 0) - this.position[0], touches.item(0).clientY - 50 - this.position[1]]
        this.position = [touches.item(0).clientX - (this.canSelect() ? 200 : 0), touches.item(0).clientY - 50]

        this.handleHover()

        if (touches.length == 1) {
            if ((this.selectedNodes.length > 0 || this.selectedConnections.length > 0 || this.selectedSubPoints.length > 0) && (this.creatingConnection == null))
                this.handleDrag()
            else
                this.handlePan()
            this.handleCreating()
        }

        if (touches.length != 2)
            return

        const distance = Math.sqrt(Math.pow(touches.item(0).screenX - touches.item(1).screenX, 2) + Math.pow(touches.item(0).screenY - touches.item(1).screenY, 2))
        const difference = distance - this.lastPinchDistance
        const xOffset = this.canSelect() ? 200 : 0
        if (this.lastPinchDistance != null)
            this.zoomOn(-difference, [(touches.item(0).clientX - xOffset + touches.item(1).clientX - xOffset) / 2, (touches.item(0).clientY - 50 + touches.item(1).clientY - 50) / 2], Math.abs(difference) * 5)
        this.lastPinchDistance = distance
    }

    onTouchEnd = (event) => {
        this.lastPinchDistance = null
    }

    onTouchDelete = (event) => {
        if (!this.canSelect())
            return
        if (event.clientX > 200) {
            return
        }
        if (this.selectedNodes.length > 0 && this.creatingNode == null) {
            const connections = this.selectedNodes
                        .flatMap(node => this.editor.flow.getConnectionsTo(node))
                        .filter((node, index, array) => array.indexOf(node) == index)
            this.selectedNodes.forEach(node => this.editor.flow.removeNode(node))
            this.addHistory('delete', {nodes: this.selectedNodes, connections: connections, subpoints: []})
            this.selectNodes([])
        }
        if (this.selectedConnections.length > 0) {
            const removedSubpoints = []
            const removedConnections = []
            this.selectedConnections.filter(c => c != this.creatingConnection).forEach(connection => {
                const subpoint = connection.getHoveringSubPoint(...this.position)
                if (subpoint != null) {
                    const deleted = connection.visualPoints.splice(subpoint, 1)[0]
                    removedSubpoints.push([connection, subpoint, deleted]) // conn, index, pos
                }
                else {
                    this.editor.flow.cutConnection(connection)
                    removedConnections.push(connection)
                }
            })
            this.addHistory('delete', {
                nodes: [],
                connections: removedConnections,
                subpoints: removedSubpoints
            })
            this.selectedConnections = []
            this.selectedPoints = []
            this.selectedSubPoints = []
        }
        this.handleSubflowDelete()
    }

    handleSubflowDelete() {
        if (!this.editor.main_flow.subflows.includes(this.editor.flow)) {
            // isn't subflow
            return
        }
        const sf = this.editor.flow

        if (sf.nodes.length != 0) {
            return // isn't deleted
        }
        const index = this.editor.main_flow.subflows.indexOf(this.editor.flow)
        console.warn('DELETING SUBFLOW AT', index)
        this.changeFlows(this.editor.main_flow)
        const fix_flow = (flow) => {
            flow.nodes.filter(n => n.id == 'subflow_node' && n.subflow_index >= index).forEach(n => {
                if (n.subflow_index == index)
                    n.reset()
                else {
                    console.log('MOVE', n, 'BACK')
                    n.subflow_index -= 1
                    //n.refresh() // don't need to re-reference
                }
            })
        }
        fix_flow(this.editor.main_flow)
        this.editor.main_flow.subflows.forEach(fix_flow)
        
        this.editor.main_flow.subflows.splice(index, 1)
    }

    changeFlows(newFlow) {
        this.editor.flow.revise()
        this.editor.flow.editorState = this.serialize()
        this.editor.flow = newFlow
        this.deserialize(newFlow.editorState)
        this.refreshSidebar()
        this.selectNodes([])
    }

    /**
     * @param {PointerEvent} event 
     */
    onPointerUp = (event) => {
        this.primaryPressed = false
        this.secondaryPressed = false

        this.keybinds.onPointerUp(event)
        this.updateCursor()
        this.updateInputs()
    }

    /**
     * @param {PointerEvent} event 
     */
    onPointerEnter = (event) => {

    }

    /**
     * @param {PointerEvent} event 
     */
    onPointerLeave = (event) => {

    }

    /**
     * @param {KeyboardEvent} event 
     */
    onKeyDown = (event) => {
        if (event.repeat)
            return
        /*if (event.code.toLocaleLowerCase() == 'keyt') {
            const activeFlow = this.editor.flow
            console.log('active:')
            if (activeFlow == this.editor.flow1) {
                this.editor.flow = this.editor.flow2
                console.log('swap to 2')
            }
            else {
                this.editor.flow = this.editor.flow1
                console.log('swap to 1')
            }
        }*/
        this.keybinds.onKeyDown(event)
        if (!this.heldKeys.includes(event.code.toLowerCase()))
            this.heldKeys.push(event.code.toLowerCase())
        if (event.shiftKey && !this.heldKeys.includes('Shift'))
            this.heldKeys.push('Shift')
        if (event.ctrlKey && !this.heldKeys.includes('Control'))
            this.heldKeys.push('Control')
        if (event.altKey && !this.heldKeys.includes('Alt'))
            this.heldKeys.push('Alt')

        if (event.code.toLowerCase() == 'keyz' && event.ctrlKey) {
            this.handleUndo()
        }

        this.updateCursor()
        this.updateInputs()
    }

    /**
     * @param {KeyboardEvent} event 
     */
    onKeyUp = (event) => {
        this.keybinds.onKeyUp(event)
        if (this.heldKeys.includes(event.code.toLowerCase()))
            this.heldKeys.splice(this.heldKeys.indexOf(event.code.toLowerCase()), 1)
        if (!event.shiftKey && this.heldKeys.includes('Shift'))
            this.heldKeys.splice(this.heldKeys.indexOf('Shift'), 1)
        if (!event.ctrlKey && this.heldKeys.includes('Control'))
            this.heldKeys.splice(this.heldKeys.indexOf('Control'), 1)
        if (!event.altKey && this.heldKeys.includes('Alt'))
            this.heldKeys.splice(this.heldKeys.indexOf('Alt'), 1)

        this.updateCursor()
        this.updateInputs()
    }

    zoomOn(dir, position, amplitude=100) {
        const direction = Math.sign(dir)
        const lastScale = this.scale
        this.scale *= 1 - (direction * amplitude) / 1000
        if (this.scale <= 0.01)
            this.scale = .01

        const lastMouse = [position[0] / lastScale, position[1] / lastScale]
        const newMouse = [position[0] / this.scale, position[1] / this.scale]
        this.pan[0] += newMouse[0] - lastMouse[0]
        this.pan[1] += newMouse[1] - lastMouse[1]
    }

    /**
     * @param {WheelEvent} event 
     */
    onWheel = (event) => {
        this.zoomOn(event.deltaY, this.position)
    }

    /**
     * @param {FocusEvent} event 
     */
    onBlur = (event) => {
        this.keybinds.releaseAll()
        this.heldKeys = []
    }

    onSearchChanged = () => {
        const text = this.searchBox.value
        const term = text.length == 0 ? null : text
        this.itemCategories.forEach(category => category.search(term))
    }

    handleCreate = (node) => {
        if (this.creatingNode != null) {
            this.selectNodes([])
            this.editor.flow.removeNode(this.creatingNode)
            this.creatingNode = null
            return
        }
        this.creatingNode = new node()
        this.creatingNode.flow = this.editor.main_flow
        this.creatingNode.subflow = this.editor.flow
        this.creatingNode.position[0] = -100000000000
        this.editor.flow.nodes.push(this.creatingNode)
        this.selectNodes([this.creatingNode])
    }

    onFlowLoad = () => {
        //console.warn('onFlowLoad')
        const sidebar = document.querySelector('#sidebar')
        const flow = this.editor.flow

        while (sidebar.firstChild)
            sidebar.removeChild(sidebar.lastChild)

        const search = document.createElement('div')
        const searchBox = document.createElement('input')
        this.searchBox = searchBox
        searchBox.addEventListener('input', () => this.onSearchChanged())
        this.itemCategories = []

        searchBox.type = 'search'
        searchBox.autocapitalize = 'no'
        searchBox.autocomplete = 'no'
        searchBox.placeholder = 'Search...'

        search.classList.add('category')
        search.appendChild(searchBox)
        sidebar.appendChild(search)
        
        const categories = Object.values(flow.nodeDefinitions)
            .map(nd => nd.category)
            .filter((val, ind, arr) => arr.indexOf(val) == ind)
            .sort((a, b) => a.localeCompare(b))

        const bind = this.keybinds.get('move')
        categories.forEach(cat => {

            const nodes = Object.values(flow.nodeDefinitions)
                .filter(nd => nd.category == cat)
                .sort((a, b) => a.display.localeCompare(b.display))

            this.itemCategories.push(new NodeCategory(sidebar, cat, nodes.map(n => {
                n.icon = this.parsePath(n.icon)
                return n
            }), this, bind, this.handleCreate))
        })
        //this.testMake()
        this.refreshSidebar()
    }

    refreshSidebar() {
        this.itemCategories.forEach(category => {
            category.children.forEach(child => {
                if (child[2] !== undefined) {
                    category.toggleChild(child, child[2](this))
                }
            })
        })
    }

    testMake() {
        /*const subflow = this.editor.flow.subflows[0]
        subflow.loadFrom(this.editor.flow)
        subflow.deserialize({
            
        })*/

        this.editor.load({
            flow: 'oaklands',
            subflows: [
                {
                    name: 'test',
                    nodes: [
                        {
                            position: [
                                500, 500
                            ],
                            rotation: 0,
                            id: 'subflow_input'
                        },
                        {
                            position: [
                                1000, 500
                            ],
                            rotation: 0,
                            id: 'subflow_output'
                        }
                    ],
                    connections: [
                        {
                            points: [
                                {
                                    "node": 0,
                                    "id": "#output"
                                },
                                {
                                    "node": 1,
                                    "id": "#input"
                                }
                            ],
                            visualPoints: [],
                            color: '#ea3030',
                            id: 'wire'
                        }
                    ]
                }
            ],
            nodes: [
                {
                    position: [300, 300],
                    id: 'button'
                },
                {
                    position: [500, 300],
                    id: 'subflow_node',
                    subflow: 0
                },
                {
                    position: [700, 300],
                    id: 'lcd'
                },
            ],
            connections: [
                {
                    points: [
                        {
                            'node': 0,
                            'id': '#pressed'
                        },
                        {
                            'node': 1,
                            'id': '#in1'
                        }
                    ],
                    visualPoints: [],
                    color: '#ea3030',
                    id: 'wire'
                },
                {
                    points: [
                        {
                            'node': 1,
                            'id': '#out1'
                        },
                        {
                            'node': 2,
                            'id': '#color'
                        }
                    ],
                    visualPoints: [],
                    color: '#ea3030',
                    id: 'wire'
                },
            ]
        })
    }

    parsePath(path) {
        const flow = this.editor.flow
        return path.replace('$assets', `../../flows/${flow.id}/assets`)
    }

    /**
     * @param {boolean} download 
     */
    handleSave = (download) => {
        const data = this.editor.save()
        if (download) {
            const blob = new Blob([data], {type: 'text/plain'})
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${this.fileNameArea.value.length > 0 ? this.fileNameArea.value : "Unnamed Flow"}.flow`
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(url)
        }
        else {
            if (data.length >= 8000) {
                showInfoModal('flow too big', 'The flow is too big to fit in the url, so you MUST download it instead!')
            }
            else {
                const url = new URL(location.href)
                history.pushState(null, '', `${url.origin}${url.pathname}?share=${data}`)
                //document.querySelector('#share-input').showModal()
                showInfoModal('saved', 'The flow has been saved to the page\'s URL.\nTo share it, copy it and send it wherever you so desire... it\'s pretty long though!')
            }
        }
    }

    setConnectionColor = (color) => {
        this.connectionColor = color
        if (this.creatingConnection != null) {
            this.creatingConnection.color = color
        }
    }

    /**
     * @param {HTMLCanvasElement} canvas 
     */
    hook(editor) {
        window.state = this
        this.editor = editor
        editor.flow.onload = this.onFlowLoad
        const canvas = editor.canvas
        this.canvas = canvas
        document.oncontextmenu = e => {
            if (!e.target?.search?.includes('share'))
                e.preventDefault() // prevent save image/etc from popping up
                // (except with share link)
        }
        canvas.addEventListener('pointerdown', this.onPointerDown)
        document.addEventListener('pointerdown', this.onGlobalPointerDown)
        document.addEventListener('pointerup', this.onPointerUp)
        canvas.addEventListener('pointermove', this.onPointerMove)
        canvas.addEventListener('touchstart', this.onTouchStart)
        canvas.addEventListener('touchmove', this.onTouchMove)
        canvas.addEventListener('touchend', this.onTouchEnd)
        document.addEventListener('keydown', this.onKeyDown)
        document.addEventListener('keyup', this.onKeyUp)
        canvas.addEventListener('wheel', this.onWheel)
        window.addEventListener('blur', this.onBlur)

        document.querySelector('#mobile-duplicate').addEventListener('click', () => {
            this.handleClone()
        })

        const sidebar = document.querySelector('#sidebar')
        document.addEventListener('pointerup', this.onTouchDelete)

        this.deleteMode = document.querySelector('#mode-delete')
        this.connectMode = document.querySelector('#mode-clone')
        const connectModeLabel = this.connectMode.parentElement
        connectModeLabel.style = 'display: none !important;'

        //this.interactionModeCheckbox = document.getElementById('interaction-mode')
        this.mode = document.querySelector('#mode-select')

        const content = document.querySelector('#content')
        this.mode.addEventListener('input', () => {
            this.connectMode.checked = false
            connectModeLabel.style = this.mode.value == 'connect' ? '' : 'display: none !important;'
            content.classList.toggle('sidebar-minimized', !['all', 'organize'].includes(this.mode.value))
        })

        this.fileNameArea = document.querySelector('#file-name')
        this.fileNameArea.addEventListener('input', () => {
            if (!this.fileNameArea.value.includes('\n')) {
                return
            }
            this.fileNameArea.value = this.fileNameArea.value.replace('\n', '')
            this.fileNameArea.blur() // deselect
        })

        const connectionColorInput = document.querySelector('#connection-color')
        document.querySelector('#connection-colors').querySelectorAll('div > div').forEach(div => {
            const value = div.getAttribute('value')
            if (value == null)
                return
            div.style.background = value
            div.addEventListener('pointerover', () => {
                this.hoveredConnectionColor = value
            })
            div.addEventListener('pointerleave', () => {
                if (this.hoveredConnectionColor == value)
                    this.hoveredConnectionColor = null
            })
            function set(state) {
                connectionColorInput.value = value
                state.setConnectionColor(value)
            }
            div.addEventListener('click', () => set(this))
            if (this.connectionColor == null) {
                set(this)
            }
        })
        connectionColorInput.onchange = () => {
            this.setConnectionColor(connectionColorInput.value)
        }

        const handleButton = (id, handler) => {
            const btn = document.querySelector(`#${id}`)
            btn.addEventListener('pointerup', e => {
                if (btn.hasAttribute('disabled'))
                    return
                handler(e)
            })
        }

        const fileUpload = document.querySelector('#file')
        handleButton('upload', () => fileUpload.click())
        {
            fileUpload.addEventListener('change', () => {
                if (fileUpload.files.length) {
                    this.fileNameArea.value = fileUpload.files[0].name.replace(/\.flow$/g, '')
                    fileUpload.files[0].text().then(data => {
                        this.editor.load(data)
                    })
                    fileUpload.value = null
                }
            })
        }

        handleButton('download', () => this.handleSave(true))
        handleButton('save', () => setTimeout(() => this.handleSave(false), 100))
        handleButton('share', async () => {
            const data = this.editor.save(false)
            data['thumbnail'] = this.canvas.toDataURL('image/jpeg')
            const code = await fetch(this.editor.share_server + 'upload', { // ?upload_code=5
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            if (code.ok) {
                const codes = await code.json()
                const url = new URL(location.href)
                const loc = `${url.origin}${url.pathname}?share=${codes.code}`
                showInfoModal('shared', `Flow has been saved to <a href=${loc} target="_blank">${loc}</a>.<br />Data retention is <b>NOT</b> guarenteed so do not use this for saving your flows!`, true)
            }
            else {
                console.error(code)
                showInfoModal('failed to share', 'Could not share, please try again/later.')
            }
        })

        const exampleDialog = document.querySelector('#example-dialog')
        handleButton('examples', () => exampleDialog.showModal())
        {
            exampleDialog.addEventListener('close', () => {
                const value = exampleDialog.returnValue

                if (value != '#close') {
                    const url = new URL(location.href)
                    history.pushState(null, '', `${url.origin}${url.pathname}?example=${value}&flow=${this.editor.flow.id}`)
                    location.reload()
                }
            })
        }

        const summaryDialog = document.querySelector('#summary-notice')
        const summaryNodes = document.querySelector('#summary-nodes')
        const summaryConnections = document.querySelector('#summary-connections')
        handleButton('summary', () => {
            summaryNodes.innerHTML = Object.entries(this.editor.flow.nodes.map(n => n.display).reduce((prev, cur) => {
                prev[cur] = prev[cur] ?? 0
                prev[cur] += 1
                return prev
            }, {})).sort((a, b) => b[1] - a[1]).map((v, i) => `x${v[1]} ${v[0]}`).join('<br />')
            summaryConnections.innerHTML = Object.entries(this.editor.flow.connections.map(n => n.display).reduce((prev, cur) => {
                prev[cur] = prev[cur] ?? 0
                prev[cur] += 1
                return prev
            }, {})).sort((a, b) => b[1] - a[1]).map((v, i) => `x${v[1]} ${v[0]}`).join('<br />')
            summaryDialog.showModal()
        })

        const helpDialog = document.querySelector('#help-dialog')
        handleButton('help', () => helpDialog.showModal())
        {
            if (localStorage != null && localStorage.getItem('visited') == null) {
                localStorage.setItem('visited', Date.now())
                helpDialog.showModal()
            }
        }

        const settingsMenu = document.querySelector('#settings-dialog')
        handleButton('settings', () => settingsMenu.showModal())
        {
            this.keybinds.load()
        }

        handleButton('fullscreen', () => {
            if (document.fullscreenElement == document.body) {
                document.exitFullscreen()
            }
            else {
                document.body.requestFullscreen()
            }
        })

        const list = document.querySelector('#buttons-list')
        handleButton('hamburger', () => list.classList.toggle('opened', !list.classList.contains('opened')))

        // // other // //

        // edit button toggle arrow thingy
        var editToggled = true
        const editToggle = document.querySelector('#edit-toggle')
        const editOptions = document.querySelector('#edit-options')
        editToggle.addEventListener('click', () => {
            editToggled = !editToggled
            editToggle.innerText = editToggled ? '<' : '>'
            editOptions.classList.toggle('hidden', !editToggled)
        })
        
        // profiler
        // bounds: [x, width, y]
        const colors = ['red', 'green', 'blue', 'orange']
        /**
         * 
         * @param {Array} bounds 
         * @param {Array} layer Array of timings
         * @param {CanvasRenderingContext2D} ctx 
         */
        function drawLayer(bounds, layer, ctx, averages) {
            ctx.strokeStyle = 'gray'
            ctx.lineWidth = 5
            const total = layer.length
            const from = layer[0].at
            const duration = layer[total - 1].done - from
            //console.log('layer', bounds, from, duration)
            for (let i = 0; i < total; i++) {
                ctx.fillStyle = colors[i % 4]
                const segment = layer[i]
                const x1Percent = duration <= 0 ? 0 : (segment.at - from) / duration
                const x2Percent = duration <= 0 ? 1 : (segment.done - from) / duration
                const widthPercent = x2Percent - x1Percent
                const x = bounds[0] + bounds[1] * x1Percent
                const y = bounds[2]
                const width = bounds[1] * widthPercent
                //console.log(segment, x1Percent, x2Percent)
                ctx.fillRect(x, y, width, 50)
                ctx.strokeRect(x, y, width, 50)
                ctx.fillStyle = 'white'
                ctx.font = '30px monospace'
                ctx.textBaseline = 'middle'
                ctx.fillText(segment.display, x + 5, y + 50 / 2)
                if (segment.timings.length > 0) {
                    drawLayer([x, width, y + 50], segment.timings, ctx, averages)
                }
                else {
                    averages[segment.display] = (averages[segment.display] ?? 0) + (segment.done - segment.at)
                }
            }
        }

        const profilerDialog = document.querySelector('#profiler-dialog')
        const profilerCanvas = document.querySelector('#profiler-canvas')
        const profilerRadios = document.querySelectorAll('.profiler-radio')
        const profilerRadioUpdate = document.querySelector('#profiler-radio-update')
        const profilerLengthLabel = document.querySelector('#profiler-length')
        const profilerTotals = document.querySelector('#profiler-totals')

        function drawProfile(profiler) {
            profilerDialog.showModal()
            const data = profiler.history[profiler.history.length - 1]
            const ctx = profilerCanvas.getContext('2d')
            const width = profilerCanvas.width
            const height = profilerCanvas.height

            profilerLengthLabel.innerText = `${(data[data.length - 1].done - data[0].at).toFixed(2)} ms`
            
            ctx.fillStyle = 'black'
            ctx.fillRect(0, 0, width, height)
            const averages = {}
            drawLayer([0, width, 0], data, ctx, averages)
            
            while (profilerTotals.firstChild) {
                profilerTotals.removeChild(profilerTotals.firstChild)
            }
            const maxLength = Object.keys(averages).reduce((r, v) => Math.max(v.length, r), 0)
            for (const display in averages) {
                const e = document.createElement('li')
                e.innerText = `${' '.repeat((maxLength - display.length))}${display} -> ${averages[display]}ms`

                profilerTotals.appendChild(e)
            }
        }

        function getProfiler() {
            if (profilerRadioUpdate.checked) {
                return upprofiler
            }
            return profiler
        }

        document.querySelector('#profiler').addEventListener('click', () => {
            drawProfile(getProfiler())
        })

        profilerRadios.forEach((r) => {
            r.addEventListener('change', () => {
                drawProfile(getProfiler())
            })
        })
    }
}

class NodeCategory {
    /**
     * 
     * @param {Element} parent The sidebar, generally
     * @param {string} category The category name
     * @param {*} items 
     * @param {EditorState} hoverDump Where to put and check hover info
     * @param {*} bind
     * @param {*} handleCreate
     */
    constructor(parent, category, items, hoverDump, bind, handleCreate) {
        this.parent = parent
        this.visible = true
        this.children = []
        this.hoverDump = hoverDump

        const categoryDiv = document.createElement('div')
        categoryDiv.classList.add('category')
        categoryDiv.innerHTML = `<span>${category}</span>`
        
        const container = document.createElement('div')
        container.classList.add('category-items')
        this.container = container

        categoryDiv.addEventListener('click', () => {
            this.minimize(!this.visible)
        })

        for (const item of items) {
            const div = document.createElement('div')
            div.classList.add('category-item')
            div.innerHTML = `<img width="40" height="40"
            src="${item.icon}"><span>${item.display}</span>`

            div.addEventListener('touchstart', e => {
                //if (this.canSelect())
                    handleCreate(item)
            })

            div.addEventListener('pointerdown', e => {
                this.hoverDump.inputType = e.pointerType
                if (/*this.canSelect() &&*/ div.matches(':hover') && bind.isMouse() && (bind.code & e.buttons) != 0) {
                    handleCreate(item)
                }
            })

            div.addEventListener('pointerover', () => {
                this.hoverDump.hoveredNodeType = item.id
                this.hoverDump.hoverTime = Date.now()
            })

            div.addEventListener('pointerleave', () => {
                if (this.hoverDump.hoveredNodeType == item.id) {
                    this.hoverDump.hoveredNodeType = null
                    this.hoverDump.hoverTime = null
                }
            })

            div.addEventListener('keydown', e => {
                if (/*this.canSelect() &&*/ div.matches(':hover') && !bind.isMouse() && bind.code == e.code.toLowerCase()) {
                    handleCreate(item)
                }
            })

            container.appendChild(div)
            this.children.push([item.display, div, item.placeable])
        }
        
        this.parent.appendChild(categoryDiv)
        this.parent.appendChild(container)
    }

    _minimized(visible) {
        this.container.classList.toggle('minimized', !visible)
    }

    minimize(visible) {
        this.visible = visible
        this._minimized(visible)
    }

    search(term) {
        if (term) // make sure items show up even if minimized while searching; term is null when empty
            this._minimized(true)
        else
            this._minimized(this.visible)
        this.children.forEach(child => {
            if (term == null)
                child[1].classList.toggle('search-hidden', false)
            else
                child[1].classList.toggle('search-hidden', !child[0].toLowerCase().includes(term.toLowerCase()))
        })
    }

    toggleChild(child, toggle) {
        child[1].classList.toggle('minimized', !toggle)
    }
}