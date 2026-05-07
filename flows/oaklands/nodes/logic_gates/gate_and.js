/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "gate_and"
    static display    = "AND"
    static size       = [1, 1.25]
    static icon       = "$assets/and_gate.png"//"https://static.wikia.nocookie.net/oaklands/images/c/c7/ANDComponent.png"
    static category   = "logic gates"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Left Input')
        this.addConnectionPoint('input', 'left', '#right', 'Right Input')
        this.addConnectionPoint('output', 'right', '#result', 'AND Result, when left and right inputs are the same\n**Outputs: ⚡ LEFT/RIGHT VALUE')
        this.setConnectionPointValue('#result', 0)

        this.cached = true

        this.pressed = false
        this.cooldown = false

        this.value = 0
    }

    _calculate() {
        const left = this.getConnectionPointValue('#left')
        this.value = left == this.getConnectionPointValue('#right') ? left : 0
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
        //super.draw(context)
        const context2 = super.draw(context)
        if (!context2)
            return this.cacheDraw(context)
        const orig = context
        context = context2

        const size = this.getSize()

        // draw
        context.strokeStyle = 'black'
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1
        context.beginPath()

        // AND GATE symbol
        context.lineCap = 'round'
        context.moveTo(centerX - radius, centerY - radius)
        context.lineTo(centerX, centerY - radius)

        context.arc(centerX, centerY, radius, -Math.PI / 2, Math.PI / 2)

        context.moveTo(centerX, centerY + radius)
        context.lineTo(centerX - radius, centerY + radius)
        context.lineTo(centerX - radius, centerY - radius)
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
        context.lineTo(centerX - radius, y)
        context.stroke()

        // right line
        context.strokeStyle = this.getLocalConnectionPointValue('#right') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        y = this.connectionPoints[1].staticPosition[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius, y)
        context.stroke()

        this.cacheDraw(orig)
    }
}