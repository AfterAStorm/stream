/* node */

import { BaseNode } from "../../../node.js"

export class Node extends BaseNode {
    static id         = "hertz_clock"
    static display    = "Hertz Clock"
    static size       = [1.5, .5]
    static icon       = "$assets/hertz_clock.png"//"https://static.wikia.nocookie.net/oaklands/images/9/9f/Number_Interface.png"
    static category   = "user input"

    constructor() {
        super()
        this.addInteractable('#config', 'bottom', .5, '1', this.getSize()[0] - 40)
        this.addConnectionPoint('output', 'right', '#result', 'Clock Signal, on and off x times per second\n(the game actually treats this incorrectly I think, I believe it\'s supposed to be x2 faster)\n**Outputs: ⚡ 10')
        this.setConnectionPointValue('#result', 0)

        this.hertz = 1
        this.scheduled = false
        //this.dates = []
        this.lastClock = performance.now()
        this.averageSecondsBetweenClock = 0
    }

    serialize() {
        const data = super.serialize()
        data['hertz'] = this.hertz
        return data
    }

    deserialize(data) {
        super.deserialize(data)
        this.hertz = data.hertz
        this.setInteractableText('#config', this.hertz)
        this.averageSecondsBetweenClock = 1 / this.hertz * 1000
    }

    _schedule() {
        this.schedule(() => {
            this.setConnectionPointValue('#result', this.getLocalConnectionPointValue('#result') > 0 ? 0 : 10)
            this._schedule()
            //this.dates.push(performance.now())
            /*if (this.dates.length >= 2) {
                const distances = []
                for (let i = 1; i < this.dates.length; i++) {
                    distances.push(this.dates[i] - this.dates[i - 1])
                }
                console.warn('average hit', distances.reduce((prev, cur, i) => prev + cur, 0) / distances.length, distances.reduce((prev, cur, i) => prev * (i) / (i + 1) + cur / (i + 1), 0))
            }*/
           const now = performance.now()
           this.averageSecondsBetweenClock -= this.averageSecondsBetweenClock / 50
           this.averageSecondsBetweenClock += (now - this.lastClock) / 50
           this.lastClock = now
        }, 1 / (this.hertz)) //+ this.editor.flow.updateSpeed * 2)
    }

    update() {
        super.update()

        // output
        /*const currentOutput = this.getConnectionPointValue('#result')
        var setOutput = (Date.now() / 1000) * this.hertz % 2 > 1 ? 10 : 0
        
        if (setOutput != currentOutput) {
            this.setConnectionPointValue('#result', setOutput)
        }*/

        if (!this.scheduled) {
            this._schedule()
            this.scheduled = true
        }
    }

    input(action) {
        switch (action) {
            case '#config':
                this.getUserTextInput(this.hertz).then(v => {
                    this.hertz = parseInt(v)
                    if (Number.isNaN(this.hertz))
                        this.hertz = 1
                    this.averageSecondsBetweenClock = 1 / this.hertz * 1000
                    this.setInteractableText('#config', this.hertz)
                })
                break
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

        // draw stuff
        context.fillStyle = 'black'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = 'bold 20px monospace'
        context.fillText('123hz', centerX, centerY)
        
        context.font = '10px monospace'
        context.fillStyle = '#ddd'
        context.textAlign = 'right'
        context.textBaseline = 'bottom'
        context.fillText(this.averageSecondsBetweenClock.toFixed(2) + 'ms between ticks', size[0] - 5, size[1] - 5)

    }
}