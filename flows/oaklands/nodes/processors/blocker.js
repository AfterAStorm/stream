/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "blocker"
    static display    = "Blocker"
    static size       = [1, 1.25]
    static icon       = "$assets/blocker.png"//"https://static.wikia.nocookie.net/oaklands/images/c/c7/ANDComponent.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Left Input, what gets blocked')
        this.addConnectionPoint('input', 'left', '#right', 'Right Input, when greater than 0, blocks the left input')
        this.addConnectionPoint('output', 'right', '#result', 'Blocker Result, when left and right inputs are the same\n**Outputs: ⚡ LEFT VALUE')
        this.setConnectionPointValue('#result', 0)
    }

    update() {
        super.update()

        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = this.getConnectionPointValue('#left')
        if (this.getConnectionPointValue('#right') > 0) {
            setOutput = 0
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

        // AND GATE symbol
        context.lineCap = 'round'
        context.beginPath()
        context.rect(centerX - radius / 2, centerY - radius, radius, radius * 2)
        context.stroke()

        // output line
        context.strokeStyle = this.getLocalConnectionPointValue('#result') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(centerX + radius / 2, centerY)
        context.lineTo(size[0] - 7, centerY)
        context.stroke()

        // left line
        context.strokeStyle = this.getConnectionPointValue('#left') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        var y = this.connectionPoints[0].staticPosition[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius / 2, y)
        context.stroke()

        // right line
        context.strokeStyle = this.getConnectionPointValue('#right') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        y = this.connectionPoints[1].staticPosition[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius / 2, y)
        context.stroke()

    }
}