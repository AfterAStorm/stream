/* node */

import { BaseNode } from "/flows/node.js"

export class Node extends BaseNode {
    static id         = "gate_not"
    static display    = "NOT"
    static size       = [1, .5]
    static icon       = "$assets/not_gate.png"//"https://static.wikia.nocookie.net/oaklands/images/8/87/Not_gate.png"
    static category   = "logic gates"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Input')
        this.addConnectionPoint('output', 'right', '#result', 'NOT Result, only outputs 10 when the input is 0\n**Outputs: ⚡ 10')
        this.setConnectionPointValue('#result', 0)

        this.pressed = false
        this.cooldown = false
    }

    deserialize(data) {
        super.deserialize(data)
        this.needsConnectionUpdate = true
    }

    update() {
        super.update()

        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = this.getConnectionPointValue('#left') > 0 ? 0 : 10
        
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
        context.strokeStyle = '#000'
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1
        context.beginPath()

        // output line
        context.strokeStyle = this.getLocalConnectionPointValue('#result') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(centerX + radius, centerY)
        context.lineTo(size[0] - 7, centerY)
        context.stroke()

        // NOT GATE symbol
        context.strokeStyle = '#000'
        context.lineCap = 'round'
        context.beginPath()
        context.arc(centerX + radius - 4, centerY, 4, 0, Math.PI * 2)

        context.moveTo(centerX - radius, centerY - radius)
        context.lineTo(centerX + radius - 8, centerY)
        context.lineTo(centerX - radius, centerY + radius)
        context.lineTo(centerX - radius, centerY - radius)
        context.stroke()

        // left line
        context.strokeStyle = this.getConnectionPointValue('#left') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        var y = this.connectionPoints[0].staticPosition[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius, y)
        context.stroke()

    }
}