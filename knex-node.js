const knex = require('knex');
let _cachedKnexInstances = [];

function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}

const parseIfContainsValue = val => {
    return val ? JSON.parse(val) : undefined;
}

function createKnexConfig(config) {
    const toNum = val => val ? Number(val) : undefined
    return deepMerge(
        {
            client: 'pg',
            connection: {
                connectionString: config.uri,
                ssl: config.ssl,
            },
            searchPath: parseIfContainsValue(config.searchPath),
            timezone: config.timezone,
            pool: {
                min: toNum(config.poolMin),
                max: toNum(config.poolMax),
                acquireTimeoutMillis: toNum(config.acquireTimeoutMillis),
                createTimeoutMillis: toNum(config.createTimeoutMillis),
                idleTimeoutMillis: toNum(config.idleTimeoutMillis),
            },
        },
        parseIfContainsValue(config.additionalKnexConf),
    );
}

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

module.exports = function (RED) {
    function KnexNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        let knexObj;

        ; (async () => {

            try {
                const knexConfig = createKnexConfig(config);
                knexObj = await findOrCreateKnexInstance(knexConfig, node);
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

            _cachedKnexInstances.forEach(({ instance, nodes }) => {
                if (!nodes.has(node)) return

                nodes.delete(node)
                if (nodes.size !== 0) return
                clearInterval(instance.connectionIntervalId)
            })
        });
    }

    RED.nodes.registerType('knex-node', KnexNode);
};
