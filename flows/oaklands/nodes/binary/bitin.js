/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "bit_in"
    static display    = "Binary Input"
    static size       = [1, 1.5]
    static icon       = "$assets/bit_in.png"
    static category   = "binary"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#result5', 'Carry')
        this.addConnectionPoint('input', 'left', '#result4', 'Digit x000')
        this.addConnectionPoint('input', 'left', '#result3', 'Digit 0x00')
        this.addConnectionPoint('input', 'left', '#result2', 'Digit 00x0')
        this.addConnectionPoint('input', 'left', '#result1', 'Digit 000x')
        this.addConnectionPoint('output', 'right', '#number', 'Number Output')
        this.setConnectionPointValue(`#number`)

        this.last = 0
    }

    update() {
        super.update()

        // output
        var num = 0
        for (let i = 0; i < /*4*/5; i++) {
            const isSet = this.getConnectionPointValue(`#result${i + 1}`) >= 10
            num += isSet ? Math.pow(2, i) : 0
        }
        // it doesn't actually use the carry bit how i expected it to, so the max number you can get out of a bit input is 31 (5 bits)... damn
        //const carry = this.getConnectionPointValue(`#result5`)
        //num += 16 * (carry / 10)
        if (this.getLocalConnectionPointValue('#number') != num) {
            this.setConnectionPointValue('#number', num)
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
        
        // output line
        context.strokeStyle = this.getLocalConnectionPointValue('#number') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(centerX + 10, centerY)
        context.lineTo(size[0] - 7, centerY)
        context.stroke()

        // input lines
        for (let i = 0; i < 5; i++) {
            const point = this.getConnectionPoint(`#result${i + 1}`)
            const y = point.staticPosition[1]
            context.strokeStyle = point.value > 0 ? this.ON_COLOR : this.OFF_COLOR
            context.beginPath()
            context.moveTo(7, y)
            context.lineTo(centerX - 10, y)
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
    }
}