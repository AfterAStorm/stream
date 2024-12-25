/* web */

import { Flow } from "./flow.js"
import { LZString } from "./vendor/lz-string.min.js" // is faster but is slightly less effective
import JSONCrush from "./vendor/JSONCrush.min.js" // is considerably slower but is a bit better compression wise

// for now, we support JSONCrushed strings (if they start with a "("), but we only export as lz-string compressed

// canvas
var canvas, context

var interactionMode = false

const gridSize = 25

var scale = 1
var pan = [0, 0]
var lastPointerPos = [0, 0]
var dragStartPos = [0, 0]
var selectStart = null//[0, 0]
var pointerPrimaryPressed = false
var pointerSecondaryPressed = false
var heldKeys = []

var lastUpdate = performance.now()
var lastDraw = Date.now()
const framerateCap = 1 / 60
var millisecondsPerUpdate = 9999

var selectedNodes = null
var selectedNodesDragging = false
var selectedConnectionPoint = null

var creatingNode = null
var insideCanvas = false

var ghostConnection = null
var selectedConnection = null
var selectedConnectionSubPoint = null

var hoveredConnectionPoint = null
var hoveredConnection = null

// load flow
function decompress(flowString) {
    return flowString.startsWith('ey') ? 
            JSON.parse(atob(flowString)) :
            (flowString.startsWith('(') ? JSON.parse(JSONCrush.uncrush(flowString)) :
            JSON.parse(LZString.decompressFromEncodedURIComponent(flowString)))
            
}

const params = new URLSearchParams(location.search)
const share = params.get('share')
var flow
if (share != null) {
    try {
        const shareJson = decompress(share)
        pan = shareJson.pan || [0, 0]
        scale = shareJson.scale || 1
        flow = new Flow()
        flow.deserialize(shareJson)
    }
    catch (e) {
        flow = null
        console.error(e)
    }
}
if (flow == null)
    flow = new Flow('oaklands')
