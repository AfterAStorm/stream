/* web */

class Timing {
    constructor(at, display) {
        this.at = at
        this.done = null // at --> done
        this.display = display
        this.timings = []
    }
}

export class Profiler {
    constructor() {
        this.history = []
        this.timings = []
        this.groupDepth = 0
    }

    log() {
        this.history.push(this.timings)
        this.timings = []
        while (this.history.length > 2)
            this.history.splice(0, 1)
    }

    now() {
        return performance.now()
    }

    _getSubGroup(depth) {
        var subTiming = this.timings[this.timings.length - 1]
        for (let i = 0; i < depth - 1; i++) {
            subTiming = subTiming.timings[subTiming.timings.length - 1]
        }
        return subTiming
    }

    group(name) {
        var group = this.timings
        if (this.groupDepth > 0)
            group = this._getSubGroup(this.groupDepth).timings
            //group = this.timings[this.timings.length - 1].timings
        group.push(new Timing(this.now(), name))
        this.groupDepth++
    }
    
    swap(name) {
        this.close()
        this.group(name)
    }

    close() {
        if (this.groupDepth <= 0)
            throw new Error("Not inside any groups")
        this._getSubGroup(this.groupDepth).done = this.now()
        this.groupDepth--
    }
}

export default Profiler