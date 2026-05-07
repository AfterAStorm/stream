/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "gate_greater_than"
    static display    = "Greater Than"
    static size       = [1, 1.25]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/2/2e/RELAYComponent.png"
    static category   = "logic gates"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Left Input, the x of x > y')
        this.addConnectionPoint('input', 'left', '#right', 'Right Input, the y of x > y')
        this.addConnectionPoint('output', 'right', '#result', 'GREATER THAN Result, when x > y\n**Outputs: ⚡ LEFT VALUE')
        this.setConnectionPointValue('#result', 0)

        this.cached = true
        
        this.value = 0
    }

    _calculate() {
        const left = this.getConnectionPointValue('#left')
        this.value = left > this.getConnectionPointValue('#right') ? left : 0
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
        const cachedContext = super.draw(context)
        if (!cachedContext)
            return this.cacheDraw(context)

        const size = this.getSize()

        // draw
        cachedContext.strokeStyle = 'black'
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1
        cachedContext.beginPath()

        // GREATER THAN GATE symbol
        cachedContext.lineCap = 'round'
        cachedContext.moveTo(centerX - radius, centerY - radius)
        cachedContext.lineTo(centerX + radius, centerY)
        cachedContext.lineTo(centerX - radius, centerY + radius)
        cachedContext.stroke()
        this.cacheDraw(context)
    }
}