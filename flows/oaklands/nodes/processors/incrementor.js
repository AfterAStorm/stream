/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "incrementor"
    static display    = "Incrementor"
    static size       = [1, 1.25]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/2/2e/RELAYComponent.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Input, increments about x / 10')
        this.addConnectionPoint('input', 'left', '#right', 'Reset, sets to 0')
        this.addConnectionPoint('output', 'right', '#result', 'The current count')
        this.setConnectionPointValue('#result', 0)

        this.count = 0
        this.lastLeft = 0
        this.lastRight = 0

        this.cached = true
    }

    serialize() {
        const data = super.serialize()
        data['count'] = this.count
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.count = data.count
        this.setConnectionPointValue('#result', this.count)
    }

    update() {
        super.update()

        const currentOutput = this.getLocalConnectionPointValue('#result')
        const left = this.getConnectionPointValue('#left')
        const right = this.getConnectionPointValue('#right')
        if (left != this.lastLeft) {
            this.lastLeft = left
            this.count += left / 10
            //this.count = Math.floor(this.count * 100) / 100 // rounding is for nerds
        }
        if (right != this.lastRight) {
            this.lastRight = right
            if (right > 0)
                this.count = 0
        }
        
        var setOutput = this.count
        if (setOutput != currentOutput) {
            this.setConnectionPointValue('#result', setOutput)
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        const cachedContext = super.draw(context)
        if (!cachedContext)
            return this.cacheDraw(context)

        const size = this.getSize()

        // draw
        cachedContext.strokeStyle = 'black'
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1
        cachedContext.beginPath()

        // INCREMENTOR symbol
        cachedContext.lineCap = 'round'
        cachedContext.moveTo(centerX - radius, centerY - radius)
        cachedContext.lineTo(centerX - radius, centerY + radius)
        cachedContext.stroke()

        cachedContext.fillStyle = '#000'
        const barHeight = (radius * 2) / 5
        for (let i = 0; i < 5; i++) {
            cachedContext.fillRect(centerX - radius, centerY - radius + i * barHeight, radius * 2 * ((i + 1) / 5), barHeight - 1)
        }
        this.cacheDraw(context)
    }
}