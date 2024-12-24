/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "gate_relay"
    static display    = "Relay"
    static size       = [1, 1.25]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/2/2e/RELAYComponent.png"
    static category   = "logic gates"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Left Input')
        this.addConnectionPoint('input', 'left', '#right', 'Right Input, when greater than 0, lets the left input passthrough')
        this.addConnectionPoint('output', 'right', '#result', 'RELAY Result, outputs the left input when the right is greater than 0')
        this.setConnectionPointValue('#result', 0)

        this.pressed = false
        this.cooldown = false
    }

    update() {
        super.update()

        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = 0
        const right = this.getConnectionPointValue('#right')
        if (right > 0) {
            setOutput = this.getConnectionPointValue('#left')
        }
        
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
        context.beginPath()

        // RELAY GATE symbol
        context.lineCap = 'round'
        context.moveTo(centerX - radius, centerY - radius)
        context.lineTo(centerX + radius, centerY - radius)

        context.arc(centerX, centerY, radius, 0, Math.PI / 2)

        context.moveTo(centerX, centerY + radius)
        context.lineTo(centerX - radius, centerY + radius)
        context.lineTo(centerX - radius, centerY - radius)
        context.stroke()

        // output line
        const distanceFromSymbolToEdge = size[0] - (centerX + radius) - 7 / 2

        context.strokeStyle = this.getLocalConnectionPointValue('#result') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(centerX + radius, centerY - radius / 2)
        context.lineTo(centerX + radius + distanceFromSymbolToEdge / 2, centerY - radius / 2)
        context.lineTo(centerX + radius + distanceFromSymbolToEdge / 2, centerY)
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

    }
}