/* web */

class Keybind {
    constructor(comment, defaultCode) {
        this.comment = comment
        this.code = defaultCode ?? 'n/a'
        this.pressed = false
        this.pressedWas = false
        this.releasedWas = false
    }

    press() {
        if (!this.pressed)
            this.pressedWas = true
        this.pressed = true
    }

    release() {
        if (this.pressed)
            this.releasedWas = true
        this.pressed = false
        this.pressedWas = false
    }

    isPressed() {
        return this.pressed
    }

    wasPressed() {
        if (this.pressedWas) {
            this.pressedWas = false
            return true
        }
        return false
    }

    wasReleased() {
        if (this.releasedWas) {
            this.releasedWas = false
            return true
        }
        return false
    }

    getKey() {
        if (this.isMouse()) {
            switch(this.code) {
                case 1:
                    return 'LMB'
                case 2:
                    return 'RMB'
                case 4:
                    return 'MMB'
            }
            return this.code
        }
        return this.code.toUpperCase().replace("KEY", "").replace("DIGIT", "").replace("NUMPAD", "NUMPAD ")
            .replace("SHIFTLEFT", "SHIFT").replace("CONTROLLEFT", "CONTROL")
            .replace("SHIFTRIGHT", "SHIFT").replace("SHIFTRIGHT", "SHIFT")
    }

    isMouse() {
        return typeof(this.code) === "number"
    }

    toJSON() {
        return this.code
    }
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

        this.connectionColor = '#ff0000'

        this.keybinds = {
            'select':       new Keybind('interact, select, and create connections with nodes', 1),
            'pan':          new Keybind('pan the camera', 2),

            'move':         new Keybind('move nodes and connections', 1),
            'delete':       new Keybind('delete nodes and connections', 2),
            'rotate':       new Keybind('rotate nodes', 'keyr'),
            'clone':        new Keybind('clone nodes and/or connections', 'keye'),

            'persist':      new Keybind('keep placing connections', 'shiftleft'),
            'snap':         new Keybind('snap nodes to the grid (doesn\'t support connections yet)', 'shiftleft'),

            'lasso':        new Keybind('select multiple nodes all at once', 'controlleft')
        }

        this.inputType = 'mouse'
        this.lastPinchDistance = null

        // history //

        this.history = [] // history stack

        // creating //

        this.selectedNodes = []
        this.selectedPoints = []
        this.selectedConnections = []
        this.selectedSubPoints = []

        this.hoveredNode = null
        this.hoveredPoint = null
        this.hoveredConnection = null

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

    updateKeybinds() {
        Object.keys(this.keybinds).forEach(key => {
            const elements = document.querySelectorAll(`#keybind-${key}`)
            elements.forEach(e => e.innerText = this.keybinds[key].getKey())
        })
    }

    saveKeybinds() {
        if (localStorage != null)
            localStorage.setItem('keybinds', JSON.stringify(this.keybinds))
        this.updateKeybinds()
    }

    loadKeybinds() {
        if (localStorage != null) {
            const keybinds = localStorage.getItem('keybinds')
            if (keybinds != null) {
                Object.entries(JSON.parse(keybinds)).forEach(kb => {
                    if (this.keybinds[kb[0]])
                        this.keybinds[kb[0]].code = kb[1]
                })
            }
        }
        this.updateKeybinds()
    }

    isKeyHeld(key) {
        return this.heldKeys.includes(key)
    }

    updateCursor() {
        document.body.style.cursor = this.isKeybindHeld('pan') ? 'move' : null
    }

    isKeybindHeld(name) {
        return this.keybinds[name].isPressed()
    }

