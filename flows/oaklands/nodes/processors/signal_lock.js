/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "signal_lock"
    static display    = "Signal Lock"
    static size       = [1, 1.25]
    static icon       = "$assets/signal_lock.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Left Input, what gets locked, can still input if zero')
        this.addConnectionPoint('input', 'left', '#right', 'Right Input, when greater than 0, locks the left input\'s value until release; still allows new values when the value is 0')
        this.addConnectionPoint('output', 'right', '#result', 'Signal Lock Result, tl;dr: like a repeater lock in minecraft, except you can still input a number if the value is currently 0\n**Outputs: ⚡ LEFT VALUE')
        this.setConnectionPointValue('#result', 0)

        this.value = 0
    }

    serialize() {
        const data = super.serialize()
        data['value'] = this.value
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.value = data.value
    }

    update() {
        super.update()

        const left = this.getConnectionPointValue('#left')
        const right = this.getConnectionPointValue('#right')
        if (right > 0 && this.value == 0)
            this.value = left
        else if (right == 0)
            this.value = left
        
        const currentOutput = this.getLocalConnectionPointValue('#result')
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
        context.strokeStyle = 'black'
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1

        // SIGNAL LOCK symbol
        context.lineCap = 'round'
        context.beginPath()
        context.rect(centerX - radius, centerY - radius, radius * 2, radius * 2)
        context.stroke()

        context.beginPath()
        context.arc(centerX, centerY - radius, radius - 10, -Math.PI, 0)
        context.stroke()

        // this is a terrible attempt, but i cant be bothered to make it 100%
        context.beginPath()
        context.bezierCurveTo(centerX - radius / 2, centerY - radius + 5, centerX - radius / 2 - 20, centerY, centerX - radius / 2, centerY + radius - 5)
        context.stroke()

        context.beginPath()
        context.bezierCurveTo(centerX - radius / 2, centerY - radius + 15, centerX - radius / 2 - 10, centerY, centerX - radius / 2, centerY + radius - 15)
        context.stroke()

        context.beginPath()
        context.bezierCurveTo(centerX + radius / 2, centerY - radius + 5, centerX + radius / 2 + 20, centerY, centerX + radius / 2, centerY + radius - 5)
        context.stroke()

        context.beginPath()
        context.bezierCurveTo(centerX + radius / 2, centerY - radius + 15, centerX + radius / 2 + 10, centerY, centerX + radius / 2, centerY + radius - 15)
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

    }
}