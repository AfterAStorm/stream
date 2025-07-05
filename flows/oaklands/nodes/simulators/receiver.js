/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

export class Node extends BaseNode {
    static id         = "receiver"
    static display    = "Receiver"
    static size       = [.75, .75]
    static icon       = "$assets/receiver.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addConnectionPoint('output', 'left', '#output', 'Receives the signal from transmitters with the same "channel"')

        this.cached = true

        this.channel = 'none'
    }

    serialize() {
        const data = super.serialize()
        data['channel'] = this.channel
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.channel = data.channel || ''
    }

    update() {
        super.update()

        this.editor._airwaves = this.editor._airwaves ?? {}

        const setValue = this.editor._airwaves[this.channel] ?? 0
        if (this.getLocalConnectionPointValue('#output') != setValue)
            this.setConnectionPointValue('#output', setValue)

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
        
        if (this.isHoveringRectangle(pos, 20, size[1], size[0] - 40, 20)) {
            this.cooldown = true
            this.getUserTextInput(this.channel).then(v => {
                this.channel = v
            })
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

        // draw antenna
        context.strokeStyle = this.getLocalConnectionPointValue('#output') > 0 ? this.ON_COLOR : 'lightgrey'
        context.beginPath()
        context.moveTo(size[0], centerY)
        context.lineTo(size[0] * 2, centerY)
        context.stroke()

        // draw value
        context.save()
        context.beginPath()
        context.rect(0, size[1], size[0], 40)
        context.clip()

        context.beginPath()
        context.roundRect(10, size[1] - 20, size[0] - 20, 40, 10)
        context.fill()
        
        context.fillStyle = '#ddd'
        context.beginPath()
        context.roundRect(11, size[1] - 21, size[0] - 22, 40, 10)
        context.fill()
        
        context.restore()

        context.fillStyle = '#000'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = '10px monospace'
        context.fillText(this.channel, centerX, size[1] + 10)
        
        this.cacheDraw(orig)
    }
}