    wasKeybindPressed(name) {
        return this.keybinds[name].wasPressed()
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

    handleDrag() {
        if (this.creatingNode != null) {
            const size = this.creatingNode.getSize()
            this.creatingNode.position = [
                this.position[0] * (1 / this.scale) - this.pan[0] - size[0] / 2,
                this.position[1] * (1 / this.scale) - this.pan[1] - size[1] / 2,
            ]
            this.creatingNode = null
        }
        else {
            if (!this.isDragging) {
                this.isDragging = true
                this.addHistory('move', {
                    nodes: this.selectedNodes.map(node => [node, [...node.position]]),
                    connections: this.editor.flow.connections
                        .filter(connection => connection.points.every(point => this.selectedNodes.includes(point.node)))
                        .map(connection => [connection, connection.visualPoints.map(point => [...point])]),
                    subpoints: this.selectedSubPoints.map(subpoint => [subpoint[0], subpoint[1], [...subpoint[0].visualPoints[subpoint[1]]]])
                })
            }
            this.selectedSubPoints.forEach(subpoint => {
                subpoint[0].visualPoints[subpoint[1]][0] += this.positionDelta[0] * (1 / this.scale)
                subpoint[0].visualPoints[subpoint[1]][1] += this.positionDelta[1] * (1 / this.scale)
            })
            this.editor.flow.connections.forEach(connection => {
                if (connection.points.every(point => this.selectedNodes.includes(point.node))) {
                    connection.visualPoints.forEach(subpoint => {
                        subpoint[0] += this.positionDelta[0] * (1 / this.scale)
                        subpoint[1] += this.positionDelta[1] * (1 / this.scale)
                    })
                }
            })
            this.selectedNodes.forEach(node => {
                node.position[0] += this.positionDelta[0] * (1 / this.scale)
                node.position[1] += this.positionDelta[1] * (1 / this.scale)

                if (this.isKeybindHeld('snap')) {
                    node.position[0] = Math.round(node.position[0] / this.gridSize) * this.gridSize
                    node.position[1] = Math.round(node.position[1] / this.gridSize) * this.gridSize
                }
            })
        }
    }

    selectNodes(nodes) {
        if (this.selectedNodes != null)
            this.selectedNodes.forEach(node => node.ghost = false)
        this.selectedNodes = nodes
        if (this.selectedNodes != null)
            this.selectedNodes.forEach(node => node.ghost = true)
    }

    handleSelect() {
        const nodes = this.editor.flow.getNodesAt(...this.position)
        const points = this.editor.flow.getConnectionPointsAt(...this.position)
        const connections = this.editor.flow.getConnectionsAt(...this.position).filter(connection => connection != this.creatingConnection)
        // priority:
        // connection point
        // node
        // conncetion

        if (this.creatingNode != null && this.inputType == 'touch') {
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
                    this.flow.cutConnection(c)
                })
                this.selectedConnections = []
                this.selectedSubPoints = []
            }
        }
        else if (this.creatingConnection != null) {
            this.creatingConnection.visualPoints.push([
                this.position[0] * (1 / this.scale) - this.pan[0],
                this.position[1] * (1 / this.scale) - this.pan[1]
            ]) // add a point
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
        }
    }

    handleDelete() {
        const nodes = this.editor.flow.getNodesAt(...this.position)
        const points = this.editor.flow.getConnectionPointsAt(...this.position)
        const connections = this.editor.flow.getConnectionsAt(...this.position)

        if (this.creatingConnection != null) {
            if (this.creatingConnection.visualPoints.length > 0) {
                this.creatingConnection.visualPoints.splice(this.creatingConnection.visualPoints.length - 1, 1)
            }
            else {
                this.flow.cutConnection(this.creatingConnection)
                this.creatingConnection = null
                this.selectedNodes = []
                this.selectedConnections = []
                this.selectedPoints = []
            }
        }
        else if (this.selectedNodes.length > 0) {
            if (this.selectedNodes.some(node => nodes.includes(node))) {
                // hovering over a selected node --> delete
                const connections = this.selectedNodes
                    .flatMap(node => this.editor.flow.getConnectionsTo(node))
                    .filter((node, index, array) => array.indexOf(node) == index)
                this.selectedNodes.forEach(node => this.flow.removeNode(node))
                this.addHistory('delete', {nodes: this.selectedNodes, connections: connections, subpoints: []})
                this.selectNodes([])
            }
        }
        else if (connections.length > 0) {
            const removedSubpoints = []
            const removedConnections = []
            connections.filter(c => c != this.creatingConnection).forEach(connection => {
                const subpoint = connection.getHoveringSubPoint(...this.position)
                if (subpoint != null) {
                    const deleted = connection.visualPoints.splice(subpoint, 1)[0]
                    removedSubpoints.push([connection, subpoint, deleted]) // conn, index, pos
                }
                else {
                    this.flow.cutConnection(connection)
                    removedConnections.push(connection)
                }
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

        if (this.selectedNodes.length > 0) { // clone nodes
            const duplicates = []

            for (var node of this.selectedNodes) {
                const dupe = new this.editor.flow.nodeDefinitions[node.id]()
                dupe.deserialize(JSON.parse(JSON.stringify(node.serialize())))
                dupe.position[0] += 25
                dupe.position[1] += 25
                dupe.needsConnectionUpdate = true // fix bug attempt
                this.editor.flow.nodes.push(dupe)
                duplicates.push([dupe, node])
            }

            const connections = this.selectedNodes
                .flatMap(node => this.editor.flow.getConnectionsTo(node))
                .filter((node, index, array) => array.indexOf(node) == index)
            connections.forEach(connection => {
                const nodeA = duplicates.find(nodes => (nodes[1] == connection.points[0].node)) ?? [connection.points[0].node]
                const nodeB = duplicates.find(nodes => (nodes[1] == connection.points[1].node)) ?? [connection.points[1].node]
                const dupec = new this.editor.flow.connectionDefinitions[connection.id](
                    nodeA[0].getConnectionPoint(connection.points[0].id),
                    nodeB[0].getConnectionPoint(connection.points[1].id),
                )
                dupec.color = connection.color
                for (let i = 0; i < connection.visualPoints.length; i++) {
                    dupec.addPoint(connection.visualPoints[i][0] + 25, connection.visualPoints[i][1] + 25)
                }
                this.editor.flow.connections.push(dupec)
            })
            this.selectNodes(duplicates.map(d => d[0]))
        }
        else if (connections.length > 0 && this.creatingConnection == null) {
            const connection = connections[0]
            const subpoint = connection.getHoveringSubPoint(...this.position)
            if (subpoint != null) {
                this.selectedPoints = [connection.a]
                this.creatingConnection = new connection.constructor(connection.a, null)
                this.creatingConnection.color = connection.color
                for (let i = 0; i < connection.visualPoints.indexOf(subpoint); i++) {
                    this.creatingConnection.visualPoints.push(connection.visualPoints[i])
                }
                connection.visualPoints.forEach(point => this.creatingConnection.visualPoints.push(point))
                this.editor.flow.connections.push(this.creatingConnection)
            }
            /*this.addHistory('', {
                
            })*/
        }
    }

    handleHover() {
        const nodes = this.editor.flow.getNodesAt(...this.position)
        const points = this.editor.flow.getConnectionPointsAt(...this.position)
        const connections = this.editor.flow.getConnectionsAt(...this.position).filter(c => c != this.creatingConnection)

        this.hoveredNode = nodes[0]
        this.hoveredPoint = points[0]
        this.hoveredConnection = connections[0]
    }

    handleCreating() {
        if (this.creatingConnection != null) {
            if (this.hoveredPoint != null && this.editor.flow.canConnectTo(this.creatingConnection.a, this.hoveredPoint))
                this.creatingConnection.b = this.hoveredPoint
            else
                this.creatingConnection.b = {
                    'position': [this.position[0] * (1 / this.scale), this.position[1] * (1 / this.scale)],
                    'node': {
                        'position': [-this.pan[0], -this.pan[1]],
                        'ghost': true
                    }
                }
        }
    }

    handleLasso() {
        const minX = Math.min(this.selectionStart[0], this.position[0])
        const maxX = Math.max(this.selectionStart[0], this.position[0])
        const minY = Math.min(this.selectionStart[1], this.position[1])
        const maxY = Math.max(this.selectionStart[1], this.position[1])

        const nodes = this.editor.flow.nodes.filter(node => {
            const a = node.getRelative(minX, minY)
            const b = node.getRelative(maxX, maxY)
            return a[0] <= 0 && a[1] <= 0 && b[0] >= 0 && b[1] >= 0
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

    updateInputs() {
        if (this.selectionStart == null && this.wasKeybindPressed('select')) {
            this.handleSelect()
        }
        if (this.isKeybindHeld('delete')) {
            this.handleDelete()
        }
        if (this.isKeybindHeld('rotate')) {
            this.handleRotate()
        }
        if (this.isKeybindHeld('clone')) {
            this.handleClone()
        }
        if (this.selectionStart != null && (!this.isKeybindHeld('lasso') || !this.isKeybindHeld('select'))) {
            this.handleLasso()
        }

        if (this.creatingNode != null && !this.isKeybindHeld('move') && this.inputType != 'touch') {
            this.selectNodes([])
            this.flow.removeNode(this.creatingNode)
            this.creatingNode = null
        }
    }

    /**
     * @param {PointerEvent} event 
     */
    onPointerDown = (event) => {
        this.inputType = event.pointerType
        this.position = [event.offsetX, event.offsetY]

        this.primaryPressed = (event.buttons & 1) != 0
        this.secondaryPressed = (event.buttons & 2) != 0

        Object.values(this.keybinds).forEach(kb => {if (kb.isMouse() && (event.buttons & kb.code) != 0) kb.press()})
        this.updateCursor()
        this.updateInputs()
    }

    /**
     * @param {PointerEvent} event 
     */
    onGlobalPointerDown = (event) => {
        Object.values(this.keybinds).forEach(kb => {if (kb.isMouse() && (event.buttons & kb.code) != 0) kb.press()})
        this.updateCursor()
    }

    /**
     * @param {PointerEvent} event 
     */
    onPointerMove = (event) => {
        if (event.pointerType == 'touch')
            return
        this.positionDelta = [event.offsetX - this.position[0], event.offsetY - this.position[1]]
        this.position = [event.offsetX, event.offsetY]

        this.handleHover()
        if (this.isKeybindHeld('pan') || (this.selectedNodes.length == 0 && event.pointerType == 'touch')) {
            this.handlePan()
        }
        if (this.isKeybindHeld('move') && this.selectionStart == null) {
            this.handleDrag()
        }
        else {
            this.isDragging = false
            this.selectedConnections = []
            this.selectedSubPoints = []
        }
        this.handleCreating()
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
            this.selectedNodes.forEach(node => this.flow.removeNode(node))
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
                    this.flow.cutConnection(connection)
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
    }

    /**
     * @param {PointerEvent} event 
     */
    onPointerUp = (event) => {
        this.primaryPressed = false
        this.secondaryPressed = false

        Object.values(this.keybinds).forEach(kb => {if (kb.isMouse()) kb.release()})
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
        Object.values(this.keybinds).forEach(kb => {if (!kb.isMouse() && event.code.toLowerCase() == kb.code) kb.press()})
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
        Object.values(this.keybinds).forEach(kb => {if (!kb.isMouse() && event.code.toLowerCase() == kb.code) kb.release()})
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
        Object.values(this.keybinds).forEach(kb => kb.release())
        this.heldKeys = []
    }

    onSearchChanged = () => {
        const text = this.searchBox.value
        if (text.length == 0) {
            this.searchItems.forEach(div => {
                div.classList.toggle('search-hidden', false)
            })
        }
        else {
            this.searchItems.forEach(div => {
                const hidden = !div.querySelector('span').innerText.toLowerCase().includes(text.toLowerCase())
                div.classList.toggle('search-hidden', hidden)
            })
        }
    }

    onFlowLoad = () => {
        const sidebar = document.querySelector('#sidebar')
        const flow = this.editor.flow

        while (sidebar.firstChild)
            sidebar.removeChild(sidebar.lastChild)

        const search = document.createElement('div')
        const searchBox = document.createElement('input')
        this.searchBox = searchBox
        searchBox.addEventListener('input', () => this.onSearchChanged())
        this.searchItems = []

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

        categories.forEach(cat => {
            const div = document.createElement('div')
            div.classList.add('category')
            div.innerHTML = `<span>${cat}</span>`
            sidebar.appendChild(div)
            const items = document.createElement('div')
            items.classList.add('category-items')
            sidebar.appendChild(items)

            const categoryElements = []

            const nodes = Object.values(flow.nodeDefinitions)
                .filter(nd => nd.category == cat)
                .sort((a, b) => a.display.localeCompare(b.display))
            nodes.forEach(nd => {
                const div = document.createElement('div')
                div.classList.add('category-item')
                div.innerHTML = `<img width="40" height="40"
    src="${this.parsePath(nd.icon)}"><span>${nd.display}</span>`

                const create = () => {
                    if (this.creatingNode != null) {
                        this.selectNodes([])
                        this.flow.removeNode(this.creatingNode)
                        this.creatingNode = null
                        return
                    }
                    console.warn('create')
                    this.creatingNode = new nd()
                    this.creatingNode.position[0] = -100000000000
                    this.editor.flow.nodes.push(this.creatingNode)
                    this.selectNodes([this.creatingNode])
                }
                
                const bind = this.keybinds.move

                div.addEventListener('touchstart', e => {
                    if (this.canSelect())
                        create()
                })

                div.addEventListener('pointerdown', e => {
                    this.inputType = e.pointerType
                    if (this.canSelect() && div.matches(':hover') && bind.isMouse() && (bind.code & e.buttons) != 0) {
                        create()
                    }
                })

                div.addEventListener('keydown', e => {
                    if (this.canSelect() && div.matches(':hover') && !bind.isMouse() && bind.code == e.code.toLowerCase()) {
                        create()
                    }
                })

                this.searchItems.push(div)
                items.appendChild(div)
                categoryElements.push(div)
            })

            var toggle = true
            div.addEventListener('click', () => {
                toggle = !toggle
                items.classList.toggle('minimized', !toggle)
            })
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
            const url = new URL(location.href)
            history.pushState(null, '', `${url.origin}${url.pathname}?share=${data}`)
            document.querySelector('#share-input').showModal()
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
        this.editor = editor
        editor.flow.onload = this.onFlowLoad
        const canvas = editor.canvas
        document.oncontextmenu = e => e.preventDefault() // prevent save image/etc from popping up
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

        //this.interactionModeCheckbox = document.getElementById('interaction-mode')
        this.mode = document.querySelector('#mode-select')

        const content = document.querySelector('#content')
        this.mode.addEventListener('input', () => {
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
            div.addEventListener('click', () => {
                connectionColorInput.value = value
                this.setConnectionColor(value)
            })
        })
        connectionColorInput.onchange = () => {
            this.setConnectionColor(connectionColorInput.value)
        }

        const handleButton = (id, handler) => {
            document.querySelector(`#${id}`).addEventListener('pointerup', handler)
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
        const settingsKeybinds = settingsMenu.querySelector('#keybinds')
        handleButton('settings', () => settingsMenu.showModal())
        {
            this.loadKeybinds()
            let changingKeybind = null
            document.addEventListener('keydown', e => {
                if (changingKeybind != null) {
                    changingKeybind.code = e.code.toLowerCase()
                    changingKeybind.button.value = changingKeybind.getKey()
                    changingKeybind.button.blur()
                    changingKeybind = null
                    this.saveKeybinds()
                }
            })
            document.addEventListener('pointerdown', e => {
                if (changingKeybind != null) {
                    changingKeybind.code = e.buttons
                    changingKeybind.button.value = changingKeybind.getKey()
                    changingKeybind.button.blur()
                    changingKeybind = null
                    this.saveKeybinds()
                }
            })

            Object.entries(this.keybinds).reverse().forEach(bind => {
                const input = document.createElement('input')
                input.type = 'button'
                input.value = bind[1].getKey()
                input.classList.add('keybind', 'desktop')
                bind[1].button = input
                const label = document.createElement('label')
                label.innerText = ' ' + bind[0] + ' - ' + bind[1].comment
                label.classList.add('desktop')

                input.onclick = () => {
                    changingKeybind = bind[1]
                    input.value = '...'
                }

                const br = document.createElement('br')
                br.classList.add('desktop')
                settingsKeybinds.parentNode.insertBefore(br, settingsKeybinds.nextSibling)
                settingsKeybinds.parentNode.insertBefore(label, settingsKeybinds.nextSibling)
                settingsKeybinds.parentNode.insertBefore(input, settingsKeybinds.nextSibling)
            })
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
    }
}