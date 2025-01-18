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
        if (this.interactionModeCheckbox && this.interactionModeCheckbox.checked)
            return false
        return true
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

        if (this.isKeybindHeld('lasso')) { // multi-drag/select
            this.selectionStart = [...this.position]
            this.primaryPressed = false
        }
        else if (points.length > 0 && this.selectedNodes.length == 0 && this.canSelect()) {
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
        else if (connections.length > 0 && this.selectedNodes.length == 0 && this.canSelect()) {
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
        }
        else if (this.creatingConnection != null) {
            this.creatingConnection.visualPoints.push([
                this.position[0] * (1 / this.scale) - this.pan[0],
                this.position[1] * (1 / this.scale) - this.pan[1]
            ]) // add a point
        }
        else if (nodes.length > 0) { // try to select nodes
            // copy list/create new one
            let currentlySelectedNodes = [...this.selectedNodes]
            // go through each node and perform some checks depending on keys pressed
            nodes.forEach(node => {
                const includes = currentlySelectedNodes.includes(node)
                const mutliSelectEnabled = this.isKeyHeld('Shift')
                if (includes && mutliSelectEnabled) {
                    // remove
                    currentlySelectedNodes.splice(currentlySelectedNodes.indexOf(node), 1)
                }
                else if (!includes) {
                    if (mutliSelectEnabled)
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
        }
    }

    handleRotate() {
        this.selectedNodes.forEach(node => {
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
                const nodeA = duplicates.find(nodes => (nodes[1] == connection.points[0].node))
                const nodeB = duplicates.find(nodes => (nodes[1] == connection.points[1].node))
                const dupe = new this.editor.flow.connectionDefinitions[connection.id](
                    nodeA[0].getConnectionPoint(connection.points[0].id),
                    nodeB[0].getConnectionPoint(connection.points[1].id),
                )
                dupe.color = connection.color
                for (let i = 0; i < connection.visualPoints.length; i++) {
                    dupe.addPoint(connection.visualPoints[i][0] + 25, connection.visualPoints[i][1] + 25)
                }
                this.editor.flow.connections.push(dupe)
            })
            this.selectNodes(duplicates.map(d => d[0]))
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

        if (this.creatingNode != null && !this.isKeybindHeld('move')) {
            this.selectNodes([])
            this.flow.removeNode(this.creatingNode)
            this.creatingNode = null
        }
    }

    /**
     * @param {PointerEvent} event 
     */
    onPointerDown = (event) => {
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
        this.positionDelta = [event.offsetX - this.position[0], event.offsetY - this.position[1]]
        this.position = [event.offsetX, event.offsetY]

        this.handleHover()
        if (this.isKeybindHeld('pan')) {
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

    /**
     * @param {WheelEvent} event 
     */
    onWheel = (event) => {
        const direction = Math.sign(event.deltaY)
        const lastScale = this.scale
        this.scale *= 1 - (direction * 100) / 1000
        if (this.scale <= 0.01)
            this.scale = .01

        const lastMouse = [this.position[0] / lastScale, this.position[1] / lastScale]
        const newMouse = [this.position[0] / this.scale, this.position[1] / this.scale]
        this.pan[0] += newMouse[0] - lastMouse[0]
        this.pan[1] += newMouse[1] - lastMouse[1]
    }

    /**
     * @param {FocusEvent} event 
     */
    onBlur = (event) => {
        Object.values(this.keybinds).forEach(kb => kb.release())
        this.heldKeys = []
    }

    onFlowLoad = () => {
        const sidebar = document.querySelector('#sidebar')
        const flow = this.editor.flow

        while (sidebar.firstChild)
            sidebar.removeChild(sidebar.lastChild)

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
    src="${nd.icon.replace('$assets', `../../flows/${flow.id}/assets`)}"><span>${nd.display}</span>`

                const create = () => {
                    this.creatingNode = new nd()
                    this.creatingNode.position[0] = -100000000000
                    this.editor.flow.nodes.push(this.creatingNode)
                    this.selectNodes([this.creatingNode])
                }
                
                const bind = this.keybinds.move

                document.addEventListener('pointerdown', e => {
                    if (div.matches(':hover') && bind.isMouse() && (bind.code & e.buttons) != 0) {
                        create()
                    }
                })

                document.addEventListener('keydown', e => {
                    if (div.matches(':hover') && !bind.isMouse() && bind.code == e.code.toLowerCase()) {
                        create()
                    }
                })

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
            link.download = "saved.flow"
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
        document.addEventListener('keydown', this.onKeyDown)
        document.addEventListener('keyup', this.onKeyUp)
        canvas.addEventListener('wheel', this.onWheel)
        window.addEventListener('blur', this.onBlur)
        
        this.interactionModeCheckbox = document.getElementById('interaction-mode')

        const connectionColorInput = document.querySelector('#connection-color')
        document.querySelector('#connection-colors').querySelectorAll('div > div').forEach(div => {
            const value = div.getAttribute('value')
            if (value == null)
                return
            div.style.background = value
            div.addEventListener('click', () => {
                connectionColorInput.value = value
                this.connectionColor = value
            })
        })
        connectionColorInput.onchange = () => {
            this.connectionColor = connectionColorInput.value
        }

        const handleButton = (id, handler) => {
            document.querySelector(`#${id}`).onclick = handler
        }

        const fileUpload = document.querySelector('#file')
        handleButton('upload', () => fileUpload.click())
        {
            fileUpload.addEventListener('change', () => {
                if (fileUpload.files.length) {
                    fileUpload.files[0].text().then(data => {
                        this.editor.load(data)
                    })
                    fileUpload.value = null
                }
            })
        }

        handleButton('download', () => this.handleSave(true))
        handleButton('save', () => this.handleSave(false))

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
                input.classList.add('keybind')
                bind[1].button = input
                const label = document.createElement('label')
                label.innerText = ' ' + bind[0] + ' - ' + bind[1].comment

                input.onclick = () => {
                    changingKeybind = bind[1]
                    input.value = '...'
                }

                settingsKeybinds.parentNode.insertBefore(document.createElement('br'), settingsKeybinds.nextSibling)
                settingsKeybinds.parentNode.insertBefore(label, settingsKeybinds.nextSibling)
                settingsKeybinds.parentNode.insertBefore(input, settingsKeybinds.nextSibling)
            })
        }

        handleButton('fullscreen', () => {})

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