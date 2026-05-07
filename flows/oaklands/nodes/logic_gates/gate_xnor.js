/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "gate_xnor" // internally still the same though :p
    static display    = "XAND"
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

    _calculate() {
        const left = this.getConnectionPointValue('#left')
        const right = this.getConnectionPointValue('#right')
        this.value = left == 0 && right == 0 ? 10 : (left == right ? left : (0))
        return this.value
    }

    update(updatedValue) {
        super.update()

        switch(updatedValue) {
            case '#left':
            case '#right':
                this.invalidate()
                this.setConnectionPointValue('#result', this._calculate())
                break
            default:
                if (this.getLocalConnectionPointValue('#result') != this.value)
                    this.setConnectionPointValue('#result', this.value)
                break
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

        // XNOR GATE symbol
        context.lineCap = 'round'

        context.beginPath()
        context.bezierCurveTo(centerX - radius, centerY - radius, centerX + 10, centerY - 30, centerX + radius, centerY)
        context.stroke()
        
        context.beginPath()
        context.bezierCurveTo(centerX - radius, centerY + radius, centerX + 10, centerY + 30, centerX + radius, centerY)
        context.stroke()
        
        context.beginPath()
        context.bezierCurveTo(centerX - radius, centerY - radius, centerX, centerY, centerX - radius, centerY + radius)
        context.stroke()
        
        context.beginPath()
        context.bezierCurveTo(centerX - radius - 5, centerY - radius, centerX - 5, centerY, centerX - radius - 5, centerY + radius)
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