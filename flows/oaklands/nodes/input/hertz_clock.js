/* node */

import { BaseNode } from "/flows/node.js"

export class Node extends BaseNode {
    static id         = "hertz_clock"
    static display    = "Hertz Clock"
    static size       = [1.5, .5]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/9/9f/Number_Interface.png"
    static category   = "user input"

    constructor() {
        super()
        this.addConnectionPoint('output', 'right', '#result', 'Clock Signal, on and off x times per second\n**Outputs: ⚡ 10')
        this.setConnectionPointValue('#result', 0)

        this.hertz = 1
    }

    serialize() {
        const data = super.serialize()
        data['hertz'] = this.hertz
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.hertz = data.hertz
    }

    update() {
        super.update()

        // output
        const currentOutput = this.getConnectionPointValue('#result')
        var setOutput = (Date.now() / 1000) * this.hertz % 1 > .5 ? 10 : 0
        
        if (setOutput != currentOutput) {
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
        if (this.isHoveringRectangle(pos, 20, size[1], size[0] - 20, 20)) {
            this.cooldown = true
            this.getUserTextInput(this.hertz).then(v => {
                this.hertz = parseInt(v)
                if (Number.isNaN(this.hertz))
                    this.hertz = 1
            })
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
        context.fillText(this.hertz, centerX, size[1] + 10)

        // draw stuff
        context.fillStyle = 'black'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = 'bold 20px monospace'
        context.fillText('123hz', centerX, centerY)

    }
}