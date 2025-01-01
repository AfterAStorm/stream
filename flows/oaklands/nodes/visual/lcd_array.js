/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV2(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
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
    static id         = "lcd_array"
    static display    = "LCD Array"
    static size       = [2, 2]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/3/37/LCD.png"
    static category   = "visual"

    constructor() {
        super()
        for (let i = 0; i < 100; i++) {
            this.addConnectionPoint('input', 'left', `#color${i}`, `Light Color ${i}`)
        }

        this.size = [2, 2]

        this.pressed = false
        this.cooldown = false

        this.width = 5
        this.height = 5

        this.cached = true
        this.cacheScale = 2
    }

    serialize() {
        const data = super.serialize()
        data['width'] = this.width
        data['height'] = this.height
        data['sizew'] = this.size[0]
        data['sizeh'] = this.size[1]
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.width = data.width || 5
        this.height = data.height || 5
        this.size[0] = data.sizew || 2
        this.size[1] = data.sizeh || 2
        
        const neededPoints = this.width * this.height
        if (this.connectionPoints.length < neededPoints)
            for (let i = this.connectionPoints.length; i < neededPoints; i++)
                this.addConnectionPoint('input', 'left', `#color${i}`, `Light Color ${i}`)
    }

    update() {
        super.update()

        const node = this
        this.connectionPoints.forEach(c => {
            this.getConnectionPointValue(c.id)
            if (c.value != c.last) {
                c.last = c.value
                node.invalidated = true
            }
        })

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
        
        if (this.isHoveringRectangle(pos, size[0] - 80, -20, 80, 20)) { // SIZE
            this.cooldown = true
            this.getUserTextInput(`${this.size[0]}x${this.size[1]}`).then(v => {
                const split = v.split('x')
                if (split.length != 2) {
                    // assume it's just 1 number to set both
                    var number = parseInt(v)
                    if (Number.isNaN(this.number))
                        number = 1
                    this.size = [number, number]
                }
                else {
                    this.size[0] = parseInt(split[0])
                    this.size[1] = parseInt(split[1])
                    if (Number.isNaN(this.size[0]))
                        this.size[0] = 2
                    if (Number.isNaN(this.size[1]))
                        this.size[1] = 2
                }
                this.invalidated = true
            })
        }
        else if (this.isHoveringRectangle(pos, 0, -20, 80, 20)) { // WIDTH/HEIGHT
            this.cooldown = true
            this.getUserTextInput(`${this.width}x${this.height}`).then(v => {
                const split = v.split('x')
                if (split.length != 2) {
                    // assume it's just 1 number to set both
                    var number = parseInt(v)
                    if (Number.isNaN(this.number))
                        number = 5
                    this.width = number
                    this.height = number
                }
                else {
                    this.width = parseInt(split[0])
                    this.height = parseInt(split[1])
                    if (Number.isNaN(this.width))
                        this.width = 5
                    if (Number.isNaN(this.height))
                        this.height = 5
                }
                const neededPoints = this.width * this.height
                if (this.connectionPoints.length < neededPoints)
                    for (let i = this.connectionPoints.length; i < neededPoints; i++)
                        this.addConnectionPoint('input', 'left', `#color${i}`, `Light Color ${i}`)
                this.invalidated = true
            })
        }
    }

    getConnectionPointPositions() {
        // calculate totals
        const totals = {}
        const indexes = {}
        for (const point of this.connectionPoints) {
            totals[point.side] = (totals[point.side] || 1) + 1
            indexes[point.side] = 1
        }

        // calculate sides
        const size = this.getSize()

        // calculate positions
        const positions = []
        const offset = 10
        this.connectionPoints.forEach(p => { p.position = [0, 0]; p.active = false })
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const point = this.getConnectionPoint(`#color${x + y * this.width}`)
                if (!point)
                    continue
                point.active = true
                point.tooltip = `Pixel ${x + 1}, ${y + 1}`
                const yPos = offset + size[1] + (size[1] - offset * 2) * (y / (this.height - 1))
                point.position = lerpV2([offset, yPos], [size[0] - offset, yPos], x / (this.width - 1))
                point.staticPosition = [...point.position]
                if (this.rotation != 0) {
                    point.position = this.rotatePoint(...point.position, this.rotation)
                }
                positions.push(point)
            }
        }
        /*for (const point of this.connectionPoints) {
            const side = connectionPointSides[point.side]
            point.position = lerpV2(...side, indexes[point.side] / totals[point.side])
            point.staticPosition = [...point.position] // staticPosition is position before rotation
            if (this.rotation != 0) {
                point.position = this.rotatePoint(...point.position, this.rotation)
            }


            positions.push(point)
            indexes[point.side] += 1
        }*/

        return positions
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        const context2 = super.draw(context)
        if (!context2)
            return this.cacheDraw(context)
        const orig = context
        context = context2

        const size = this.getSize()

        // draw width/height box
        context.save()

            context.beginPath() // only clip it to make the transparent version not look weird
            context.rect(0, -20, size[0], 20)
            context.clip()

            context.fillStyle = '#fff'
            context.beginPath()
            context.roundRect(0, -20, 80, 40, 10)
            context.fill()
            
            context.fillStyle = '#ddd'
            context.beginPath()
            context.roundRect(1, -19, 78, 40, 10)
            context.fill()

            context.fillStyle = '#000'
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            context.font = '15px monospace'
            context.fillText(`${this.width}x${this.height}`, 40, -10)

        context.restore()
        
        // draw size box
        context.save()

            context.beginPath() // only clip it to make the transparent version not look weird
            context.rect(0, -20, size[0], 20)
            context.clip()

            context.fillStyle = '#fff'
            context.beginPath()
            context.roundRect(size[0] - 80, -20, 80, 40, 10)
            context.fill()
            
            context.fillStyle = '#ddd'
            context.beginPath()
            context.roundRect(size[0] - 79, -19, 78, 40, 10)
            context.fill()

            context.fillStyle = '#000'
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            context.font = '15px monospace'
            context.fillText(`${this.size[0]}x${this.size[1]}`, size[0] - 40, -10)

        context.restore()

        // draw background
        context.fillStyle = '#000'
        context.fillRect(0, 0, ...size)

        // draw connect point array
        context.fillStyle = '#fff'

        context.save()

            context.beginPath()
            context.rect(0, size[1], size[0], size[1])
            context.clip()

            context.beginPath()
            context.roundRect(0, 0, size[0], size[1] * 2, 10)
            context.fill()
            
            context.fillStyle = '#ddd'
            context.beginPath()
            context.roundRect(1, 1, size[0] - 2, size[1] * 2 - 2, 10)
            context.fill()

        context.restore()
        
        this.drawPoints(context)

        // draw leds
        const sizeX = size[0] / this.width
        const sizeY = size[1] / this.height
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const value = this.getLocalConnectionPointValue(`#color${x + y * this.width}`)
                const hue = colorMap[Math.ceil(value / 10)] || [255, 255, 255]
                const color = lerpV3([0, 0, 0], hue, 1 - (Math.ceil(value / 10) - value / 10))
                context.fillStyle = `rgb(${color.join(',')})`
                context.fillRect(sizeX * x, sizeY * y, sizeX, sizeY)
            }
        }

        /*context.strokeStyle = 'grey' //value > 0 ? 'grey' : 'maroon'
        context.beginPath()
        context.arc(size[0] / 2, size[1] / 2, size[0] / 2 / 1.5, 0, Math.PI * 2)
        context.fill()
        context.stroke()*/
        this.cacheDraw(orig)
    }
}