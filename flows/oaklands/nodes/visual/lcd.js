/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

const colorMap = {
    0: [0, 0, 0],
    1: [255, 255, 255],
    2: [255, 0, 0],
    3: [240, 144, 34],
    4: [178, 227, 43],
    5: [0, 255, 0],
    6: [0, 0, 255],
    7: [45, 247, 230],
    8: [244, 47, 247],
    9: [121, 13, 189],
    10: [176, 176, 176]
}

export class Node extends BaseNode {
    static id         = "lcd"
    static display    = "LCD"
    static size       = [1, 1]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/3/37/LCD.png"
    static category   = "visual"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#color', 'Light Color')

        this.pressed = false
        this.cooldown = false
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)

        const size = this.getSize()

        const value = this.getConnectionPointValue('#color')
        const hue = colorMap[Math.ceil(value / 10)] || [255, 255, 255]
        const color = lerpV3([0, 0, 0], hue, 1 - (Math.ceil(value / 10) - value / 10))

        // draw button
        context.fillStyle = `rgb(${color.join(',')})`//value > 0 ? 'green' : 'red'
        context.strokeStyle = 'grey' //value > 0 ? 'grey' : 'maroon'
        context.beginPath()
        context.arc(size[0] / 2, size[1] / 2, size[0] / 2 / 1.5, 0, Math.PI * 2)
        context.fill()
        context.stroke()
    }
}