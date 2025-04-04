/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

const NAMES = {
    'Select': 0,
    'Visitor': 1,
    'Owner': 10,
}

export class Node extends BaseNode {
    static id         = "chat_commander"
    static display    = "Chat Commander"
    static size       = [.75, .75]
    static icon       = "$assets/unknown.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addConnectionPoint('output', 'right', '#result', 'Sends a signal based on chat messages\n' + Object.entries(NAMES).filter(x => x[1] > 0).map(pair => `**Output ⚡ ${pair[1]} = ${pair[0]}`).join('\n'))
        this.setConnectionPointValue('#result', 0)

        this.value = 0
    }

    serialize() {
        const data = super.serialize()
        data['value'] = this.value
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.value = data.value ?? 0
        this.setConnectionPointValue('#result', this.value)
    }

    update() {
        super.update()

        if (this.getLocalConnectionPointValue('#result') != this.value)
            this.setConnectionPointValue('#result', this.value)

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
            this.getUserSelectionInput(NAMES, this.value).then(v => {
                this.value = v || this.value
                this.setConnectionPointValue('#result', this.value)
                this.schedule(() => {
                    this.value = 0
                    this.setConnectionPointValue('#result', this.value)
                }, 1)
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
        context.fillText(Object.entries(NAMES).find(pair => pair[1] == this.value)[0], centerX, size[1] + 10)
    }
}