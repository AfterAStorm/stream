/* web */

export class Flow {
    /**
     * Create a new flow and load its components from the id
     * @param {string} id 
     */
    constructor(id) {
        this.id = id

        this.connectionPointTypes = {} // id: {connects, display, id}

        this.connectionDefinitions = []
        this.nodeDefinitions = []

        this.nodes = []
        this.connections = []

        this.loaded = false
        this.onload = null
    }

    getNodesAt(x, y) {
        return this.nodes.filter(n => n.isHovering(x, y))
    }

    removeNode(node) {
        this.getConnectionsTo(node).forEach(c => this.cutConnection(c))
        this.nodes.splice(this.nodes.indexOf(node), 1)
    }

    getConnectionsAt(x, y) {
        return this.connections.filter(c => c.isHovering(x, y))
    }

    getConnectionPointsAt(x, y) {
        return this.nodes.reduce((prev, curr) => {prev.push(...curr.connectionPoints); return prev}, []).filter(p => p.active && p.isHovering(x, y))
    }

    getConnectionsTo(node) {
        return node.connectionPoints.flatMap(p => this.connections.filter(c => c.has(p)))
    }

    canConnectTo(point, otherPoint) {
        const defA = this.connectionPointTypes[point.type]
        if (defA.connects.includes(otherPoint.type))
            return true
        return false
    }

    getConnectionFor(point) {
        const defA = this.connectionPointTypes[point.type]
        return this.connectionDefinitions[defA.connection]
    }

    cutConnection(connection) {
        this.connections.splice(this.connections.indexOf(connection), 1)
    }

    /**
     * Load components
     */
    async load() {
        // fetch manifest
        const manifestRequest = await fetch(`../../flows/${this.id}/flow.json`)
        const manifest = await manifestRequest.json()

        const job = []

        // load points
        manifest.points.forEach(point => {
            job.push(new Promise(async res => {
                const request = await fetch(`../../flows/${this.id}/points/${point}.json`)
                const pointType = await request.json()
                this.connectionPointTypes[pointType.id] = pointType
                res()
            }))
        })

        // load connections
        manifest.connections.forEach(connection => {
            job.push(new Promise(async res => {
                const module = await import(`../../flows/${this.id}/connections/${connection}.js`)
                this.connectionDefinitions[module.Connection.id] = module.Connection
                res()
            }))
        })

        // load nodes
        manifest.nodes.forEach(node => {
            job.push(new Promise(async res => {
                const module = await import(`../../flows/${this.id}/nodes/${node}.js`)
                this.nodeDefinitions[module.Node.id] = module.Node
                res()
            }))
        })

        // load other settings
        this.updateSpeed = manifest.updateSpeed

        return Promise.all(job).then(() => {
            this.loaded = true
            if (this.onload != null)
                this.onload()
        })
    }

    _updateNode(node, depth=0, hold=false) {
        const flow = this
        if (depth > 0) {
            if (node.hasUpdated)
                return
            node.hasUpdated = true
            node.needsSoftUpdate = false
            const a = performance.now()
            node.update()
            node.debug.updateTime = performance.now() - a
            node.debug.depth = depth // * 2 // why was i * 2 it?
        }
        if (node.needsSoftUpdate) {
            node.needsSoftUpdate = false
            const a = performance.now()
            node.update()
            node.debug.softUpdateTime = performance.now() - a
            node.debug.updated = true
        }
        
        if (hold && node.needsConnectionUpdate)
            return node
        if (node.needsConnectionUpdate) {
            //console.log('node.needsConnectionUpdate', node)
            //console.log(node, 'needsConnectionUpdate')
            node.needsConnectionUpdate = false
            const connections = flow.connections.filter(c => node.connectionPoints.find(p => c.has(p)))
            const updating = []
            connections.filter(c => c.points.find(p => p.node == node).type == 'output').forEach(c => {
                c.update()
                c.points.forEach(p => {
                    if (p.node == node)
                        return
                    p.node.hasUpdated = false
                    const isUpdate = this._updateNode(p.node, depth + 1, true)
                    //console.log('> force update', p.node)
                    if (isUpdate != null && !updating.includes(isUpdate))
                        updating.push(isUpdate)
                })
            })
            updating.forEach(n => this._updateNode(n, depth + 1, false))
            /*connections.forEach(c => {
                connections.needsUpdate = false
                c.reset()
            }) 
            const connectedPoints = []
            connections.forEach(connection => {
                connection.update()
                connection.points.forEach(point => {
                    if (point.node != node && !connectedPoints.includes(point))
                        connectedPoints.push(point)
                })
            })
            connectedPoints.forEach(point => {
                point.node.needsUpdate = true
                this._updateNode(point.node)
            })*/

        }
    }

