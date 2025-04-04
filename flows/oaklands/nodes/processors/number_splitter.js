/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "number_splitter"
    static display    = "Number Splitter"
    static size       = [1, 1.5]
    static icon       = "$assets/bit_out.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#number', 'Number Input')
        this.addConnectionPoint('output', 'right', '#result1', 'Digit 1')
        this.addConnectionPoint('output', 'right', '#result2', 'Digit 10')
        this.addConnectionPoint('output', 'right', '#result3', 'Digit 100')
        this.addConnectionPoint('output', 'right', '#result4', 'Digit 1000')
        this.addConnectionPoint('output', 'right', '#result5', 'Remainder')

        for (let i = 0; i < 5; i++)
            this.setConnectionPointValue(`#result${i + 1}`, 0)

        this.last = 0
    }

    update() {
        super.update()

        // output
        const num = Math.floor(this.getConnectionPointValue('#number'))
        if (this.last != num) {
            const numStr = num.toString()
            this.last = num
            for (let i = 0; i < 4; i++) {
                const id = `#result${i + 1}`
                if (numStr.length < i + 1)
                    this.setConnectionPointValue(id, 0)
                else
                    this.setConnectionPointValue(id, parseInt(numStr.substring(numStr.length - i, numStr.length - i - 1)))
            }
            if (numStr.length > 4)
                this.setConnectionPointValue('#result5', parseInt(numStr.substring(0, numStr.length - 4)))
            else
                this.setConnectionPointValue('#result5', 0)
        }

        // changing value

        const isPressed = this.isPointerPressed()
        if (!isPressed && this.cooldown)
            this.cooldown = false
        if (!isPressed)
            return // "mouse" isn't pressed

        if (this.cooldown)
            return // ignore wehn under cooldown

        // find distance
        const size = this.getSize()
        const pos = this.getRelativePointer()
        if (pos[0] >= 20 && pos[0] <= size[0] - 20 && pos[1] >= size[1] && pos[1] <= size[1] + 20) { // if less than radius
            this.cooldown = true
            this.mode += 1
            if (this.mode > 5)
                this.mode = 1
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
    }
}