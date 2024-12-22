/* node */

import { BaseNode } from "/flows/node.js"

export class Node extends BaseNode {
    static id         = "number_combiner"
    static display    = "Number Combiner"
    static size       = [1, 1.5]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/6/69/Calculator_boxed.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#result1', 'Digit 10000')
        this.addConnectionPoint('input', 'left', '#result2', 'Digit 1000')
        this.addConnectionPoint('input', 'left', '#result3', 'Digit 100')
        this.addConnectionPoint('input', 'left', '#result4', 'Digit 10')
        this.addConnectionPoint('input', 'left', '#result5', 'Digit 1')
        this.addConnectionPoint('output', 'right', '#number', 'The combined numbers')
        this.setConnectionPointValue(`#number`, 0)

        this.last = 0
    }

    update() {
        super.update()

        // output
        var output = ''
        for (let i = 0; i < 5; i++) {
            output += this.getConnectionPointValue(`#result${i + 1}`).toString()
        }
        output = parseInt(output)

        if (this.getLocalConnectionPointValue('#number') != output) {
            this.setConnectionPointValue('#number', output)
        }

        /*const num = this.getConnectionPointValue('#number')
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
        }*/

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

        // draw value
        context.save()
        context.rect(0, size[1], size[0], 40)
        context.clip()

        context.beginPath()
        context.roundRect(20, size[1] - 20, size[0] - 40, 40, 10)
        context.fill()
        
        context.fillStyle = '#ddd'
        context.beginPath()
        context.roundRect(21, size[1] - 21, size[0] - 42, 38, 10)
        context.fill()
        
        context.restore()

        context.fillStyle = '#000'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = '20px monospace'
        var character = '+'
        switch (this.mode) {
            case 2:
                character = '-'
                break
            case 3:
                character = 'x'
                break
            case 4:
                character = '÷'
                break
            case 5:
                character = '^'
                break
        }

        context.fillText(character, centerX, size[1] + 10)

        // draw stuff
        context.fillStyle = 'black'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = 'bold 40px monospace'
        context.fillText(character, centerX, centerY)

    }
}