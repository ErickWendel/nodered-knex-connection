const knex = require('knex');
let _cachedKnexInstances = [];

function getInstance(knexConfig) {
    return _cachedKnexInstances.find(
        instance => JSON.stringify(instance.config) === JSON.stringify(knexConfig)
    );
}

async function findOrCreateKnexInstance(knexConfig, node) {
    let knexObj = getInstance(knexConfig)

    if (!knexObj) {
        knexObj = {
            instance: knex(knexConfig),
            config: knexConfig,
        };

        await testConnection({
            instance: knexObj.instance,
            nodes: [node]
        })

        _cachedKnexInstances.push(knexObj);
    }

    knexObj.nodes = knexObj.nodes ?? new Set()
    knexObj.nodes.add(node)

    knexObj.connectionIntervalId = knexObj.connectionIntervalId ??
        setInterval(() => testConnection(knexObj), 200);

    return knexObj;
}


function testConnection({ instance, nodes }) {
    instance.raw('SELECT 1')
        .then(() => {
            for (const node of nodes)
                node.status({ fill: "green", shape: "dot", text: "connected" });
        })
        .catch(() => {
            for (const node of nodes)
                node.status({ fill: "red", shape: "ring", text: "disconnected" });
        });
}

function dropRelatedInstances(node) {
    for (const index in _cachedKnexInstances) {
        const { instance, nodes } = _cachedKnexInstances[index];
        if (!nodes.has(node)) continue;

        nodes.delete(node);
        if (nodes.size !== 0) continue;
        clearInterval(instance.connectionIntervalId);
        instance.destroy();
        _cachedKnexInstances.splice(index, 1);
    }
}

module.exports = function (RED) {
    function KnexNode(ctx) {
        RED.nodes.createNode(this, ctx);
        const node = this;
        const connection = RED.nodes.getNode(ctx.connection);
        if (!connection) {
            node.status({ fill: "red", shape: "ring", text: "you must choose a config" });
            return
        }

        let knexObj;
        const config = connection.config

            ; (async () => {

                try {
                    knexObj = await findOrCreateKnexInstance(config, node);
                } catch (error) {
                    node.error(error.message + "\n" + error.stack)
                }

            })()

        node.on('input', function (msg) {
            msg.knex = knexObj.instance;

            node.send(msg);
        });

        node.on('close', async function () {
            node.status({ fill: "red", shape: "ring", text: "disconnected" });
            dropRelatedInstances(node);

        });
    }

    RED.nodes.registerType('knex-node', KnexNode);
};
