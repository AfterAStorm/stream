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
        this.addInteractable('#config', 'bottom', .5, 'Clear', this.getSize()[0] - 20, '10px monospace')
        this.addConnectionPoint('output', 'right', '#result', 'Sends a signal based on the weather\n' + Object.entries(NAMES).map(pair => `**Output ⚡ ${pair[1]} = ${pair[0]}`).join('\n'))
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
        this.setInteractableText('#config', Object.entries(NAMES).find(pair => pair[1] == this.value)[0])
    }

    update() {
        super.update()

        if (this.getLocalConnectionPointValue('#result') != this.value)
            this.setConnectionPointValue('#result', this.value)
    }

    input(action) {
        switch (action) {
            case '#config':
                this.getUserSelectionInput(NAMES, this.value).then(v => {
                    this.value = v || this.value
                    this.setConnectionPointValue('#result', 0)
                    this.schedule(() => {
                        this.setConnectionPointValue('#result', this.value)
                    }, 0)
                    this.setInteractableText('#config', Object.entries(NAMES).find(pair => pair[1] == this.value)[0])
                })
                break
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        super.draw(context)
    }
}