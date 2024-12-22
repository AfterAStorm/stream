/* node */

import { BaseNode } from "../../../node.js"

const colorMap = {
    0: '#f4f4f4',
    1: '#fe191b',
    2: '#fee118',
    3: '#fefe88',
    4: '#4bfe5ae',
    5: '#74f6fe',
    6: '#47fefe',
    7: '#fec1fe',
    8: '#ee3ffe',
    9: '#fefefe',
    10: '#020203'
}

export class Node extends BaseNode {
    static id         = "7segment"
    static display    = "7 Segment"
    static size       = [1, 2]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/a/af/7_segment_display.png"
    static category   = "visual"

    constructor() {
        super()
        this.addConnectionPoint('input', 'bottom', '#color', 'Color, 0-10, anything greater is white (aka 0)')
        this.addConnectionPoint('input', 'bottom', '#value', 'Input, 0-9, 10 is 0, anything greater is blank')
        this.addConnectionPoint('output', 'top', '#display', 'Displaying, is anything being displayed\n**Outputs: ⚡ 10')

        this.pressed = false
        this.cooldown = false
    }

    update() {
        const current = this.getLocalConnectionPointValue('#display')
        const value = this.getConnectionPointValue('#value')
        const isDisplaying = value > 0 && value <= 10 ? 10 : 0
        if (current != isDisplaying) {
            this.setConnectionPointValue('#display', isDisplaying)
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

        var value = this.getConnectionPointValue('#value') || 0
        if (value == 0)
            value = -1 // 0 is actually nothing
        if (value == 10)
            value = 0

        const rect = [
            20, 20, // top left
            size[0] - 20, size[1] - 20 // bottom right
        ]

        // draw segments
        const currentColor = colorMap[this.getConnectionPointValue('#color')] || colorMap[0]

        context.fillStyle = '#010101'
        context.beginPath()
        context.roundRect(5, 5, size[0] - 10, size[1] - 10, 10)
        context.fill()

        const segments = [
            [[rect[0], centerY, rect[2], centerY], [2, 3, 4, 5, 6, 8, 9]], // middle
            [[rect[0], rect[1], rect[2], rect[1]], [2, 3, 5, 6, 7, 8, 9, 0]], // top
            [[rect[0], rect[1], rect[0], centerY], [4, 5, 6, 8, 9, 0]], // top left
            [[rect[0], centerY, rect[0], rect[3]], [2, 6, 8, 0]], // bottom left
            [[rect[2], rect[1], rect[2], centerY], [1, 2, 3, 4, 7, 8, 9, 0]], // top right
            [[rect[2], centerY, rect[2], rect[3]], [1, 3, 4, 5, 6, 7, 8, 9, 0]], // bottom right
            [[rect[0], rect[3], rect[2], rect[3]], [2, 3, 5, 6, 8, 9, 0]], // bottom
        ]
        context.strokeStyle = currentColor
        context.lineCap = 'round'
        context.lineWidth = 5
        segments.forEach(seg => {
            if (!seg[1].includes(value))
                return
            context.beginPath()
            context.moveTo(seg[0][0], seg[0][1])
            context.lineTo(seg[0][2], seg[0][3])
            context.stroke()
        })

        /*// draw text
        context.fillStyle = 'black'//`rgb(${color.join(',')})`//value > 0 ? 'green' : 'red'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = '20px monospace'
        context.fillText(value, centerX, centerY)*/
    }
}