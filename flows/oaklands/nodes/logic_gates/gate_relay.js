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
        
        this.value = 0
        this.gate = 0

        this.cached = true
    }

    updateState() {
        const current = this.getLocalConnectionPointValue('#result')
        if (this.gate > 0) {
            if (this.value != current) {
                this.setConnectionPointValue('#result', this.value)
            }
        }
        else {
            if (current != 0) {
                this.setConnectionPointValue('#result', 0)
            }
        }
    }

    update(updatedValue) {
        super.update()

        const value = this.getConnectionPointValue(updatedValue)
        switch (updatedValue) {
            case "#left":
                // this.getLocalConnectionPointValue('#result') // can use this.value for saving purposes
                if (value != this.value) {
                    this.value = value
                    this.invalidate()
                    this.updateState()
                }
                break
            case "#right":
                if (value != this.gate) {
                    this.gate = value
                    this.invalidate()
                    this.updateState()
                }
                break
            default:
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
        this.cacheDraw(orig)
    }
}