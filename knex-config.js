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

module.exports = function (RED) {
    function KnexNode(config) {
        RED.nodes.createNode(this, config);
        this.config = createKnexConfig(config)
    }

    RED.nodes.registerType('knex-config', KnexNode);
};
