/* node */

import { BaseNode } from "/flows/node.js"

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
    static id         = "14segment"
    static display    = "14 Segment"
    static size       = [1, 2]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/a/ab/14_segment_display.png"
    static category   = "visual"

    constructor() {
        super()
        this.addConnectionPoint('input', 'bottom', '#color', 'Color, 0-10, anything greater is white (aka 0)')
        this.addConnectionPoint('input', 'bottom', '#value', 'Input, 0-9, 10 is 0, 11-36 is A-Z, anything greater is blank')
        this.addConnectionPoint('output', 'top', '#display', 'Displaying, is anything being displayed\n**Outputs: ⚡ 10')

        this.pressed = false
        this.cooldown = false
    }

    update() {
        const current = this.getLocalConnectionPointValue('#display')
        const value = this.getConnectionPointValue('#value')
        const isDisplaying = value > 0 && value <= 36 ? 10 : 0
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
            [[centerX, rect[1], centerX, centerY], [/* letters */12, 14, 19, 30, 33]], // top middle
            [[centerX, rect[3], centerX, centerY], [/* letters */12, 14, 19, 30, 35]], // bottom middle

            [[centerX, centerY, rect[2], rect[1]], [1, 0/* letters */, 21, 23, 32, 34, 35, 36]], // top right middle
            [[centerX, centerY, rect[0], rect[1]], [/* letters */23, 24, 34, 35]], // top left middle

            [[centerX, centerY, rect[2], rect[3]], [/* letters */21, 24, 27, 28, 33, 34]], // bottom right middle
            [[centerX, centerY, rect[0], rect[3]], [0/* letters */, 32, 33, 34, 36]], // bottom left middle

            [[rect[0], centerY, centerX, centerY], [2, 4, 5, 6, 8, 9/* letters */, 11, 15, 16, 18, 21, 26, 28, 29]], // left middle
            [[centerX, centerY, rect[2], centerY], [2, 3, 4, 5, 6, 8, 9/* letters */, 11, 12, 17, 18, 26, 28, 29]], // right middle

            [[rect[0], rect[1], rect[2], rect[1]], [2, 3, 5, 6, 7, 8, 9, 0/* letters */, 11, 12, 13, 14, 15, 16, 17, 19, 25, 26, 27, 28, 29, 30, 36]], // top
            [[rect[0], rect[3], rect[2], rect[3]], [2, 3, 5, 6, 8, 9, 0/* letters */, 12, 13, 14, 15, 17, 19, 20, 22, 25, 27, 29, 31, 36]], // bottom

            [[rect[0], rect[1], rect[0], centerY], [4, 5, 6, 8, 9, 0/* letters */, 11, 13, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33]], // top left
            [[rect[0], centerY, rect[0], rect[3]], [2, 6, 8, 0/* letters */, 11, 13, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33]], // bottom left
            [[rect[2], rect[1], rect[2], centerY], [1, 2, 3, 4, 7, 8, 9, 0/* letters */, 11, 12, 14, 18, 20, 23, 24, 25, 26, 27, 28, 31, 33]], // top right
            [[rect[2], centerY, rect[2], rect[3]], [1, 3, 4, 5, 6, 7, 8, 9, 0/* letters */, 11, 12, 14, 17, 18, 20, 23, 24, 25, 27, 29, 31, 33]], // bottom right
        ]

        // 11+ is A-Z

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
    }
}