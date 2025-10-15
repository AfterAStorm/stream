/* node */

import { BaseNode } from "../../../node.js"

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
        this.addInteractable('#config', 'bottom', .5, 'Piano', this.getSize()[0] - 20, '10px monospace')
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
        this.setInteractableText('#config', Object.entries(NAMES).find(pair => pair[1] == this.instrument)[0])
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
    }

    input(action) {
        switch (action) {
            case '#config':
                this.getUserSelectionInput(NAMES, this.instrument).then(v => {
                    this.instrument = v || this.instrument
                    this.setInteractableText('#config', Object.entries(NAMES).find(pair => pair[1] == this.instrument)[0])
                    this.invalidate()
                })
                break
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
        
        this.cacheDraw(orig)
    }
}