/* node */

import { BaseNode } from "/flows/node.js"

export class Node extends BaseNode {
    static id         = "delay"
    static display    = "Delay"
    static size       = [1, .5]
    static icon       = "$assets/delay.png"
    static category   = "processors"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#in', 'Input')
        this.addConnectionPoint('output', 'right', '#result', 'Delayed, acts as a sort of "queue"')
        this.setConnectionPointValue('#result', 0)

        this.value = 0
        this.delay = 1
    }

    serialize() {
        const data = super.serialize()
        data['delay'] = this.delay
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.delay = data.delay
    }

    update() {
        super.update()

        //const currentOutput = this.getLocalConnectionPointValue('#result')
        const input = this.getConnectionPointValue('#in')
        if (this.value != input) {
            this.value = input
            this.schedule(() => {
                this.setConnectionPointValue('#result', input)
            }, this.delay)
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
            this.getUserTextInput(this.delay).then(v => {
                this.delay = parseFloat(v)
                if (Number.isNaN(this.delay))
                    this.delay = 1
                this.delay = Math.round(this.delay * 10) / 10
                this.delay = Math.max(Math.min(this.delay, 300), 0)
            })
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()

        // drawk'
        const centerX = size[0] / 2
        const centerY = size[1] / 2
        const radius = Math.min(centerX, centerY) / 2 / 1
        const offset = radius / 3
        context.beginPath()

        // DELAY symbol
        context.lineCap = 'round'

        context.strokeStyle = '#000'
        context.beginPath()
        context.moveTo(centerX - radius * 2, centerY - radius)
        context.lineTo(centerX - radius * 2, centerY + radius)
        context.stroke()
        context.beginPath()
        context.moveTo(centerX + radius * 2, centerY - radius)
        context.lineTo(centerX + radius * 2, centerY + radius)
        context.stroke()
        
        context.beginPath()
        context.moveTo(centerX - radius * 2 - 3, centerY - radius - 3)
        context.lineTo(centerX - radius * 2 - 3, centerY + radius + 3)
        context.stroke()
        context.beginPath()
        context.moveTo(centerX + radius * 2 + 3, centerY - radius - 3)
        context.lineTo(centerX + radius * 2 + 3, centerY + radius + 3)
        context.stroke()

        // tl
        context.beginPath()
        context.bezierCurveTo(centerX - radius * 2, centerY - radius, centerX - 10, centerY - 10, centerX, centerY - 2)
        context.stroke()

        // bl
        context.beginPath()
        context.bezierCurveTo(centerX - radius * 2, centerY + radius, centerX - 10, centerY + 10, centerX, centerY + 2)
        context.stroke()

        // tr
        context.beginPath()
        context.bezierCurveTo(centerX + radius * 2, centerY - radius, centerX + 10, centerY - 10, centerX, centerY - 2)
        context.stroke()

        // br
        context.beginPath()
        context.bezierCurveTo(centerX + radius * 2, centerY + radius, centerX + 10, centerY + 10, centerX, centerY + 2)
        context.stroke()

        // draw value
        context.save()
        context.beginPath()
        context.rect(0, size[1], size[0], 40)
        context.clip()

        context.fillStyle = '#fff'
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
        context.fillText(this.delay, centerX, size[1] + 10)

        /*context.moveTo(centerX - radius, centerY - radius)
        context.lineTo(centerX + radius, centerY - radius)

        context.arc(centerX, centerY, radius, 0, Math.PI / 2)

        context.moveTo(centerX, centerY + radius)
        context.lineTo(centerX - radius, centerY + radius)
        context.lineTo(centerX - radius, centerY - radius)
        context.stroke()*/

        /*// output line
        const distanceFromSymbolToEdge = size[0] - (centerX + radius) - 7 / 2

        context.strokeStyle = this.getConnectionPointValue('#result') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        context.moveTo(centerX + radius, centerY - radius / 2)
        context.lineTo(centerX + radius + distanceFromSymbolToEdge / 2, centerY - radius / 2)
        context.lineTo(centerX + radius + distanceFromSymbolToEdge / 2, centerY)
        context.lineTo(size[0] - 7, centerY)
        context.stroke()

        // left line
        context.strokeStyle = this.getConnectionPointValue('#left') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        var y = this.connectionPoints[0].position[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius, y)
        context.stroke()

        // right line
        context.strokeStyle = this.getConnectionPointValue('#right') > 0 ? this.ON_COLOR : this.OFF_COLOR
        context.beginPath()
        y = this.connectionPoints[1].position[1]
        context.moveTo(7, y)
        context.lineTo(centerX - radius, y)
        context.stroke()*/

    }
}