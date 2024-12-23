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
    }

    serialize() {
        const data = super.serialize()
        data['value'] = this.value
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.value = data.value || 0
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
            }
        }
        if (right != this.lastRight) {
            this.lastRight = right
            if (right > 0 && this.value != 0) {
                this.value = 0
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
        super.draw(context)

        const size = this.getSize()

        // draw
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1
        const offset = radius / 3
        context.beginPath()

        // MEMORY CELL symbol
        context.lineCap = 'round'

        context.strokeStyle = this.value != 0 ? this.ON_COLOR : this.OFF_COLOR
        for (let i = 0; i < 5; i++) {
            const y = ((i + 1) / 6)
            context.beginPath()
            context.moveTo(centerX - radius, centerY - radius + y * radius * 2)
            context.lineTo(centerX - radius + offset, centerY - radius + y * radius * 2)
            context.moveTo(centerX + radius - offset, centerY - radius + y * radius * 2)
            context.lineTo(centerX + radius, centerY - radius + y * radius * 2)
            context.stroke()
        }
        
        context.beginPath()
        context.strokeStyle = '#000'
        context.moveTo(centerX - radius + offset, centerY - radius) // tl
        context.lineTo(centerX + radius - offset, centerY - radius) // tr
        context.lineTo(centerX + radius - offset, centerY + radius) // br
        context.lineTo(centerX - radius + offset, centerY + radius) // bl
        context.closePath()
        context.stroke()

    }
}