    /**
     * Update node states
     */
    update(editor) {
        this.updateEditor(editor)
        upprofiler.group('sort priority')
        this.nodes.sort((a, b) => b.getPriority() - a.getPriority())
        upprofiler.close()
        this.nodes.forEach(n => {
            n.needsSoftUpdate = true
            n.hasUpdated = false
            n.debug.depth = 0
            n.debug.updated = false
        })
        upprofiler.group('update connection cache')
        this.updateNodeConnectionCaches()
        upprofiler.close()
        upprofiler.group('update nodes')
        this.nodes.forEach(n => {
            upprofiler.group(`update ${n.display} node`)
            this._updateNode(n)
            upprofiler.close()
        })
        upprofiler.close()
        /*this.nodes.forEach(n => {
            this._updateNode(n)
        })*/
    }

    /**
     * Update node states
     */
    updateEditor(editor) {
        this.editor = editor
        editor.flow = this
        this.connections.forEach(c => {
            c.editor = editor
        })
        this.nodes.forEach(n => {
            n.editor = editor
        })
    }

    updateNodeConnectionCaches() {
        this.nodes.forEach(n => {
            n._connections = []
        })
        this.connections.forEach(c => {
            c.points.forEach(p => {
                if (p.node != null)
                    p.node._connections.push(c)
            })
        })
    }

    /**
     * Draw the flow to a canvas
     * @param {CanvasRenderingContext2D} context2
     */
    draw(context) {
        this.nodes.forEach(n => {
            context.save()
            const a = performance.now()
            profiler.group(`draw ${n.display} node${n.cached ? ' (cached)' : ''}`)
            n.draw(context)
            profiler.close()
            n.debug.drawTime = performance.now() - a
            context.restore()
        })
        const b = performance.now()
        if (this.editor == null || this.editor.drawConnections != false)
            this.connections.forEach(c => {
                context.save()
                c.draw(context)
                context.restore()
            })
        this._connectionDrawTime = performance.now() - b // "temporary" debug variable
    }

    async deserialize(json) {
        const flow = this
        if (flow.id != json.flow)
            flow.loaded = false
        flow.id = json.flow

        flow.nodes = []
        flow.connections = []

        if (!flow.loaded)
            await flow.load()

        json.nodes.forEach(node => { // we assume this is in the correct order :p
            const def = flow.nodeDefinitions[node.id]
            if (def == null) {
                console.warn(`Failed to find definition for node ${node.id}`)
                return
            }

            const created = new def()
            created.deserialize(node)
            flow.nodes.push(created)
        })
        json.connections.forEach(connection => {
            const def = flow.connectionDefinitions[connection.id]
            if (def == null) {
                console.warn(`Failed to find definition for connection ${connection.id}`)
                return
            }

            const created = new def()
            created.deserialize(connection, flow)
            flow.connections.push(created)
        })

        return this
    }

    serialize() {
        this.nodes.forEach((n, i) => n.index = i)
        const json = {
            'flow': this.id,
            'nodes': this.nodes.map(n => n.serialize()),
            'connections': this.connections.map(c => c.serialize())
        }

        return json
    }
}