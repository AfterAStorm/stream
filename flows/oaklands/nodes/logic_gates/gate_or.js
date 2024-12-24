/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "gate_or"
    static display    = "OR"
    static size       = [1, 1.25]
    static icon       = "$assets/or_gate.png"//"https://static.wikia.nocookie.net/oaklands/images/7/76/ORgate.png"
    static category   = "logic gates"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Left Input')
        this.addConnectionPoint('input', 'left', '#right', 'Right Input')
        this.addConnectionPoint('output', 'right', '#result', 'OR Result, outputs the higher of the two values\n**Outputs: ⚡ HIGHEST VALUE')
        this.setConnectionPointValue('#result', 0)

        this.pressed = false
        this.cooldown = false
    }

    update() {
        super.update()

        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = Math.max(this.getConnectionPointValue('#left'), this.getConnectionPointValue('#right'))
        
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
        context.strokeStyle = 'black'
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1

        // OR GATE symbol
        context.lineCap = 'round'

        context.beginPath()
        context.bezierCurveTo(centerX - radius, centerY - radius, centerX + 10, centerY - 30, centerX + radius, centerY)
        //context.ellipse(centerX - 15, centerY, radius + 15, radius, 0, Math.PI * 3 / 2, Math.PI / 2)
        context.stroke()
        
        context.beginPath()
        context.bezierCurveTo(centerX - radius, centerY + radius, centerX + 10, centerY + 30, centerX + radius, centerY)
        context.stroke()
        
        context.beginPath()
        context.bezierCurveTo(centerX - radius, centerY - radius, centerX, centerY, centerX - radius, centerY + radius)
        context.stroke()

        // output line
        context.strokeStyle = this.getLocalConnectionPointValue('#result') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(centerX + radius, centerY)
        context.lineTo(size[0] - 7, centerY)
        context.stroke()

        // left line
        context.strokeStyle = this.getLocalConnectionPointValue('#left') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        var y = this.connectionPoints[0].staticPosition[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius + 2, y)
        context.stroke()

        // right line
        context.strokeStyle = this.getLocalConnectionPointValue('#right') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        y = this.connectionPoints[1].staticPosition[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius + 2, y)
        context.stroke()

    }
}