flow.load().then(() => {
    millisecondsPerUpdate = 1000 * flow.updateSpeed
    console.warn('millisecondsPerUpdate', millisecondsPerUpdate)

    /*const btn = new flow.nodeDefinitions.number_interface()
    const btn2 = new flow.nodeDefinitions.button()
    btn2.position[1] += 300

    const and = new flow.nodeDefinitions.gate_relay()
    and.position[0] += 300

    const lcd = new flow.nodeDefinitions.lcd()

    const wire = new flow.connectionDefinitions.wire(btn.connectionPoints[0], and.connectionPoints[0])
    //const wire2 = new flow.connectionDefinitions.wire(btn2.connectionPoints[0], and.connectionPoints[1])
    //const wire3 = new flow.connectionDefinitions.wire(and.connectionPoints[2], lcd.connectionPoints[0])
    //flow.connections.push(wire)//, wire2, wire3)

    lcd.position[0] += 500
    lcd.position[1] += 25*/

    //flow.nodes.push(btn, btn2, and, lcd)

    const sidebar = document.querySelector('#sidebar')

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

            div.addEventListener('pointerdown', e => {
                creatingNode = new nd()
                creatingNode.position[0] = -100000000000
                creatingNode.ghost = true
                flow.nodes.push(creatingNode)
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
    //flow.connections.push(wire, wire2, wire3)
}).catch(e => {
    console.error(e)
    alert('Failed to fetch flow! Check your internet connection (or server status).')
})

String.prototype.strip = function(char) {
    var str = this
    while (str.startsWith(char))
        str = str.substring(1)
    while (str.endsWith(char))
        str = str.substring(0, str.length - 1)
    return str
}

var delta = 0
var lastTimestamp = 0

const connectionColor = document.querySelector('#connection-color')

async function draw(timestamp) {
    // used in some nodes
    context.editor = {
        'pointerPosition': lastPointerPos,
        'pointerPrimaryPressed': pointerPrimaryPressed,
        'color': connectionColor.value,
        'offset': pan,
        'scale': scale,
        'debug': context.editor?.debug || false,
        'pause': true,
        'tick': context.editor?.tick || 0
    }

    // attempt to update
    if (ghostConnection != null)
        ghostConnection.ghost = true

    // start : 0
    // now : 16.6
    // now - start = 16.6
    // 16.6 > 1000 / 60 yes
    // difference = 16.6 - 1000 / 60 // time missed

    delta += timestamp - lastTimestamp
    lastTimestamp = timestamp

    while (delta >= millisecondsPerUpdate && !(context.editor.debug && context.editor.pause)) {
        delta -= millisecondsPerUpdate
        flow.update(context.editor)
    }
    const now = Date.now()
    /*var updates = 0
    while (now - lastUpdate > millisecondsPerUpdate && !(context.editor.debug && context.editor.pause)) {
        const difference = now - lastUpdate - millisecondsPerUpdate
        lastUpdate += millisecondsPerUpdate
        flow.update(context.editor)
        context.editor.tick += 1
        updates += 1
        if (updates > 9) {
            lastUpdate = now
            console.warn('WOAH')
            break
        }
    }*/

    // check timing
    requestAnimationFrame(draw)
    if ((now - lastDraw) / 1000 > framerateCap) {
        lastDraw = now
    }
    else
        return

    // correct sizes
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    context.width = canvas.width
    context.height = canvas.height

    // clear
    context.resetTransform()
    //context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#777196'
    context.fillRect(0, 0, context.width, context.height)

    // draw grid
    context.strokeStyle = '#ddd'
    context.globalAlpha = .35

    context.scale(scale, scale)
    // this is incredibly elegant and i love it
    context.translate(pan[0] % gridSize, pan[1] % gridSize)

    const width  = canvas.width  * (1 / scale) + gridSize * 2
    const height = canvas.height * (1 / scale) + gridSize * 2

    context.beginPath()
    for (let x = -gridSize * 2; x < width; x += gridSize) {
        context.moveTo(x, -gridSize * 2)
        context.lineTo(x, height)
    }
    for (let y = -gridSize * 2; y < height; y += gridSize) {
        context.moveTo(-gridSize * 2, y)
        context.lineTo(width, y)
    }
    context.stroke()

    // draw nodes
    context.globalAlpha = 1
    context.resetTransform()
    context.scale(scale, scale)
    context.translate(pan[0], pan[1])

    flow.draw(context)

    // draw tooltips
    context.resetTransform()
    const pos = lastPointerPos
    if (hoveredConnectionPoint != null) {
        context.fillStyle = '#ddd'
        context.font = '15px monospace'
        context.textAlign = 'left'
        context.textBaseline = 'middle'
        const tooltip = '*' + hoveredConnectionPoint.node.display + '\n' + hoveredConnectionPoint.tooltip
        const sizeNeeded = context.measureText(tooltip.split('\n').sort((a, b) => b.length - a.length)[0]) // measure by the longest line
        const lines = tooltip.split('\n')
        context.beginPath()
        context.roundRect(pos[0] - sizeNeeded.width / 2, pos[1] - 15 * lines.length - 10, sizeNeeded.width + 10, lines.length * 15 + 2, 10)
        context.fill()

        context.fillStyle = '#000'
        for (let i = 0; i < lines.length; i++) {
            context.font = lines[i].startsWith('*') ? (lines[i].startsWith('**') ? 'bold 15px monospace' : 'italic 15px monospace') : '15px monospace'
            context.fillText(lines[i].strip('*'), pos[0] - sizeNeeded.width / 2 + 5, pos[1] - 15 - 15 * (lines.length - 1) + 15 * i)
        }
        
        context.fillStyle = '#555'
        context.font = '15px monospace'
        const valueSizeNeeded = context.measureText(hoveredConnectionPoint.value)
        context.beginPath()
        context.roundRect(pos[0] - valueSizeNeeded.width / 2, pos[1] + 20, valueSizeNeeded.width + 10, 20, 10)
        context.fill()
        
        context.fillStyle = '#fff'
        context.fillText(hoveredConnectionPoint.value, pos[0] - valueSizeNeeded.width / 2 + 5, pos[1] + 30)
    }
    else if (hoveredConnection != null) {
        context.fillStyle = '#555'
        context.font = '15px monospace'
        context.textAlign = 'left'
        context.textBaseline = 'middle'
        const valueSizeNeeded = context.measureText(hoveredConnection.value)
        context.beginPath()
        context.roundRect(pos[0] - valueSizeNeeded.width / 2, pos[1] + 20, valueSizeNeeded.width + 10, 20, 10)
        context.fill()
        
        context.fillStyle = '#fff'
        context.fillText(hoveredConnection.value, pos[0] - valueSizeNeeded.width / 2 + 5, pos[1] + 30)
    }

    // draw selection
    if (selectStart != null) {
        context.strokeStyle = '#faa'
        context.setLineDash([5])
        context.beginPath()
        context.rect(selectStart[0], selectStart[1], lastPointerPos[0] - selectStart[0], lastPointerPos[1] - selectStart[1])
        context.stroke()
    }
}

async function main() {
    canvas = document.getElementById('chart')
    context = canvas.getContext('2d', {
        alpha: false
    })
    
    canvas.oncontextmenu = e => e.preventDefault()

    canvas.addEventListener('pointerdown', e => {
        lastPointerPos = [e.offsetX, e.offsetY]
        if (e.pointerType != 'mouse')
            return
        pointerPrimaryPressed =
            (e.pointerType == 'mouse' && (e.buttons & 1) != 0) ||
            (e.pointerType != 'mouse' && (e.buttons & 1) != 0)
        pointerSecondaryPressed =
            (e.pointerType == 'mouse' && (e.buttons & 2) != 0) ||
            (e.pointerType != 'mouse' && (e.buttons & 1) != 0)
            
        if (interactionMode)
            return
        
        if (pointerPrimaryPressed) {
            const connections = flow.getConnectionsAt(...lastPointerPos)
            var points = flow.getConnectionPointsAt(...lastPointerPos)
            const nodes = flow.getNodesAt(...lastPointerPos)
            
            if (heldKeys.includes('control')) {
                // handle multi drag
                selectStart = [...lastPointerPos]
                pointerPrimaryPressed = false
            }

            if (connections.length > 0 && points.length == 0 && ghostConnection == null) {
                const connection = connections[0]
                const subpointIndex = connection.getHoveringSubPoint(...lastPointerPos)
                if (subpointIndex != null) {
                    // drag a sub point
                    selectedConnection = connection
                    selectedConnectionSubPoint = subpointIndex
                }
                else {
                    // create a sub point
                    const segment = connection.getHoveringSegment(...lastPointerPos) // so index of first point
                    selectedConnection = connection
                    connection.visualPoints.splice(segment, 0, connection.getRelative(0, 0, ...lastPointerPos))
                    selectedConnectionSubPoint = segment
                }
                pointerPrimaryPressed = false
            }
            else if (points.length > 0) {
                if (selectedConnectionPoint != null) {
                    points = points.filter(p => flow.canConnectTo(selectedConnectionPoint, p))
                    if (points.length > 0) {
                        ghostConnection.b = points[0]
                        ghostConnection.points.push(points[0])
                        ghostConnection.update()
                        if (heldKeys.includes('shift')) {
                            const lastConnection = ghostConnection
                            ghostConnection = new ghostConnection.constructor(selectedConnectionPoint)
                            ghostConnection.color = connectionColor.value
                            ghostConnection.a = lastConnection.a
                            lastConnection.visualPoints.forEach(p => ghostConnection.visualPoints.push(p))
                            flow.connections.push(ghostConnection)
                        }
                        else {
                            selectedConnectionPoint = null
                            ghostConnection = null
                        }
                    }
                }
                else {
                    selectedConnectionPoint = points[0]
                    ghostConnection = new flow.connectionDefinitions[flow.connectionPointTypes[selectedConnectionPoint.type].connection](selectedConnectionPoint, null)
                    ghostConnection.color = connectionColor.value
                    flow.connections.push(ghostConnection)
                }
            }
            else if (selectedConnectionPoint != null) {
                pointerPrimaryPressed = false
                ghostConnection.addPoint(lastPointerPos[0] * (1 / scale) - pan[0], lastPointerPos[1] * (1 / scale) - pan[1])
            }
            else {
                if (selectedNodes != null) {
                    if (selectedNodes.some(n => nodes.includes(n))) {
                        // drag
                        selectedNodesDragging = true
                        dragStartPos = [...lastPointerPos]
                        pointerPrimaryPressed = false
                    }
                    else {
                        if (heldKeys.includes('shift')) {
                            // add nodes
                            nodes.forEach(n => n.ghost = true)
                            selectedNodes.push(...nodes)
                            
                            return
                        }
                        else {
                            // deselect / reselect
                            selectedNodes.forEach(n => n.ghost = false)
                            selectedNodes = nodes
                            if (nodes.length == 0)
                                selectedNodes = null
                            else {
                                selectedNodesDragging = true
                                dragStartPos = [...lastPointerPos]
                                pointerPrimaryPressed = false
                                selectedNodes.forEach(n => n.ghost = true)
                            }
                        }
                    }
                }
                else {
                    selectedNodes = nodes
                    selectedNodes.forEach(n => n.ghost = true)
                    selectedNodesDragging = true
                    dragStartPos = [...lastPointerPos]
                    if (selectedNodes.length > 0)
                        pointerPrimaryPressed = false
                }
            }
        }
        if (pointerSecondaryPressed) {
            if (selectedConnectionPoint != null) {
                if (ghostConnection.visualPoints.length > 0) {
                    console.log('remove point')
                    ghostConnection.visualPoints.splice(ghostConnection.visualPoints.length - 1, 1)
                }
                else {
                    flow.cutConnection(ghostConnection)
                    selectedConnectionPoint = null
                    ghostConnection = null
                }
            }
            const connections = flow.getConnectionsAt(...lastPointerPos)
            const nodes = flow.getNodesAt(...lastPointerPos)

            if (nodes.length > 0) {
                if (selectedNodes != null) {
                    if (selectedNodes.some(n => nodes.includes(n))) {
                        selectedNodes.forEach(n => flow.removeNode(n))
                        selectedNodesDragging = false
                        selectedNodes = null
                    }
                }
            }
            
            connections.filter(c => c != ghostConnection).forEach(c => {
                const subpoint = c.getHoveringSubPoint(...lastPointerPos)
                if (subpoint != null) {
                    c.visualPoints.splice(subpoint, 1)
                }
                else
                    flow.cutConnection(c)
            })
        }
    })

    canvas.addEventListener('pointermove', e => {
        const offsetX = e.offsetX - lastPointerPos[0]
        const offsetY = e.offsetY - lastPointerPos[1]
        lastPointerPos = [e.offsetX, e.offsetY]

        const connectionPoints = flow.getConnectionPointsAt(...lastPointerPos)
        const connections = flow.getConnectionsAt(...lastPointerPos)
        hoveredConnectionPoint = connectionPoints.length > 0 ? connectionPoints[0] : null
        hoveredConnection = connections.length > 0 ? connections[0] : null
        
        if (!((e.pointerType == 'mouse' && (e.buttons & 2) != 2) || (e.pointerType != 'mouse' && (e.buttons & 1) != 1))) {
            pan[0] += offsetX * (1 / scale)
            pan[1] += offsetY * (1 / scale)
        }
        
        if (e.pointerType != 'mouse') {
            // handle pinch gestures
            return
        }

        if (interactionMode)
            return

        if (selectedNodesDragging) {
            selectedNodes.forEach(n => { // this doesn't really work how i'd want it to, but the i'd have to store the starting position of all the nodes
                                         // so... whatever for now
                n.position[0] += offsetX * (1 / scale)
                n.position[1] += offsetY * (1 / scale)

                if (heldKeys.includes('shift')) {
                    n.position[0] = Math.round(n.position[0] / gridSize) * gridSize
                    n.position[1] = Math.round(n.position[1] / gridSize) * gridSize
                }
            })
            const eligableDraggingConnections = selectedNodes
                .flatMap(n => flow.getConnectionsTo(n))
                .filter((n, i, a) => a.indexOf(n) == i)
                .filter(c => c.points.every(point => selectedNodes.includes(point.node)))
            eligableDraggingConnections.forEach(c => c.visualPoints.forEach(p => {
                p[0] += offsetX * (1 / scale)
                p[1] += offsetY * (1 / scale)
            }))
        }
        if (ghostConnection != null) {
            const points = connectionPoints.filter(p => flow.canConnectTo(selectedConnectionPoint, p))
            if (points.length > 0) {
                ghostConnection.b = points[0]
            }
            else
                ghostConnection.b = {
                    'position': [lastPointerPos[0] * (1 / scale), lastPointerPos[1] * (1 / scale)],
                    'node': {
                        'position': [-pan[0], -pan[1]],
                        'ghost': true
                    }
                }
        }
        else if (selectedConnectionSubPoint != null) {
            selectedConnection.visualPoints[selectedConnectionSubPoint][0] += offsetX * (1 / scale)
            selectedConnection.visualPoints[selectedConnectionSubPoint][1] += offsetY * (1 / scale)
        }
        if (creatingNode != null) {
            const size = creatingNode.getSize()
            creatingNode.position =
                [lastPointerPos[0] * (1 / scale) - pan[0] - size[0] / 2, lastPointerPos[1] * (1 / scale) - pan[1] - size[1] / 2]
        }
    })

    canvas.addEventListener('pointerenter', e => {
        insideCanvas = true
    })

    canvas.addEventListener('pointerleave', e => {
        if (e.pointerType != 'mouse')
            return
        insideCanvas = false
        if (creatingNode != null) {
            flow.removeNode(creatingNode)
            creatingNode = null
        }
    })

    document.addEventListener('pointerup', e => {
        pointerPrimaryPressed = false
        selectedNodesDragging = false
        if (selectStart != null) {
            const minX = Math.min(selectStart[0], lastPointerPos[0])
            const maxX = Math.max(selectStart[0], lastPointerPos[0])
            const minY = Math.min(selectStart[1], lastPointerPos[1])
            const maxY = Math.max(selectStart[1], lastPointerPos[1])

            const nodes = flow.nodes.filter(n => {
                const a = n.getRelative(minX, minY)
                const b = n.getRelative(maxX, maxY)
                return a[0] <= 0 && a[1] <= 0 && b[0] >= 0 && b[1] >= 0
                //const p = n.getRelative(0, 0) // based on top left point (when not rotated)... so.. it's fine for now
                //return -p[0] >= minX && -p[0] <= maxX && -p[1] >= minY && -p[1] <= maxY
            })
            if (selectedNodes != null)
                selectedNodes.forEach(n => n.ghost = false)
            selectedNodes = nodes
            selectedNodes.forEach(n => n.ghost = true)

            selectStart = null
        }
        if (creatingNode != null) {
            if (!insideCanvas) {
                flow.removeNode(creatingNode)
            }
            creatingNode.ghost = false
            creatingNode = null
        }
        selectedConnectionSubPoint = null
        selectedConnection = null
    })

    document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase()
        if (!e.repeat && !heldKeys.includes(key)) {
            heldKeys.push(key)
            if (key == 'q' && e.ctrlKey)
                context.editor.debug = !context.editor.debug
        }
        if (key == 'q')
            flow.update(context.editor)
        if (key == 'r' && creatingNode != null)
            creatingNode.rotation = (creatingNode.rotation + 90) % 360
        else if (key == 'r' && selectedNodes != null) // rotation 90deg
            selectedNodes.forEach(n => n.rotation = (n.rotation + 90) % 360)
        else if (key == 'e' && ghostConnection == null) { // clone wire at
            const connections = flow.getConnectionsAt(...lastPointerPos)

            if (connections.length == 0)
                return
            const connection = connections[0]
            const subpointIndex = connection.getHoveringSubPoint(...lastPointerPos)
            if (subpointIndex != null) {
                // create a wire
                selectedConnectionPoint = connection.points[0]
                ghostConnection = new flow.connectionDefinitions[flow.connectionPointTypes[connection.points[0].type].connection](selectedConnectionPoint, null)
                ghostConnection.color = connectionColor.value
                for (let i = 0; i < subpointIndex + 1; i++) {
                    ghostConnection.visualPoints.push(connection.visualPoints[i])
                }
                flow.connections.push(ghostConnection)
            }
            else {
                // create a sub point
                /*const segment = connection.getHoveringSegment(...lastPointerPos) // so index of first point
                selectedConnection = connection
                connection.visualPoints.splice(segment, 0, connection.getRelative(0, 0, ...lastPointerPos))
                selectedConnectionSubPoint = segment*/
            }
        }
        else if (key == 'f' && selectedNodes != null && selectedNodes.length > 0) {
            const duplicates = []
            for (var node of selectedNodes) {
                const dupe = new flow.nodeDefinitions[node.id]()
                dupe.deserialize(JSON.parse(JSON.stringify(node.serialize())))
                dupe.position[0] += 25
                dupe.position[1] += 25
                flow.nodes.push(dupe)
                duplicates.push(dupe)
            }
            const connections = selectedNodes
                .flatMap(n => flow.getConnectionsTo(n))
                .filter((n, i, a) => a.indexOf(n) == i)
            connections.forEach(c => {
                const dupe = new flow.connectionDefinitions[c.id](
                    (duplicates[selectedNodes.indexOf(c.points[0].node)] || c.points[0].node).getConnectionPoint(c.points[0].id),
                    (duplicates[selectedNodes.indexOf(c.points[1].node)] || c.points[1].node).getConnectionPoint(c.points[1].id)
                )
                dupe.color = c.color
                for (let i = 0; i < c.visualPoints.length; i++) {
                    dupe.addPoint(c.visualPoints[i][0] + 25, c.visualPoints[i][1] + 25)
                }
                flow.connections.push(dupe)
            })

            selectedNodes.forEach(n => n.ghost = false)
            selectedNodes = duplicates
            selectedNodes.forEach(n => n.ghost = true)
        }
    })

    canvas.addEventListener('wheel', e => {
        if (e.ctrlKey)
            e.preventDefault()
        const direction = Math.sign(e.deltaY)
        const lastScale = scale
        scale *= 1 - (direction * 100) / 1000
        if (scale <= 0.01)
            scale = .01

        const lastMouse = [lastPointerPos[0] / lastScale, lastPointerPos[1] / lastScale]
        const newMouse = [lastPointerPos[0] / scale, lastPointerPos[1] / scale]
        pan[0] += newMouse[0] - lastMouse[0]
        pan[1] += newMouse[1] - lastMouse[1]
    }) // passive to make chrome stfu

    document.addEventListener('keyup', e => {
        if (heldKeys.includes(e.key.toLowerCase())) {
            heldKeys.splice(heldKeys.indexOf(e.key.toLowerCase()), 1)
        }
    })

    const saveDialog = document.querySelector('#saving-notice')
    const saveDialogStatus = document.querySelector('#saving-notice-status')

    async function serializeFlow() {
        saveDialog.showModal()
        return new Promise(resf => {
            saveDialogStatus.innerText = 'serializing...'
            const serialized = flow.serialize()
            
            // extra data
            serialized['pan'] = pan
            serialized['scale'] = scale
    
            // "save it"
            const encoded = JSON.stringify(serialized)
            new Promise(async res => {
                // make it so it isn't instantly resolved so it doesn't block the click listener
                saveDialogStatus.innerText = 'compressing...'
                await new Promise(res => setTimeout(res, 1))
                const compressed = LZString.compressToEncodedURIComponent(encoded)//JSONCrush.crush(encoded)
                res(compressed)
            }).then(compressed => {
                resf(encodeURIComponent(compressed))
                saveDialog.close()
            })
        })
    }

    document.querySelector('#save').addEventListener('click', () => {
        serializeFlow().then((compressed) => {
            const url = new URL(location.href)
            history.pushState(null, '', `${url.origin}${url.pathname}?share=${compressed}`)
            document.querySelector('#share-input').showModal()
        })
    })

    if (!document.fullscreenEnabled) {
        document.querySelector('#fullscreen').style.display = 'none'
    }

    document.querySelector('#fullscreen').addEventListener('click', () => {
        if (document.fullscreenElement != null)
            document.exitFullscreen()
        else
            document.body.requestFullscreen()
    })

    document.addEventListener('fullscreenchange', () => {
        document.querySelector('#fullscreen > .icon').innerText = document.fullscreenElement != null ? 'fullscreen_exit' : 'fullscreen'
    })

    document.querySelector('#help').addEventListener('click', () => {
        document.querySelector('#help-input').showModal()
    })

    document.querySelector('#examples').addEventListener('click', () => {
        document.querySelector('#example-input').showModal()
    })

    document.querySelector('#example-input').addEventListener('close', () => {
        const value = document.querySelector('#example-input').returnValue

        if (value != '#close') {
            const url = new URL(location.href)
            fetch(`../../flows/${flow.id}/examples/${value}.flow`).then(r => r.text()).then(example => {
                history.pushState(null, '', `${url.origin}${url.pathname}?share=${example}`)
                location.reload()
            })
        }
    })

    var editToggled = true
    document.querySelector('#edit-toggle').addEventListener('click', () => {
        editToggled = !editToggled
        document.querySelector('#edit-toggle').innerText = editToggled ? '<' : '>'
        document.querySelector('#edit-options').classList.toggle('hidden', !editToggled)
    })

    if (localStorage != null && localStorage.getItem('visited') == null) {
        localStorage.setItem('visited', Date.now())
        document.querySelector('#help-input').showModal()
    }

    const fileInput = document.querySelector('#file')
    document.querySelector('#upload').addEventListener('click', () => {
        fileInput.click()
    })

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            // load
            fileInput.files[0].text().then(data => {
                const decompressed = decompress(decodeURIComponent(data))
                flow.deserialize(decompressed)
                flow.update(context.editor)
            })
            fileInput.value = null
        }
    })

    document.querySelector('#download').addEventListener('click', () => {
        serializeFlow().then(compressed => {
            const data = new Blob([compressed], {type: 'text/plain'})
            const url = URL.createObjectURL(data)
            const link = document.createElement('a')
            link.href = url
            link.download = "saved.flow"
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(url)
        })
    })

    document.querySelector('#interaction-mode').addEventListener('change', () => {
        interactionMode = document.querySelector('#interaction-mode').checked
    })

    const summaryDialog = document.querySelector('#summary-notice')
    const summaryNodes = document.querySelector('#summary-nodes')
    const summaryConnections = document.querySelector('#summary-connections')

    document.querySelector('#summary').addEventListener('click', () => {
        summaryNodes.innerHTML = Object.entries(flow.nodes.map(n => n.display).reduce((prev, cur) => {
            prev[cur] = prev[cur] ?? 0
            prev[cur] += 1
            return prev
        }, {})).sort((a, b) => b[1] - a[1]).map((v, i) => `x${v[1]} ${v[0]}`).join('<br />')
        summaryConnections.innerHTML = Object.entries(flow.connections.map(n => n.display).reduce((prev, cur) => {
            prev[cur] = prev[cur] ?? 0
            prev[cur] += 1
            return prev
        }, {})).sort((a, b) => b[1] - a[1]).map((v, i) => `x${v[1]} ${v[0]}`).join('<br />')
        summaryDialog.showModal()
    })

    requestAnimationFrame(draw)
}

// listen
if (document.readyState !== 'loading')
    main()
else
    document.addEventListener('DOMContentLoaded', main)