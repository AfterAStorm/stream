/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

const NAMES = {
    'Clear': 1,
    'Cloudy': 2,
    'Rainy': 3,
    'Thunderstorm': 4,
    'Aurora Borealis': 5,
    'Star Rain': 6
}

export class Node extends BaseNode {
    static id         = "weather_sensor"
    static display    = "Weather Sensor"
    static size       = [.75, .75]
    static icon       = "$assets/unknown.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addConnectionPoint('output', 'right', '#result', 'Sends a signal based on the weather\n' + Object.entries(NAMES).map(pair => `**OUTPUT ${pair[1]} = ${pair[0]}`).join('\n'))
        this.setConnectionPointValue('#result', 1)

        this.value = 1
    }

    serialize() {
        const data = super.serialize()
        data['value'] = this.value
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.value = data.value ?? 1
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
            this.getUserSelectionInput(Object.keys(NAMES), this.value - 1).then(v => {
                this.value = NAMES[v] || this.value
                this.setConnectionPointValue('#result', 0)
                this.schedule(() => {
                    this.setConnectionPointValue('#result', this.value)
                }, 0)
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