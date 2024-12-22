/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "computer"
    static display    = "Calculator"
    static size       = [1, 1.5]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/6/69/Calculator_boxed.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#left', 'Left Input')
        this.addConnectionPoint('input', 'left', '#right', 'Right Input')
        this.addConnectionPoint('output', 'right', '#result', 'Operation Result')
        this.setConnectionPointValue('#result', 0)

        /*
        1 = add
        2 = sub
        3 = mul
        4 = div
        5 = exp
        */
        this.mode = 1
    }

    serialize() {
        const data = super.serialize()
        data['mode'] = this.mode
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.mode = data.mode
    }

    _math(a, b) {
        switch (this.mode) {
            case 1:
                return a + b
            case 2:
                return a - b
            case 3:
                return a * b
            case 4:
                return a / b
            case 5:
                return Math.pow(a, b)
        }
    }

    update() {
        super.update()

        // output
        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = this._math(this.getConnectionPointValue('#left'), this.getConnectionPointValue('#right'))
        
        if (setOutput != currentOutput) {
            console.log(setOutput)
            this.setConnectionPointValue('#result', setOutput)
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
        //if (pos[0] >= 20 && pos[0] <= size[0] - 20 && pos[1] >= size[1] && pos[1] <= size[1] + 20) { // if less than radius
        if (this.isHoveringRectangle(pos, 20, size[1], size[0] - 40, 20)) {
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