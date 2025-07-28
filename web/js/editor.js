/* web */

import { Flow } from "./flow.js"
import { Profiler } from "./profiler.js"
import { EditorState } from "./state.js"
import { compress, decompress } from "./compression.js"

function strip(str, char) {
    while (str.startsWith(char))
        str = str.substring(1)
    while (str.endsWith(char))
        str = str.substring(0, str.length - 1)
    return str
}

class Editor {
    /**
     * 
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(canvas) {
        this.canvas = canvas
        this.context = canvas.getContext('2d')
        this.flow = new Flow()
        this.state = new EditorState()
        this.state.hook(this)

        this.lastTimestamp = 0
        this.delta = 0
        
        requestAnimationFrame(this.loop)
    }

    async update(dt) {
        const millisecondsPerUpdate = (this.flow.updateSpeed || 1) * 1000
        this.delta += dt

        if (this.delta >= millisecondsPerUpdate)
            upprofiler.group('update')

        var updates = 0
        while (this.delta >= millisecondsPerUpdate /*&& !(this.state.debug && context.editor.pause)*/) {
            upprofiler.group(`update ${updates}`)
            this.delta -= millisecondsPerUpdate
            this.flow.update(this.state)
            updates += 1
            upprofiler.close()
            if (updates > 9) {
                console.warn('>=10 updates in a single frame, aborting')
                this.delta = 0
            }
            break
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

        // correct sizes
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
    
        context.width = canvas.width
        context.height = canvas.height

        // profile
        profiler.group('draw')
        profiler.group('grid')

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

        profiler.swap('flow')
    
        // draw nodes
        context.globalAlpha = 1
        context.resetTransform()
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
        context.resetTransform()
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
            const message = `${this.state.hoveredPoint.value} (o${this.flow.nodes.indexOf(this.state.hoveredPoint.node)})`
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
            const message = `${this.state.hoveredConnection.value} (o${this.flow.connections.indexOf(this.state.hoveredConnection)})`
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
            context.setLineDash([5])
            context.beginPath()
            context.rect(this.state.selectionStart[0], this.state.selectionStart[1], pos[0] - this.state.selectionStart[0], pos[1] - this.state.selectionStart[1])
            context.stroke()
        }

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
        await this.draw(delta)
        
        // profile
        profiler.log()

        // loop
        requestAnimationFrame(this.loop)
    }

    load(shareCompressedData) { // "decompress/deserialize"
        const saveState = shareCompressedData instanceof Object ? shareCompressedData : decompress(shareCompressedData)
        this.state.deserialize(saveState)
        this.flow.deserialize(saveState)
    }

    save() { // "serialize/compress"
        const data = this.flow.serialize()
        Object.entries(this.state.serialize()).forEach(pair => data[pair[0]] = pair[1])

        return compress(data)
    }
}

async function main() {
    // check url for stream options
    const params = new URLSearchParams(location.search)

    const flowId = params.get('flow') || 'oaklands' // "oaklands" is "quote" on "quote" temporary
    const exampleName = params.get('example')
    const shareData = params.get('share')

    // setup editor
    window.profiler = new Profiler() // draw profiler
    window.upprofiler = new Profiler() // update profiler
    window.editor = new Editor(
        document.querySelector('#chart')
    )

    // handle params
    if (shareData != null) {
        editor.load(shareData)
    }
    else if (flowId != null) {
        if (exampleName != null) {
            document.querySelector('#file-name').innerHTML = exampleName
            fetch(`../../flows/${flowId}/examples/${exampleName}.flow`).then(r => r.text()).then(data => editor.load(data))
        }
        else {
            editor.load({
                flow: flowId,
                pan: [0, 0],
                scale: 1,
                connections: [],
                nodes: []
            })
        }
    }
}

if (document.readyState !== 'loading')
    main()
else
    document.addEventListener('DOMContentLoaded', main)