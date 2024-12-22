/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "zero_tick"
    static display    = "Zero Tick"
    static size       = [1, .5]
    static icon       = "$assets/zero_tick.png"
    static category   = "utility"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#passthrough', 'The provided number')
        this.addConnectionPoint('output', 'right', '#result', 'The provided number')
        this.setConnectionPointValue('#result', 0)

        this.cooldown = false
        this.last = 0
    }

    update() {
        //console.log('tether update')
        super.update()

        // output
        var passthrough = this.getConnectionPointValue('#passthrough')
        
        if (passthrough != this.last) {
            this.last = passthrough
            this.setConnectionPointValue('#result', passthrough)
            this.schedule(() => {
                if (this.getLocalConnectionPointValue('#result') != 0)
                    this.setConnectionPointValue('#result', 0)
            }, 0)
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

        // draw stuff

        const radius = Math.min(centerX, centerY) / 2 / 1

        // TETHER symbol
        context.strokeStyle = this.getConnectionPointValue('#passthrough') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(7, centerY)
        context.lineTo(centerX - radius, centerY)
        context.stroke()

        context.strokeStyle = '#000'
        context.beginPath()
        context.arc(centerX, centerY, radius, Math.PI / 1.5, -Math.PI / 1.5)
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