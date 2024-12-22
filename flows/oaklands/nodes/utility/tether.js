/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "tether"
    static display    = "Tether"
    static size       = [1, .5]
    static icon       = "$assets/tether.png"//"https://static.wikia.nocookie.net/oaklands/images/b/b0/Tether_boxed.png"
    static category   = "utility"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#passthrough', 'The provided number')
        this.addConnectionPoint('output', 'right', '#result', 'The provided number')
        this.setConnectionPointValue('#result', 0)

        this.cooldown = false
    }

    update() {
        super.update()

        // output
        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = this.getConnectionPointValue('#passthrough')
        
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
        
        const centerX = size[0] / 2
        const centerY = size[1] / 2

        const radius = Math.min(centerX, centerY) / 2 / 1

        // TETHER symbol
        context.strokeStyle = this.getConnectionPointValue('#passthrough') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(7, centerY)
        context.lineTo(centerX - radius, centerY)
        context.stroke()

        context.strokeStyle = '#000'
        context.beginPath()
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI)
        context.moveTo(centerX, centerY - radius + 5)
        context.lineTo(centerX + radius - 5, centerY)
        context.lineTo(centerX, centerY + radius - 5)
        context.stroke()

        context.strokeStyle = this.getLocalConnectionPointValue('#result') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(centerX + radius, centerY)
        context.lineTo(size[0] - 7, centerY)
        context.stroke()

    }
}