/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "memory_cell"
    static display    = "Memory Cell"
    static size       = [1, 1.25]
    static icon       = "$assets/memory_cell.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Set')
        this.addConnectionPoint('input', 'left', '#right', 'Reset')
        this.addConnectionPoint('output', 'right', '#result', 'Stored')
        this.setConnectionPointValue('#result', 0)

        this.value = 0
        this.lastLeft = 0
        this.lastRight = 0

        //this.cache = new OffscreenCanvas(...this.getSize(10))
        //this.invalidated = true
        this.cached = true // tell node we are caching stuff
    }

    serialize() {
        const data = super.serialize()
        data['value'] = this.value
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.value = data.value || 0
        this.setConnectionPointValue('#result', this.value)
    }

    update() {
        super.update()

        const currentOutput = this.getLocalConnectionPointValue('#result')
        const left = this.getConnectionPointValue('#left')
        const right = this.getConnectionPointValue('#right')
        if (left != this.lastLeft) {
            this.lastLeft = left
            if (left > 0 && this.value == 0) {
                this.value = left
                this.invalidated = true
            }
        }
        if (right != this.lastRight) {
            this.lastRight = right
            if (right > 0 && this.value != 0) {
                this.value = 0
                this.invalidated = true
            }
        }
        
        var setOutput = this.value
        if (setOutput != currentOutput) {
            this.setConnectionPointValue('#result', setOutput)
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        const context2 = super.draw(context)
        if (!context2)
            return this.cacheDraw(context)

        const size = this.getSize()

        /*if (!this.invalidated)
            return
        this.invalidated = false*/

        // draw
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1
        const offset = radius / 3
        context2.beginPath()

        // MEMORY CELL symbol
        context2.lineCap = 'round'

        context2.strokeStyle = this.value != 0 ? this.ON_COLOR : this.OFF_COLOR
        for (let i = 0; i < 5; i++) {
            const y = ((i + 1) / 6)
            context2.beginPath()
            context2.moveTo(centerX - radius, centerY - radius + y * radius * 2)
            context2.lineTo(centerX - radius + offset, centerY - radius + y * radius * 2)
            context2.moveTo(centerX + radius - offset, centerY - radius + y * radius * 2)
            context2.lineTo(centerX + radius, centerY - radius + y * radius * 2)
            context2.stroke()
        }
        
        context2.beginPath()
        context2.strokeStyle = '#000'
        context2.moveTo(centerX - radius + offset, centerY - radius) // tl
        context2.lineTo(centerX + radius - offset, centerY - radius) // tr
        context2.lineTo(centerX + radius - offset, centerY + radius) // br
        context2.lineTo(centerX - radius + offset, centerY + radius) // bl
        context2.closePath()
        context2.stroke()

        console.log('cache draw')
        this.cacheDraw(context)
    }
}