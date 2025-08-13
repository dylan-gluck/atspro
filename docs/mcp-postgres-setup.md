# PostgreSQL MCP Integration Setup

## Overview

This project uses the `@ahmetkca/mcp-server-postgres` MCP server to provide PostgreSQL database connectivity through the Model Context Protocol. The server provides comprehensive PostgreSQL operations including schema introspection, query execution, and table management.

## Configuration

### Database Connection

The PostgreSQL database is configured via Docker Compose with the following default settings:

```yaml
# docker-compose.yml
postgres:
  image: postgres:16-alpine
  container_name: atspro-postgres
  environment:
    POSTGRES_DB: atspro
    POSTGRES_USER: atspro_user
    POSTGRES_PASSWORD: dev_password_change_in_prod
  ports:
    - "5432:5432"
```

### MCP Server Configuration

The PostgreSQL MCP server is configured in `.claude/mcp_servers.json`:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "@ahmetkca/mcp-server-postgres",
        "\"postgresql://atspro_user:dev_password_change_in_prod@localhost:5432/atspro\""
      ],
      "alwaysAllow": [
        "list_tables",
        "describe_table", 
        "execute_query",
        "get_table_schema",
        "get_database_info",
        "get_table_count",
        "get_column_info"
      ]
    }
  }
}
```

The server is enabled in `.claude/settings.json`:

```json
{
  "enabledMcpjsonServers": ["claude-flow", "ruv-swarm", "postgres"]
}
```

## Available Operations

The PostgreSQL MCP server provides the following tools:

- **list_tables** - List all tables in the database
- **describe_table** - Get detailed table structure and constraints
- **execute_query** - Execute SELECT queries (read-only)
- **get_table_schema** - Get table schema information
- **get_database_info** - Get database metadata
- **get_table_count** - Get row count for tables
- **get_column_info** - Get column details and statistics

## Usage

### Starting the Database

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify connection
docker exec atspro-postgres pg_isready -U atspro_user -d atspro
```

### Testing MCP Integration

```bash
# Check MCP server status
claude mcp list

# The postgres server should appear as connected
```

### Example Operations

Once connected, you can use MCP tools to interact with PostgreSQL:

```javascript
// List all tables
mcp__postgres__list_tables()

// Get table schema
mcp__postgres__describe_table({ table_name: "test_table" })

// Execute queries
mcp__postgres__execute_query({ 
  query: "SELECT * FROM test_table LIMIT 10" 
})
```

## Connection String Format

The MCP server requires a PostgreSQL connection string in this format:

```
postgresql://[user[:password]@][host][:port][/database][?param1=value1&...]
```

For this project:
```
postgresql://atspro_user:dev_password_change_in_prod@localhost:5432/atspro
```

## Security Features

- **Read-only operations** - The MCP server only allows SELECT queries for safety
- **Multi-tenant support** - Built-in schema isolation
- **Connection validation** - Automatic connection health checks
- **Error handling** - Comprehensive error reporting and recovery

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure PostgreSQL container is running: `docker ps`
   - Check port 5432 is available: `lsof -i :5432`

2. **Authentication Failed**
   - Verify password in connection string matches container environment
   - Check user exists: `docker exec atspro-postgres psql -U postgres -c "\du"`

3. **Database Not Found**
   - Verify database exists: `docker exec atspro-postgres psql -U atspro_user -l`

4. **MCP Server Not Starting**
   - Check Claude configuration: `claude mcp list`
   - Verify MCP server package: `npx @ahmetkca/mcp-server-postgres --help`

### Health Checks

```bash
# Database health
docker exec atspro-postgres pg_isready -U atspro_user -d atspro

# Connection test
docker exec atspro-postgres psql -U atspro_user -d atspro -c "SELECT 1;"

# MCP server status
claude mcp list
```

## Production Considerations

1. **Environment Variables** - Use environment variables for sensitive data
2. **SSL Connections** - Enable SSL for production: `?sslmode=require`
3. **Connection Pooling** - Configure appropriate connection limits
4. **Monitoring** - Set up database and MCP server monitoring
5. **Backups** - Implement regular database backups

## Integration with SPARC/Claude Flow

The PostgreSQL MCP integration works seamlessly with SPARC modes and Claude Flow:

```bash
# Use with SPARC data analysis
npx claude-flow sparc run data-analyzer "analyze user activity patterns"

# Database operations in swarm mode
npx claude-flow swarm init --topology mesh
npx claude-flow agent spawn --type analyst --capabilities postgres,data-analysis
```