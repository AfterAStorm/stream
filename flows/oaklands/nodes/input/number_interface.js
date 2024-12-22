/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "number_interface"
    static display    = "Number Interface"
    static size       = [1.5, .5]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/9/9f/Number_Interface.png"
    static category   = "user input"

    constructor() {
        super()
        this.addConnectionPoint('output', 'right', '#result', 'The user provided number\n**Outputs: ⚡ X')
        this.setConnectionPointValue('#result', 0)

        this.number = 1
        this.cooldown = false
    }

    serialize() {
        const data = super.serialize()
        data['number'] = this.number
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.number = data.number
    }

    update() {
        super.update()

        // output
        const currentOutput = this.getLocalConnectionPointValue('#result')
        var setOutput = this.number
        
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
        
        /*const points = this.getRectanglePoints(20, size[1], size[0] - 20, 20)
        const minX = Math.min(...points.map(p => p[0]))
        const minY = Math.min(...points.map(p => p[1]))
        const maxX = Math.max(...points.map(p => p[0]))
        const maxY = Math.max(...points.map(p => p[1]))
        //console.log(points)
        if (pos[0] >= minX && pos[0] <= maxX && pos[1] >= minY && pos[1] <= maxY) {*/
        if (this.isHoveringRectangle(pos, 20, size[1], size[0] - 40, 20)) {
            this.cooldown = true
            this.getUserTextInput(this.number).then(v => {
                this.number = parseInt(v)
                if (Number.isNaN(this.number))
                    this.number = 10
            })
        }
        /*if (pos[0] >= 20 && pos[0] <= size[0] - 20 && pos[1] >= size[1] && pos[1] <= size[1] + 20) { // if less than radius
            this.cooldown = true
            this.getUserTextInput(this.number).then(v => {
                this.number = parseInt(v)
                if (Number.isNaN(this.number))
                    this.number = 10
                setTimeout(() => {
                    this.cooldown = false
                }, 10)
            })
        }*/
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
        context.beginPath()
        context.rect(0, size[1], size[0], 40)
        context.clip()

        context.beginPath()
        context.roundRect(20, size[1] - 20, size[0] - 40, 40, 10)
        context.fill()
        
        context.fillStyle = '#ddd'
        context.beginPath()
        context.roundRect(21, size[1] - 21, size[0] - 42, 40, 10)
        context.fill()
        
        context.restore()

        context.fillStyle = '#000'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = '20px monospace'
        context.fillText(this.number, centerX, size[1] + 10)

        // draw stuff
        context.fillStyle = 'black'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = 'bold 20px monospace'
        context.fillText('123', centerX, centerY)

    }
}