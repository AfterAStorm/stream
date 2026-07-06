/* web */

import { Flow } from "./flow.js"
import { Profiler } from "./profiler.js"
import { EditorState } from "./state.js"
import { compress, decompress } from "./compression.js"
import { showInfoModal } from "./modal.js"

function strip(str, char) {
    while (str.startsWith(char))
        str = str.substring(1)
    while (str.endsWith(char))
        str = str.substring(0, str.length - 1)
    return str
}

class Editor {
    share_server = 'https://stream-share.bytestorm.sh/'

    /**
     * 
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(canvas) {
        this.canvas = canvas
        this.context = canvas.getContext('2d')
        this.main_flow = new Flow() // core flow, contains subflows; (.subflows)-- managed with setting .flow
        this.flow = this.main_flow // active flow
        this.state = new EditorState()
        this.state.hook(this)

        this.lastTimestamp = 0
        this.lastDraw = 0
        this.delta = 0
        this.loading = false
        this.shouldResetContextEachFrame = false
        this.contextResetBenchmarkDone = false
        
        requestAnimationFrame(() => this.benchmarkContextReset())
        requestAnimationFrame(this.loop)
    }

    benchmarkContextReset() {
        const context = this.context
        if (!context.reset) {
            this.contextResetBenchmarkDone = true
            return
        }

        try {
            const drawWork = reset => {
                if (reset)
                    context.reset()
                context.setTransform(1, 0, 0, 1, 0, 0)
                context.fillStyle = '#777196'
                context.fillRect(0, 0, 1600, 900)
                context.fillStyle = '#ddd'
                context.strokeStyle = '#555'
                context.rect(10, 10, 40, 20)
                context.fill()
                context.stroke()
            }
            const measure = reset => {
                const iterations = 80
                drawWork(reset)
                const start = performance.now()
                for (let i = 0; i < iterations; i++)
                    drawWork(reset)
                return performance.now() - start
            }

            const noResetMs = measure(false) + measure(false)
            context.reset()
            const resetMs = measure(true) + measure(true)
            this.shouldResetContextEachFrame = resetMs < noResetMs * .8
        }
        catch (e) {
            this.shouldResetContextEachFrame = false
        }
        finally {
            this.contextResetBenchmarkDone = true
            context.reset()
        }
    }

    async update(dt) {
        if (this.loading) {
            this.delta = 0
            return
        }
        const millisecondsPerUpdate = (this.flow.updateSpeed || 1) * 1000
        this.delta += Math.min(dt, 100)

        if (this.delta >= millisecondsPerUpdate)
            upprofiler.group('update')

        var updates = 0
        while (this.delta >= millisecondsPerUpdate /*&& !(this.state.debug && context.editor.pause)*/) {
            upprofiler.group(`update ${updates}`)
            this.delta -= millisecondsPerUpdate
            this.main_flow.update(this.state)
            if (this.flow != this.main_flow)
                this.flow.update(this.state) // for editing subflows, we need to make sure the nodes are working correctly :D
            updates += 1
            upprofiler.close()
            if (updates > 9) {
                console.warn('>=10 updates in a single frame, aborting')
                this.delta = 0
                break
            }
        }
        
        if (upprofiler.groupDepth > 0) {
            upprofiler.close()
            upprofiler.log()
        }
    }
    
    async draw() {
        const canvas = this.canvas
        const context = this.context

        const pan = this.state.pan
        const scale = this.state.scale
        const gridSize = this.state.gridSize

        const dpr = window.devicePixelRatio || 1
        const width = canvas.clientWidth
        const height = canvas.clientHeight

        // correct sizes. Reassigning canvas dimensions every frame clears the
        // backing store and can leave large cached flows blank under load.
        if (canvas.width != Math.round(width * dpr))
            canvas.width = Math.round(width * dpr)
        if (canvas.height != Math.round(height * dpr))
            canvas.height = Math.round(height * dpr)
    
        context.width = width
        context.height = height
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        this.state.viewport = {
            left: -pan[0],
            top: -pan[1],
            right: width * (1 / scale) - pan[0],
            bottom: height * (1 / scale) - pan[1]
        }

        // profile
        profiler.group('draw')
        profiler.group('grid')

        // clear
        if (this.shouldResetContextEachFrame)
            context.reset()
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        //context.clearRect(0, 0, canvas.width, canvas.height)
        context.fillStyle = '#777196'
        context.fillRect(0, 0, width, height)

        // draw grid
        context.strokeStyle = '#ddd'
        context.globalAlpha = .35
        context.lineWidth = 1
        context.setLineDash([])

        // bound the grid to a minimum 8px gap
        const minGridSpacing = 8
        const gridStep = gridSize * Math.max(1, Math.ceil(minGridSpacing / (gridSize * scale)))

        context.scale(scale, scale)
        // this is incredibly elegant and i love it
        context.translate(pan[0] % gridStep, pan[1] % gridStep)

        const gridWidth  = width  * (1 / scale) + gridStep * 2
        const gridHeight = height * (1 / scale) + gridStep * 2

        context.beginPath()
        for (let x = -gridStep * 2; x < gridWidth; x += gridStep) {
            context.moveTo(x, -gridStep * 2)
            context.lineTo(x, gridHeight)
        }
        for (let y = -gridStep * 2; y < gridHeight; y += gridStep) {
            context.moveTo(-gridStep * 2, y)
            context.lineTo(gridWidth, y)
        }
        context.stroke()

        profiler.swap('flow')
    
        // draw nodes
        context.globalAlpha = 1
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        context.scale(scale, scale)
        context.translate(pan[0], pan[1])

        this.flow.draw(context)

        profiler.swap('tooltips')

        context.strokeStyle = '#0a0'
        context.lineWidth = 2
        this.state.selectedPoints.forEach(point => {
            context.save()

            const size = point.node.getSize()
            const rotation = point.node.rotation
            context.translate(...point.node.position)
            //context.translate(size[0] / 2, size[1] / 2)
            //context.rotate(-rotation * (Math.PI / 180))
            //context.translate(-size[0] / 2, -size[1] / 2)

            context.beginPath()
            context.arc(...point.position, 7, 0, Math.PI * 2)
            context.stroke()

            context.restore()
        })

        // draw tooltips
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        const pos = this.state.position
        if (this.state.hoveredPoint != null) {
            context.fillStyle = '#ddd'
            context.font = '15px monospace'
            context.textAlign = 'left'
            context.textBaseline = 'middle'
            const tooltip = '*' + this.state.hoveredPoint.node.display + '\n' + this.state.hoveredPoint.tooltip
            const sizeNeeded = context.measureText(tooltip.split('\n').sort((a, b) => b.length - a.length)[0]) // measure by the longest line
            const lines = tooltip.split('\n')
            context.beginPath()
            context.roundRect(pos[0] - sizeNeeded.width / 2, pos[1] - 15 * lines.length - 10, sizeNeeded.width + 10, lines.length * 15 + 2, 10)
            context.fill()

            context.fillStyle = '#000'
            for (let i = 0; i < lines.length; i++) {
                context.font = lines[i].startsWith('*') ? (lines[i].startsWith('**') ? 'bold 15px monospace' : 'italic 15px monospace') : '15px monospace'
                context.fillText(strip(lines[i], '*'), pos[0] - sizeNeeded.width / 2 + 5, pos[1] - 15 - 15 * (lines.length - 1) + 15 * i)
            }
            
            context.fillStyle = '#555'
            context.font = '15px monospace'
            const message = `${this.state.hoveredPoint.value}`// (o${this.flow.nodes.indexOf(this.state.hoveredPoint.node)})`
            const valueSizeNeeded = context.measureText(message)
            context.beginPath()
            context.roundRect(pos[0] - valueSizeNeeded.width / 2, pos[1] + 20, valueSizeNeeded.width + 10, 20, 10)
            context.fill()
            
            context.fillStyle = '#fff'
            context.fillText(message, pos[0] - valueSizeNeeded.width / 2 + 5, pos[1] + 30)
        }
        else if (this.state.hoveredConnection != null) {
            context.fillStyle = '#555'
            context.font = '15px monospace'
            context.textAlign = 'left'
            context.textBaseline = 'middle'
            const message = `${this.state.hoveredConnection.value} (order ${this.state.hoveredConnection.getHoveringSegment(...this.state.position) ?? 'n/a'})`
            const valueSizeNeeded = context.measureText(message)
            context.beginPath()
            context.roundRect(pos[0] - valueSizeNeeded.width / 2, pos[1] + 20, valueSizeNeeded.width + 10, 20, 10)
            context.fill()
            
            context.fillStyle = '#fff'
            context.fillText(message, pos[0] - valueSizeNeeded.width / 2 + 5, pos[1] + 30)
        }

        // draw selection
        if (this.state.selectionStart != null) {
            context.strokeStyle = '#faa'
            context.lineWidth = 2
            context.setLineDash([5])
            context.beginPath()
            context.rect(this.state.selectionStart[0], this.state.selectionStart[1], pos[0] - this.state.selectionStart[0], pos[1] - this.state.selectionStart[1])
            context.stroke()
        }

        // draw snap!
        this.state.snappingLines.forEach(line => {
            // [[srcx, srcy], [x, y]]
            //const axis = this.state.snappingLine[0]
            const src = this.state.flowToScreen(...line[0])
            const point = this.state.flowToScreen(...line[1])
            const dir = [point[0] - src[0], point[1] - src[1]]

            var rect = [0, 0, canvas.width, canvas.height]

            const to = [src[0] + dir[0] * 100, src[1] + dir[1] * 100] // we assume this is in bounds

            //const slope = axis[0] == 0 ? 0 : axis[1] / axis[0] // rise/run
            //const invslope = 1 / slope // rise/run

            const from = [
                src[0],//(point[0] + axis[0] * (-point[0])),
                src[1]//(point[1] + axis[1] * ((canvas.width - point[0]) * -slope * point[1])),
            ]

            /*const to = [
                point[0],//(point[0] + axis[0] * (canvas.width - point[0])),
                point[1]//(point[1] + axis[1] * ((canvas.width - point[0]) * slope * point[1])),
            ]*/

            //console.log(axis, point, slope, from, to)

            context.strokeStyle = '#faa'
            context.lineWidth = 3
            context.setLineDash([8])
            context.beginPath()
            context.moveTo(...from)
            context.lineTo(...to)
            context.stroke()
        })

        profiler.close()
        profiler.close()
    }
    
    loop = async (timestamp) => {
        // calculate delta
        const delta = timestamp - this.lastTimestamp
        this.lastTimestamp = timestamp

        // extra updates
        this.state.update(delta)

        // attempt update
        await this.update(delta)
    
        // attempt draw
        if (timestamp > this.lastDraw + 1/60) {
            this.lastDraw = timestamp
            await this.draw(delta)
        }
        
        // profile
        profiler.log()

        // loop
        requestAnimationFrame(this.loop)
    }

    async load(shareCompressedData) { // "decompress/deserialize"
        this.loading = true
        try {
            const saveState = shareCompressedData instanceof Object ? shareCompressedData : decompress(shareCompressedData)
            this.state.deserialize(saveState)
            await this.main_flow.deserialize(saveState)
            this.flow = this.main_flow
            this.main_flow.nodes.forEach(node => {
                node.invalidate()
                node.needsConnectionUpdate = true
            })
            this.main_flow.connections.forEach(connection => connection.invalidatePoints?.())
        }
        finally {
            this.delta = 0
            this.loading = false
        }
        //console.log(this.main_flow, saveState)
    }

    save(compressed=true) { // "serialize/compress"
        const data = this.main_flow.serialize()
        Object.entries(this.state.serialize()).forEach(pair => data[pair[0]] = pair[1])

        return compressed ? compress(data) : data
    }
}

