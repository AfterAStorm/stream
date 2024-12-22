/* node */

import { BaseNode } from "/flows/node.js"

export class Node extends BaseNode {
    static id         = "gate_xnor"
    static display    = "XNOR"
    static size       = [1, 1.25]
    static icon       = "$assets/xnor_gate.png"//"https://static.wikia.nocookie.net/oaklands/images/7/76/ORgate.png"
    static category   = "logic gates"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Left Input')
        this.addConnectionPoint('input', 'left', '#right', 'Right Input')
        this.addConnectionPoint('output', 'right', '#result', 'XNOR Result, google it\n**Outputs: ⚡ XNOR VALUE')
        this.setConnectionPointValue('#result', 0)

        this.pressed = false
        this.cooldown = false
    }

    update() {
        super.update()

        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = this.getConnectionPointValue('#left') ^ this.getConnectionPointValue('#right')
        if (setOutput > 0)
            setOutput = 0
        else
            setOutput = 10
        
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
        //context.ellipse(centerX - , centerY, 15, radius, 0, Math.PI * 3 / 2, Math.PI / 2)
        context.stroke()
        
        context.beginPath()
        context.bezierCurveTo(centerX - radius - 5, centerY - radius, centerX - 5, centerY, centerX - radius - 5, centerY + radius)
        //context.ellipse(centerX - , centerY, 15, radius, 0, Math.PI * 3 / 2, Math.PI / 2)
        context.stroke()

        // output line
        context.strokeStyle = this.getLocalConnectionPointValue('#result') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(centerX + radius + 8, centerY)
        context.lineTo(size[0] - 7, centerY)
        context.stroke()

        // not symbol
        context.strokeStyle = '#000'
        context.beginPath()
        context.ellipse(centerX + radius + 4, centerY, 4, 4, 0, 0, Math.PI * 2)
        context.stroke()



        /*context.moveTo(centerX - radius, centerY - radius)
        context.lineTo(centerX, centerY - radius)

        context.arc(centerX, centerY, radius, -Math.PI / 2, Math.PI / 2)

        context.moveTo(centerX, centerY + radius)
        context.lineTo(centerX - radius, centerY + radius)
        context.lineTo(centerX - radius, centerY - radius)
        context.stroke()*/

        // left line
        context.strokeStyle = this.getConnectionPointValue('#left') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        var y = this.connectionPoints[0].staticPosition[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius + 2, y)
        context.stroke()

        // right line
        context.strokeStyle = this.getConnectionPointValue('#right') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        y = this.connectionPoints[1].staticPosition[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius + 2, y)
        context.stroke()

    }
}