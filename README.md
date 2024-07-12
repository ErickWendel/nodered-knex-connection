# Knext Nodered Connection

This Node-RED custom node provides a Knex instance for PostgreSQL connections using ESM.

## Configuration

- **URI**: The connection string for the PostgreSQL database.
- **SSL**: Whether to use SSL for the connection.
- **Timezone**: The timezone to set for the connection.
- **Pool Log**: Whether to log pool events.
- **Pool Min**: Minimum number of connections in the pool.
- **Pool Max**: Maximum number of connections in the pool.
- **Acquire Timeout Millis**: The time in milliseconds to wait for a connection to be acquired.
- **Create Timeout Millis**: The time in milliseconds to wait for a connection to be created.
- **Idle Timeout Millis**: The time in milliseconds to wait before an idle connection is released.
- **After Create Function**: A function to run after a connection is created.

## Example

```json
[
  {
    "id": "knexNodeId",
    "type": "knex-node",
    "name": "Knex Node",
    "uri": "your_postgres_uri",
    "ssl": false,
    "timezone": "UTC",
    "poolLog": true,
    "poolMin": 2,
    "poolMax": 10,
    "acquireTimeoutMillis": 30000,
    "createTimeoutMillis": 30000,
    "idleTimeoutMillis": 1000,
    "afterCreateFunction": "function (connection, callback) { connection.query(`SET timezone TO \"UTC\";`, function (err) { callback(err, connection); }); }"
  }
]
