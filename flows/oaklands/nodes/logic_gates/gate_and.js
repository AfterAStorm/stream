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

        this.lastLeft = 0
        this.lastRight = 0
    }

    update() {
        super.update()

        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = 0
        const left = this.getConnectionPointValue('#left')
        const right = this.getConnectionPointValue('#right')
        if (left == right) {
            setOutput = left
        }

        if (left != this.lastLeft) {
            this.lastLeft = left
            this.invalidated = true
        }

        if (right != this.lastRight) {
            this.lastRight = right
            this.invalidated = true
        }
        
        if (setOutput != currentOutput) {
            this.setConnectionPointValue('#result', setOutput)
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