async function main() {
    // check url for stream options
    const params = new URLSearchParams(location.search)

    const flowId = params.get('flow') || 'oaklands' // "oaklands" is "quote" on "quote" temporary
    const exampleName = params.get('example')
    let shareData = params.get('share')

    // setup editor
    window.profiler = new Profiler() // draw profiler
    window.upprofiler = new Profiler() // update profiler
    window.editor = new Editor(
        document.querySelector('#chart')
    )

    // handle params
    if (shareData != null) {
        let shareContents = shareData
        if (shareData.length == 8) {
            // share code!
            const request = await fetch(editor.share_server + 'share/' + shareData)
            if (request.status !== 200)
                shareContents = null
            else
                shareContents = await request.json()
            if (shareContents == null) {
                showInfoModal("failed to fetch share", "Could not fetch the shared flow, is it an invalid code or did you lose internet connection?")
                shareData = null
            }
        }
        if (shareContents != null) {
            try {
                await editor.load(shareContents)
                return
            }
            catch (e) {
                console.error(e)
            }
        }
    }
    
    if (flowId != null && exampleName != null) {
        document.querySelector('#file-name').innerHTML = exampleName
        const data = await fetch(`../../flows/${flowId}/examples/${exampleName}.flow`).then(r => r.text())
        await editor.load(data)
    }
    else {
        await editor.load({
            flow: flowId ?? 'oaklands',
            pan: [0, 0],
            scale: 1,
            connections: [],
            nodes: []
        })
    }
}

if (document.readyState !== 'loading')
    main()
else
    document.addEventListener('DOMContentLoaded', main)
