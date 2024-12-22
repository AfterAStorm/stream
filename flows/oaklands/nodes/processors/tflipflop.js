/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "tflipflop"
    static display    = "T-Flip Flop"
    static size       = [1, .5]
    static icon       = "$assets/tflipflop.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#in', 'Flop, whenever the value is > 0, flip from off/on')
        this.addConnectionPoint('output', 'right', '#result', 'State, if the T-Flip Flop is active\n**Outputs: ⚡ INPUT')
        this.setConnectionPointValue('#result', 0)

        this.value = 0
        this.last = 0
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

        //const currentOutput = this.getLocalConnectionPointValue('#result')
        const input = this.getConnectionPointValue('#in')
        if (this.last != input) {
            this.last = input
            if (input != 0) {
                if (this.value > 0)
                    this.value = 0
                else
                    this.value = input
                this.setConnectionPointValue('#result', this.value)
            }
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
        const offset = radius

        // T-FLIP FLOP symbol
        context.lineCap = 'round'

        context.strokeStyle = '#000'
        context.beginPath()
        context.rect(centerX - radius, centerY - radius, radius * 2, radius * 2)
        context.stroke()
        for (let i = 0; i < 2; i++) {
            const y = ((i + 1) / 3)
            context.beginPath()
            context.moveTo(centerX - radius, centerY - radius + y * radius * 2)
            context.lineTo(centerX - radius - offset, centerY - radius + y * radius * 2)
            context.moveTo(centerX + radius + offset, centerY - radius + y * radius * 2)
            context.lineTo(centerX + radius, centerY - radius + y * radius * 2)
            context.stroke()
        }
        
        const y = (2 / 3)
        context.beginPath()
        context.moveTo(centerX - radius, centerY - radius + y * radius * 2 - 3)
        context.lineTo(centerX - radius + 7, centerY - radius + y * radius * 2)
        context.lineTo(centerX - radius, centerY - radius + y * radius * 2 + 3)
        context.stroke()

    }
}