/* node */

import { BaseNode } from "../../../node.js"

function lerp(a, b, t) {
    return a + (b - a) * t
}

function lerpV3(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

const INSTRUMENTS = {
    1: '$assets/instruments/piano.ogg',
    2: '$assets/instruments/violin.ogg',
    3: '$assets/instruments/brass.ogg',
    4: '$assets/instruments/xylophone.ogg',
    5: '$assets/instruments/woodblock.ogg',
    6: '$assets/instruments/timpani.ogg',
    7: '$assets/instruments/guitar.ogg',
}

const NAMES = {
    'Piano': 1,
    'Violin': 2,
    'Brass': 3,
    'Xylophone': 4,
    'Woodblock': 5,
    'Timpani': 6,
    'Guitar': 7
}

class InstrumentPool {
    constructor(path) {
        this.srcs = []
        for (let i = 0; i < 10; i++) {
            this.srcs.push(this.make(path))
        }
        this.index = 0
    }

    make(path) {
        const src = new Audio(path)
        src.preservesPitch = false
        src.autoplay = false
        return src
    }

    playNext(speed) {
        const src = this.srcs[this.index]
        this.index = (this.index + 1) % this.srcs.length
        src.load()
        src.playbackRate = speed
        return src.play()
    }
}

export class Node extends BaseNode {
    static id         = "music_note"
    static display    = "Music Note"
    static size       = [.75, .75]
    static icon       = "$assets/music_note.png"
    static category   = "simulators"

    constructor() {
        super()
        this.addConnectionPoint('input', 'left', '#pitch', 'Creates a pitch based on the input, ⚡ 1-25\n**Instruments:\n' + Object.entries(NAMES).map(pair => `${pair[0]}`).join('\n'))

        this.cached = true

        this.instrument = 1
        this.play_cooldown = false

        this.sounds = null
    }

    serialize() {
        const data = super.serialize()
        data['instrument'] = this.instrument
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.instrument = data.instrument ?? 1
    }

    update() {
        if (this.sounds == null) {
            this.sounds = Object.values(INSTRUMENTS).map(v => new InstrumentPool(this.editor.parsePath(v)))
        }
        super.update()

        const pitch = this.getConnectionPointValue('#pitch')
        if (!this.play_cooldown) {
            if (pitch > 0) {
                this.play_cooldown = true
                const clampedPitch = Math.max(Math.min(pitch, 25), 1)
                this.sounds[this.instrument - 1].playNext(Math.pow(2, (clampedPitch - 13) / 12))
            }
        }
        else {
            if (pitch == 0) {
                this.play_cooldown = false
            }
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
        
        if (this.isHoveringRectangle(pos, 20, size[1], size[0] - 40, 20)) {
            this.cooldown = true
            this.getUserSelectionInput(NAMES, this.instrument).then(v => {
                this.instrument = v || this.instrument
                this.invalidate()
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

        const sizeX = size[0] / 2
        const sizeY = size[1] / 2.5

        context.fillStyle = '#291a14'
        context.beginPath()
        context.rect(centerX - sizeX / 2, centerY - sizeY / 2, sizeX, sizeY)
        context.fill()

        context.fillStyle = '#815b45'
        for (let x = 0; x < 10; x++) {
            context.beginPath()
            context.rect(centerX - sizeX / 2, centerY - sizeY / 2 + (x / 10) * sizeY, sizeX, 1)
            context.fill()
        }

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
        context.fillText(Object.entries(NAMES).find(pair => pair[1] == this.instrument)[0], centerX, size[1] + 10)
        
        this.cacheDraw(orig)
    }
}