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

const imageCache = {}

function getImage(share_server, id, onload) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = share_server + 'rblximg/' + id
    img.onerror = (e) => console.error(e)
    img.onload = onload
    return img
}

export class Node extends BaseNode {
    static id         = "billboard"
    static display    = "Billboard"
    //static size       = [2, 2]
    static icon       = "https://static.wikia.nocookie.net/oaklands/images/3/37/LCD.png"
    static category   = "visual"

    constructor() {
        super()
        this.addInteractable('#size', 'top', 0.5, '5x5', 80, '15px monospace')
        this.addConnectionPoint('input', 'bottom', `#id`, `Image Id`)

        this.size = [2, 2]

        this.pressed = false
        this.cooldown = false

        this.image = null

        this.cached = true
    }

    serialize() {
        const data = super.serialize()
        data['sizew'] = this.size[0]
        data['sizeh'] = this.size[1]
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.size[0] = data.sizew || 2
        this.size[1] = data.sizeh || 2
        this.setInteractableText('#size', `${this.size[0]}x${this.size[1]}`)
    }

    update() {
        super.update()

        if (this.flow != this.editor.editor.main_flow) return // ignore if we are in subflow

        const id = this.getConnectionPointValue('#id')
        if (id != 0) {
            if (imageCache[id]) {
                this.image = imageCache[id]
                this.invalidate()
            }
            else {
                const img = getImage(this.editor.editor.share_server, id, () => this.invalidate())
                this.image = img
                imageCache[id] = img
                this.invalidate()
            }
        }
    }

    input(action) {
        switch (action) {
            case '#size':
                this.getUserTextInput(`${this.size[0]}x${this.size[1]}`).then(v => {
                    const split = v.split('x')
                    if (split.length != 2) {
                        // assume it's just 1 number to set both
                        var number = parseInt(v)
                        if (Number.isNaN(this.number))
                            number = 2
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
                    this.invalidate()
                    this.setInteractableText('#size', `${this.size[0]}x${this.size[1]}`)
                })
                break
        }
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

        // draw background
        context.fillStyle = '#000'
        context.fillRect(0, 0, ...size)

        if (this.image && this.image.complete && this.image.naturalWidth > 0) {
            context.drawImage(this.image, 0, 0, ...size)
        }
        else if (this.getLocalConnectionPointValue('#id') > 0) {
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            context.font = '14px monospace'
            context.fillStyle = '#fff'
            context.fillText('Loading...', size[0] / 2, size[1] / 2)
        }

        // draw leds
        this.drawPoints(context)

        /*context.strokeStyle = 'grey' //value > 0 ? 'grey' : 'maroon'
        context.beginPath()
        context.arc(size[0] / 2, size[1] / 2, size[0] / 2 / 1.5, 0, Math.PI * 2)
        context.fill()
        context.stroke()*/
        this.cacheDraw(orig)
    }
}