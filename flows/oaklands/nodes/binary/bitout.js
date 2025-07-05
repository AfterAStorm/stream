/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "bit_out"
    static display    = "Binary Output"
    static size       = [1, 1.5]
    static icon       = "$assets/bit_out.png"
    static category   = "binary"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#number', 'Number Input')
        this.addConnectionPoint('output', 'right', '#result5', 'Carry')
        this.addConnectionPoint('output', 'right', '#result4', 'Digit x000')
        this.addConnectionPoint('output', 'right', '#result3', 'Digit 0x00')
        this.addConnectionPoint('output', 'right', '#result2', 'Digit 00x0')
        this.addConnectionPoint('output', 'right', '#result1', 'Digit 000x')

        this.cached = true

        for (let i = 0; i < 5; i++)
            this.setConnectionPointValue(`#result${i + 1}`, 0)

        this.last = 0
    }

    update() {
        super.update()

        // output
        const num = this.getConnectionPointValue('#number')
        if (this.last != num) {
            this.last = num
            for (let i = 0; i < 4; i++) {
                const pow2 = Math.pow(2, i)
                this.setConnectionPointValue(`#result${i + 1}`, (num & pow2) != 0 ? 10 : 0)
            }
            this.setConnectionPointValue(`#result5`, (Math.floor(num / 16) * 10))
            this.invalidate()
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
        
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        
        // input line
        context.strokeStyle = this.getLocalConnectionPointValue('#number') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(7, centerY)
        context.lineTo(centerX - 10, centerY)
        context.stroke()

        // output lines
        for (let i = 0; i < 5; i++) {
            const point = this.getConnectionPoint(`#result${i + 1}`)
            const y = point.staticPosition[1]
            context.strokeStyle = point.value > 0 ? this.ON_COLOR : this.OFF_COLOR
            context.beginPath()
            context.moveTo(centerX + 10, y)
            context.lineTo(size[0] - 7, y)
            context.stroke()
        }

        // symbol
        context.lineCap = 'round'
        context.strokeStyle = '#000'
        context.beginPath()
        context.moveTo(centerX - 10, centerY - size[1] / 2 + 10) // left
        context.lineTo(centerX - 10, centerY + size[1] / 2 - 10)
        context.stroke()
        
        context.beginPath()
        context.moveTo(centerX + 10, centerY - size[1] / 2 + 20) // right
        context.lineTo(centerX + 10, centerY + size[1] / 2 - 20)
        context.stroke()
        
        context.beginPath()
        context.bezierCurveTo( // top
            centerX - 10, centerY - size[1] / 2 + 10,
            centerX + 5, centerY - size[1] / 2 + 10,
            centerX + 10, centerY - size[1] / 2 + 20)
        context.stroke()
        
        context.beginPath()
        context.bezierCurveTo( // bottom
            centerX - 10, centerY + size[1] / 2 - 10,
            centerX + 5, centerY + size[1] / 2 - 10,
            centerX + 10, centerY + size[1] / 2 - 20)
        context.stroke()
        
        this.cacheDraw(orig)
    }
}